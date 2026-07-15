const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const OURO_MODERNO_KEY = "ouro_moderno_url";
const DEFAULT_OURO_MODERNO_URL = "https://itbcurso.shyr.it/";

const normalizeOuroModernoUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    const error = new Error("A URL do ITB Ouro Moderno é obrigatória.");
    error.status = 400;
    throw error;
  }
  if (normalized.length > 2048) {
    const error = new Error("A URL deve ter no máximo 2048 caracteres.");
    error.status = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    const error = new Error("Informe uma URL válida.");
    error.status = 400;
    throw error;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    const error = new Error("A URL deve usar o protocolo HTTP ou HTTPS.");
    error.status = 400;
    throw error;
  }
  if (parsed.username || parsed.password) {
    const error = new Error("A URL não pode conter usuário ou senha.");
    error.status = 400;
    throw error;
  }

  return parsed.toString();
};

module.exports = function injectGestorRoutes(ctx) {
  const { app, pool, requireAuth, requireProfessor, sendUserNotification } =
    ctx;

  app.get(
    "/api/gestor/sessions",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const result = await pool.query(
          `SELECT s.id as session_id, s.created_at as login_at,
              u.id as user_id, u.username, u.display_name,
              t.id as turma_id, t.nome as turma_nome
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN turmas t ON t.id = u.turma_id
       WHERE u.role = 'aluno' AND s.expires_at > NOW()
       ORDER BY t.nome ASC, u.username ASC`
        );

        res.json({
          sessions: result.rows.map((row) => ({
            sessionId: row.session_id,
            loginAt: row.login_at,
            userId: row.user_id,
            username: row.username,
            displayName: row.display_name,
            turmaId: row.turma_id,
            turmaNome: row.turma_nome,
          })),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/gestor/sessions/logout",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const { target, turmaId, userId } = req.body;

        if (target === "all") {
          const result = await pool.query(
            "SELECT DISTINCT user_id FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role = 'aluno')"
          );
          await pool.query(
            `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role = 'aluno')`
          );
          result.rows.forEach((row) => {
            sendUserNotification(row.user_id, {
              type: "force_logout",
              title: "Sessão Encerrada",
              body: "Sua sessão foi encerrada por um administrador.",
            });
          });
        } else if (target === "turma" && turmaId) {
          const result = await pool.query(
            "SELECT DISTINCT user_id FROM sessions WHERE user_id IN (SELECT id FROM users WHERE turma_id = $1)",
            [turmaId]
          );
          await pool.query(
            `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE turma_id = $1)`,
            [turmaId]
          );
          result.rows.forEach((row) => {
            sendUserNotification(row.user_id, {
              type: "force_logout",
              title: "Sessão Encerrada",
              body: "Sua sessão foi encerrada por um administrador.",
            });
          });
        } else if (target === "user" && userId) {
          await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
          sendUserNotification(userId, {
            type: "force_logout",
            title: "Sessão Encerrada",
            body: "Sua sessão foi encerrada por um administrador.",
          });
        } else {
          return res
            .status(400)
            .json({ error: "Alvo de logout inválido ou incompleto." });
        }

        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );

  app.get("/api/gestor/ouro-moderno", requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        "SELECT value, updated_at FROM app_metadata WHERE key = $1",
        [OURO_MODERNO_KEY]
      );
      let configured = result.rowCount > 0;
      let url = DEFAULT_OURO_MODERNO_URL;
      if (configured) {
        try {
          url = normalizeOuroModernoUrl(result.rows[0].value);
        } catch {
          configured = false;
        }
      }
      res.json({
        url,
        configured,
        updatedAt: configured ? result.rows[0].updated_at : null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.put(
    "/api/gestor/ouro-moderno",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const url = normalizeOuroModernoUrl(req.body.url);
        const result = await pool.query(
          `INSERT INTO app_metadata (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key)
           DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
           RETURNING value, updated_at`,
          [OURO_MODERNO_KEY, url]
        );
        res.json({
          url: result.rows[0].value,
          configured: true,
          updatedAt: result.rows[0].updated_at,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // --- Endpoints de Frequência ---
};

module.exports.normalizeOuroModernoUrl = normalizeOuroModernoUrl;
module.exports.DEFAULT_OURO_MODERNO_URL = DEFAULT_OURO_MODERNO_URL;
