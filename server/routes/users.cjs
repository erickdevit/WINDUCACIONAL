const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectUsersRoutes(ctx) {
  const {
    app,
    createUser,
    hashPassword,
    isUsernameAvailable,
    listUsers,
    normalizeDisplayName,
    pool,
    publicUser,
    requireAuth,
    requireProfessor,
    resolveStudentTypeForTurma,
  } = ctx;

  app.get(
    "/api/users/username/:username/availability",
    async (req, res, next) => {
      try {
        const result = await isUsernameAvailable(req.params.username);
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.get("/api/users", requireAuth, requireProfessor, async (req, res) => {
    const users = await listUsers();
    res.json({ users: users.map(publicUser) });
  });

  // --- Endpoints de Apostilas ---

  app.post(
    "/api/users",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const user = await createUser(req.body);
        res.status(201).json({ user: publicUser(user) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.patch(
    "/api/users/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const currentResult = await pool.query(
          "SELECT id, username, role, student_type, turma_id, active FROM users WHERE id = $1",
          [req.params.id]
        );
        if (currentResult.rowCount === 0)
          return res.status(404).json({ error: "Usuário não encontrado." });
        const targetUser = currentResult.rows[0];

        const wouldRemoveActiveProfessor =
          targetUser.role !== "aluno" &&
          targetUser.active === true &&
          (req.body.role === "aluno" || req.body.active === false);

        if (wouldRemoveActiveProfessor) {
          const professorCount = await pool.query(
            "SELECT COUNT(*)::int AS total FROM users WHERE role = 'professor' AND active = TRUE AND id <> $1",
            [req.params.id]
          );
          if (professorCount.rows[0].total === 0) {
            return res
              .status(400)
              .json({ error: "Deve existir pelo menos um professor ativo." });
          }
        }

        const updates = [];
        const values = [];
        const add = (field, value) => {
          values.push(value);
          updates.push(`${field} = $${values.length}`);
        };

        if (req.body.displayName != null)
          add(
            "display_name",
            normalizeDisplayName(String(req.body.displayName))
          );
        // Professores podem alterar o nome de usuário de qualquer conta
        // (inclusive alunos). Valida formato e unicidade, ignorando o próprio
        // usuário para permitir reenviar o mesmo username sem erro.
        if (req.body.username != null) {
          const { username: normalizedUsername } = await isUsernameAvailable(
            req.body.username
          );
          if (normalizedUsername !== targetUser.username) {
            const taken = await pool.query(
              "SELECT 1 FROM users WHERE username = $1 AND id <> $2",
              [normalizedUsername, req.params.id]
            );
            if (taken.rowCount > 0) {
              return res
                .status(409)
                .json({ error: "Este usuário já está em uso." });
            }
            add("username", normalizedUsername);
          }
        }
        let nextRole = targetUser.role;
        let nextTurmaId = targetUser.turma_id;
        if (req.body.role != null) {
          if (!["aluno", "professor", "secretaria"].includes(req.body.role)) {
            return res.status(400).json({ error: "Grupo inválido." });
          }
          nextRole = req.body.role;
          add("role", req.body.role);
        }
        if (req.body.turmaId !== undefined || req.body.role !== "aluno") {
          nextTurmaId = nextRole === "aluno" ? req.body.turmaId || null : null;
          add("turma_id", nextTurmaId);
        }
        if (
          req.body.studentType !== undefined ||
          req.body.turmaId !== undefined ||
          req.body.role !== undefined
        ) {
          const nextStudentType = await resolveStudentTypeForTurma({
            role: nextRole,
            studentType:
              req.body.studentType !== undefined
                ? req.body.studentType
                : targetUser.student_type,
            turmaId: nextTurmaId,
          });
          add("student_type", nextStudentType);
        }
        if (req.body.active != null) {
          add("active", Boolean(req.body.active));
        }
        if (req.body.password) {
          if (String(req.body.password).length < 8) {
            return res
              .status(400)
              .json({ error: "Senha deve ter pelo menos 8 caracteres." });
          }
          const { salt, hash } = hashPassword(req.body.password);
          add("password_salt", salt);
          add("password_hash", hash);
        }

        if (updates.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Nenhuma alteração enviada." });
        }

        add("updated_at", new Date());
        values.push(req.params.id);
        const result = await pool.query(
          `UPDATE users SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, username, display_name, role, student_type, storage_key, turma_id, active, created_at, updated_at`,
          values
        );
        return res.json({ user: publicUser(result.rows[0]) });
      } catch (error) {
        return next(error);
      }
    }
  );
};
