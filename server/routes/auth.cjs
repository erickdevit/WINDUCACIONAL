const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectAuthRoutes(ctx) {
  const {
    app,
    clearSessionCookie,
    config,
    createSession,
    createUser,
    hashToken,
    normalizeDisplayName,
    normalizeTurmaCode,
    normalizeUsername,
    pool,
    publicUser,
    readCookie,
    requireAuth,
    setSessionCookie,
    syncAppBuildVersion,
    verifyPassword,
  } = ctx;

  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (error) {
      res
        .status(503)
        .json({ ok: false, error: "Banco de dados indisponível." });
    }
  });

  app.get("/api/app/version", async (req, res, next) => {
    try {
      const version = await syncAppBuildVersion();
      res.setHeader("Cache-Control", "no-store");
      res.json({ version });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/bootstrap/status", async (req, res) => {
    const result = await pool.query("SELECT COUNT(*)::int AS total FROM users");
    res.json({
      needsBootstrap: result.rows[0].total === 0,
      requiresToken:
        config.nodeEnv === "production" || Boolean(config.bootstrapToken),
    });
  });

  app.post("/api/bootstrap", async (req, res, next) => {
    try {
      const count = await pool.query(
        "SELECT COUNT(*)::int AS total FROM users"
      );
      if (count.rows[0].total > 0) {
        return res.status(409).json({ error: "Bootstrap já foi concluído." });
      }
      if (
        (config.nodeEnv === "production" || config.bootstrapToken) &&
        req.body.token !== config.bootstrapToken
      ) {
        return res.status(403).json({ error: "Token de bootstrap inválido." });
      }

      const user = await createUser({
        username: req.body.username,
        displayName: req.body.displayName,
        role: "professor",
        password: req.body.password,
      });
      const token = await createSession(user.id);
      setSessionCookie(req, res, token);
      return res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  app.patch(
    "/api/auth/me/display-name",
    requireAuth,
    async (req, res, next) => {
      try {
        const displayName = normalizeDisplayName(
          String(req.body.displayName || "")
        );
        if (displayName.length < 2) {
          return res.status(400).json({ error: "Informe o nome completo." });
        }

        const result = await pool.query(
          `UPDATE users
       SET display_name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, display_name, role, student_type, storage_key, turma_id, active, created_at, updated_at`,
          [displayName, req.user.id]
        );

        res.json({ user: publicUser(result.rows[0]) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/auth/login", async (req, res) => {
    const username = normalizeUsername(req.body.username);
    const result = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.role,
            COALESCE(t.student_type, u.student_type) AS student_type,
            u.password_salt, u.password_hash, u.storage_key, u.turma_id,
            u.active, u.created_at, u.updated_at
     FROM users u
     LEFT JOIN turmas t ON t.id = u.turma_id
     WHERE u.username = $1 AND u.active = TRUE`,
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const user = result.rows[0];
    if (
      !verifyPassword(
        req.body.password || "",
        user.password_salt,
        user.password_hash
      )
    ) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const token = await createSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ user: publicUser(user) });
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const turmaCode = normalizeTurmaCode(req.body.turmaCode);
      if (!turmaCode || !/^[A-Z0-9]{6}$/.test(turmaCode)) {
        return res.status(400).json({
          error: "Informe um código de turma válido com 6 caracteres.",
        });
      }

      const turmaResult = await pool.query(
        "SELECT id, student_type FROM turmas WHERE code = $1 AND active = TRUE",
        [turmaCode]
      );
      if (turmaResult.rowCount === 0) {
        return res
          .status(404)
          .json({ error: "Código de turma não encontrado ou inativo." });
      }

      const user = await createUser({
        username: req.body.username,
        displayName: req.body.displayName,
        role: "aluno",
        studentType: turmaResult.rows[0].student_type,
        turmaId: turmaResult.rows[0].id,
        password: req.body.password,
      });
      const token = await createSession(user.id);
      setSessionCookie(req, res, token);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Já existe um usuário com esse nome." });
      }
      next(error);
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const token = readCookie(req, config.cookieName);
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
      hashToken(token),
    ]);
    clearSessionCookie(res);
    res.status(204).end();
  });
};
