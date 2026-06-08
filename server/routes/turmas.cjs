const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectTurmasRoutes(ctx) {
  const {
    app,
    ensureTurmaCode,
    normalizeClassSchedule,
    normalizeClassStudentType,
    pool,
    publicTurma,
    requireAuth,
    requireProfessor,
  } = ctx;

  app.get(
    "/api/turmas",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const studentType = req.query.studentType;
        let query = `SELECT id, nome, code, student_type, schedule_days, schedule_start_time, schedule_end_time, descricao, active, created_at, updated_at FROM turmas`;
        const values = [];

        if (
          studentType === "kids" ||
          studentType === "normal" ||
          studentType === "reposicao"
        ) {
          query += ` WHERE student_type = $1`;
          values.push(studentType);
        }

        query += ` ORDER BY nome ASC`;
        const result = await pool.query(query, values);
        res.json({ turmas: result.rows.map(publicTurma) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/turmas",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const nome = String(req.body.nome || "").trim();
        if (!nome || nome.length < 2) {
          return res
            .status(400)
            .json({ error: "Nome da turma deve ter pelo menos 2 caracteres." });
        }
        const studentType = normalizeClassStudentType(req.body.studentType);
        const schedule = normalizeClassSchedule(req.body);
        const descricao = String(req.body.descricao || "").trim();
        const code = await ensureTurmaCode(req.body.code);
        const id = crypto.randomUUID();
        const result = await pool.query(
          `INSERT INTO turmas (id, nome, code, student_type, schedule_days, schedule_start_time, schedule_end_time, descricao) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nome, code, student_type, schedule_days, schedule_start_time, schedule_end_time, descricao, active, created_at, updated_at`,
          [
            id,
            nome,
            code,
            studentType,
            schedule.days,
            schedule.startTime,
            schedule.endTime,
            descricao,
          ]
        );
        res.status(201).json({ turma: publicTurma(result.rows[0]) });
      } catch (error) {
        if (error.code === "23505") {
          return res
            .status(409)
            .json({ error: "Já existe uma turma com esse nome ou código." });
        }
        next(error);
      }
    }
  );

  app.patch(
    "/api/turmas/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      let client;
      try {
        client = await pool.connect();
        await client.query("BEGIN");
        const updates = [];
        const values = [];
        const add = (field, value) => {
          values.push(value);
          updates.push(`${field} = $${values.length}`);
        };

        if (req.body.nome != null) {
          const nome = String(req.body.nome).trim();
          if (nome.length < 2) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              error: "Nome da turma deve ter pelo menos 2 caracteres.",
            });
          }
          add("nome", nome);
        }
        let nextStudentType = null;
        if (req.body.studentType != null) {
          nextStudentType = normalizeClassStudentType(req.body.studentType);
          add("student_type", nextStudentType);
        }
        if (req.body.descricao != null)
          add("descricao", String(req.body.descricao).trim());
        if (
          req.body.scheduleDays != null ||
          req.body.scheduleStartTime != null ||
          req.body.scheduleEndTime != null
        ) {
          const schedule = normalizeClassSchedule(req.body);
          add("schedule_days", schedule.days);
          add("schedule_start_time", schedule.startTime);
          add("schedule_end_time", schedule.endTime);
        }
        if (req.body.active != null) add("active", Boolean(req.body.active));

        if (updates.length === 0) {
          return res.status(400).json({ error: "Nenhuma alteração enviada." });
        }

        add("updated_at", new Date());
        values.push(req.params.id);
        const result = await client.query(
          `UPDATE turmas SET ${updates.join(", ")} WHERE id = $${values.length}
       RETURNING id, nome, code, student_type, schedule_days, schedule_start_time, schedule_end_time, descricao, active, created_at, updated_at`,
          values
        );
        if (result.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "Turma não encontrada." });
        }

        if (nextStudentType && nextStudentType !== "reposicao") {
          await client.query(
            "UPDATE users SET student_type = $1, updated_at = NOW() WHERE role = 'aluno' AND turma_id = $2",
            [nextStudentType, req.params.id]
          );
        }

        await client.query("COMMIT");
        res.json({ turma: publicTurma(result.rows[0]) });
      } catch (error) {
        await client?.query("ROLLBACK").catch(() => {});
        if (error.code === "23505") {
          return res
            .status(409)
            .json({ error: "Já existe uma turma com esse nome ou código." });
        }
        next(error);
      } finally {
        client?.release();
      }
    }
  );

  app.delete(
    "/api/turmas/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        // Desvincular usuários da turma antes de excluir
        await pool.query(
          "UPDATE users SET turma_id = NULL WHERE turma_id = $1",
          [req.params.id]
        );
        const result = await pool.query("DELETE FROM turmas WHERE id = $1", [
          req.params.id,
        ]);
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Turma não encontrada." });
        }
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );

  // --- Endpoints de Digitação ---
};
