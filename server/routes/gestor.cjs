const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

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

  // --- Endpoints de Frequência ---
};
