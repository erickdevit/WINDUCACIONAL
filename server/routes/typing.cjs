const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectTypingRoutes(ctx) {
  const {
    app,
    broadcastTypingGameSettings,
    broadcastTypingSettings,
    clampInteger,
    deleteTypingDifficultyOverride,
    getEffectiveTypingSettings,
    getTypingGameSettings,
    getTypingSettings,
    isUuid,
    normalizeTurmaCode,
    normalizeTypingDifficultyMode,
    normalizeTypingDifficultyScope,
    normalizeTypingStudentType,
    pool,
    publicTypingDifficultyOverride,
    requireAuth,
    requireProfessor,
    saveTypingGameSettings,
    saveTypingDifficultyOverride,
    saveTypingSettings,
    typingGameSettingsClients,
    typingSettingsClients,
    writeTypingGameSettingsEvent,
    writeTypingSettingsEvent,
  } = ctx;

  app.get(
    "/api/typing/settings/events",
    requireAuth,
    async (req, res, next) => {
      try {
        const studentType =
          req.user.role !== "aluno"
            ? normalizeTypingStudentType(req.query.studentType)
            : req.user.student_type;
        const effective =
          req.user.role === "aluno"
            ? await getEffectiveTypingSettings({
                mode: "lesson",
                studentType,
                turmaId: req.user.turma_id,
                studentId: req.user.id,
              })
            : { settings: await getTypingSettings(studentType) };

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        const client = {
          studentType,
          userId: req.user.id,
          turmaId: req.user.turma_id,
          role: req.user.role,
          res,
        };
        typingSettingsClients.add(client);
        writeTypingSettingsEvent(res, effective.settings);

        const heartbeat = setInterval(() => {
          res.write(": keep-alive\n\n");
        }, 25000);

        req.on("close", () => {
          clearInterval(heartbeat);
          typingSettingsClients.delete(client);
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/typing/settings/effective",
    requireAuth,
    async (req, res, next) => {
      try {
        const result = await getEffectiveTypingSettings({
          mode: "lesson",
          studentType: req.user.student_type,
          turmaId: req.user.turma_id,
          studentId: req.user.role === "aluno" ? req.user.id : null,
        });
        return res.json(result);
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/typing/settings/:studentType",
    requireAuth,
    async (req, res, next) => {
      try {
        const studentType = normalizeTypingStudentType(req.params.studentType);
        if (
          req.user.role !== "professor" &&
          req.user.student_type !== studentType
        ) {
          return res.status(403).json({
            error: "Configuração de digitação restrita ao tipo do aluno.",
          });
        }

        const settings = await getTypingSettings(studentType);
        return res.json({ settings });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/typing/settings/:studentType",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const settings = await saveTypingSettings(
          req.params.studentType,
          req.body || {}
        );
        await broadcastTypingSettings(settings);
        return res.json({ settings });
      } catch (error) {
        return next(error);
      }
    }
  );

  // --- Endpoints de Avaliação (Exams) ---

  app.get(
    "/api/typing/game/settings/events",
    requireAuth,
    async (req, res, next) => {
      try {
        const studentType =
          req.user.role !== "aluno"
            ? normalizeTypingStudentType(req.query.studentType)
            : req.user.student_type;
        const effective =
          req.user.role === "aluno"
            ? await getEffectiveTypingSettings({
                mode: "game",
                studentType,
                turmaId: req.user.turma_id,
                studentId: req.user.id,
              })
            : { settings: await getTypingGameSettings(studentType) };

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        const client = {
          studentType,
          userId: req.user.id,
          turmaId: req.user.turma_id,
          role: req.user.role,
          res,
        };
        typingGameSettingsClients.add(client);
        writeTypingGameSettingsEvent(res, effective.settings);

        const heartbeat = setInterval(() => {
          res.write(": keep-alive\n\n");
        }, 25000);

        req.on("close", () => {
          clearInterval(heartbeat);
          typingGameSettingsClients.delete(client);
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/typing/game/settings/effective",
    requireAuth,
    async (req, res, next) => {
      try {
        const result = await getEffectiveTypingSettings({
          mode: "game",
          studentType: req.user.student_type,
          turmaId: req.user.turma_id,
          studentId: req.user.role === "aluno" ? req.user.id : null,
        });
        return res.json(result);
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/typing/game/settings/:studentType",
    requireAuth,
    async (req, res, next) => {
      try {
        const studentType = normalizeTypingStudentType(req.params.studentType);
        if (
          req.user.role !== "professor" &&
          req.user.student_type !== studentType
        ) {
          return res.status(403).json({
            error:
              "Configuração do game de digitação restrita ao tipo do aluno.",
          });
        }

        const settings = await getTypingGameSettings(studentType);
        return res.json({ settings });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/typing/game/settings/:studentType",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const settings = await saveTypingGameSettings(
          req.params.studentType,
          req.body || {}
        );
        await broadcastTypingGameSettings(settings);
        return res.json({ settings });
      } catch (error) {
        return next(error);
      }
    }
  );

  const resolveDifficultyTarget = async ({ mode, query, body, allowEmpty }) => {
    const scope = normalizeTypingDifficultyScope(
      body?.scope || query?.scope || "type"
    );
    const studentId = body?.studentId || query?.studentId || null;
    const turmaId = body?.turmaId || query?.turmaId || null;
    if (scope === "type") {
      return {
        scope,
        studentType: normalizeTypingStudentType(
          body?.studentType || query?.studentType
        ),
        turmaId: null,
        studentId: null,
      };
    }
    if (!isUuid(scope === "turma" ? turmaId : studentId)) {
      const error = new Error("Alvo de dificuldade inválido.");
      error.status = 400;
      throw error;
    }
    if (scope === "turma") {
      const turma = await pool.query(
        "SELECT id, student_type, active FROM turmas WHERE id = $1",
        [turmaId]
      );
      if (turma.rowCount === 0 || (!allowEmpty && !turma.rows[0].active)) {
        const error = new Error("Turma não encontrada ou inativa.");
        error.status = 404;
        throw error;
      }
      return { scope, studentType: turma.rows[0].student_type, turmaId, studentId: null };
    }
    const student = await pool.query(
      `SELECT u.id, u.turma_id, COALESCE(t.student_type, u.student_type) AS student_type,
              u.role, u.active
       FROM users u LEFT JOIN turmas t ON t.id = u.turma_id
       WHERE u.id = $1`,
      [studentId]
    );
    if (
      student.rowCount === 0 ||
      student.rows[0].role !== "aluno" ||
      !student.rows[0].turma_id ||
      (!allowEmpty && !student.rows[0].active)
    ) {
      const error = new Error("Aluno não encontrado ou inativo.");
      error.status = 404;
      throw error;
    }
    if (turmaId && turmaId !== student.rows[0].turma_id) {
      const error = new Error("Aluno não pertence à turma selecionada.");
      error.status = 400;
      throw error;
    }
    return {
      scope,
      studentType: student.rows[0].student_type,
      turmaId: student.rows[0].turma_id,
      studentId,
    };
  };

  app.get("/api/typing/difficulty", requireAuth, requireProfessor, async (req, res, next) => {
    try {
      const mode = normalizeTypingDifficultyMode(req.query.mode);
      const target = await resolveDifficultyTarget({ mode, query: req.query, allowEmpty: true });
      const result = await getEffectiveTypingSettings({
        mode,
        studentType: target.studentType,
        turmaId: target.turmaId,
        studentId: target.studentId,
      });
      return res.json({ ...result, target });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/typing/difficulty", requireAuth, requireProfessor, async (req, res, next) => {
    try {
      const mode = normalizeTypingDifficultyMode(req.body?.mode);
      const target = await resolveDifficultyTarget({ mode, body: req.body, allowEmpty: false });
      const override = await saveTypingDifficultyOverride({
        mode,
        ...target,
        payload: { ...(req.body?.settings || {}), studentType: target.studentType },
      });
      const result = await getEffectiveTypingSettings({
        mode,
        studentType: target.studentType,
        turmaId: target.turmaId,
        studentId: target.studentId,
      });
      if (target.scope === "type") {
        if (mode === "game") await broadcastTypingGameSettings(result.settings);
        else await broadcastTypingSettings(result.settings);
      } else if (mode === "game") {
        await broadcastTypingGameSettings(result.settings, target);
      } else {
        await broadcastTypingSettings(result.settings, target);
      }
      return res.json({ ...result, override });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/typing/difficulty", requireAuth, requireProfessor, async (req, res, next) => {
    try {
      const mode = normalizeTypingDifficultyMode(req.body?.mode || req.query.mode);
      const target = await resolveDifficultyTarget({ mode, body: req.body, query: req.query, allowEmpty: true });
      if (target.scope === "type") {
        return res.status(400).json({ error: "A configuração base não pode ser removida." });
      }
      await deleteTypingDifficultyOverride({ mode, ...target });
      const result = await getEffectiveTypingSettings({
        mode,
        studentType: target.studentType,
        turmaId: target.turmaId,
        studentId: target.studentId,
      });
      if (mode === "game") await broadcastTypingGameSettings(result.settings, target);
      else await broadcastTypingSettings(result.settings, target);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/typing/score", requireAuth, async (req, res, next) => {
    try {
      const { lessonId, wpm, accuracy, timeMs } = req.body;
      if (lessonId == null || wpm == null || accuracy == null) {
        return res.status(400).json({ error: "Dados incompletos." });
      }

      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO typing_scores (id, user_id, lesson_id, wpm, accuracy, time_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.user.id, lessonId, wpm, accuracy, timeMs || 0]
      );
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/typing/game/score", requireAuth, async (req, res, next) => {
    try {
      const {
        missionId,
        missionTitle,
        score,
        wpm,
        accuracy,
        hits = 0,
        errors = 0,
        status = "lost",
        timeMs = 0,
      } = req.body;
      if (
        !missionId ||
        !missionTitle ||
        score == null ||
        wpm == null ||
        accuracy == null
      ) {
        return res.status(400).json({ error: "Dados incompletos." });
      }
      if (!["won", "lost"].includes(status)) {
        return res.status(400).json({ error: "Status do game inválido." });
      }

      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO typing_game_scores
        (id, user_id, mission_id, mission_title, score, wpm, accuracy, hits, errors, status, time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          req.user.id,
          String(missionId).slice(0, 80),
          String(missionTitle).slice(0, 120),
          clampInteger(score, 0, 0, 1000000),
          clampInteger(wpm, 0, 0, 300),
          clampInteger(accuracy, 0, 0, 100),
          clampInteger(hits, 0, 0, 100000),
          clampInteger(errors, 0, 0, 100000),
          status,
          clampInteger(timeMs, 0, 0, 24 * 60 * 60 * 1000),
        ]
      );
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/typing/ranking/global", requireAuth, async (req, res, next) => {
    try {
      const studentType = normalizeTypingStudentType(
        req.query.studentType || req.user.student_type
      );
      const result = await pool.query(
        `SELECT name, lessons_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_ranking
       WHERE student_type = $1
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
        [studentType]
      );
      res.json({ ranking: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/typing/ranking/turma", requireAuth, async (req, res, next) => {
    try {
      if (!req.user.turma_id) {
        return res.json({ ranking: [] });
      }
      const result = await pool.query(
        `SELECT name, lessons_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
        [req.user.turma_id, req.user.student_type]
      );
      res.json({ ranking: result.rows });
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/typing/ranking/turma/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaResult = await pool.query(
          "SELECT student_type FROM turmas WHERE id = $1",
          [req.params.id]
        );
        if (turmaResult.rowCount === 0) {
          return res.status(404).json({ error: "Turma não encontrada." });
        }
        const studentType = turmaResult.rows[0].student_type;
        const result = await pool.query(
          `SELECT name, lessons_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
          [req.params.id, studentType]
        );
        res.json({ ranking: result.rows });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/typing/ranking/turma/reset",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaCode = normalizeTurmaCode(req.body.turmaCode);
        if (!turmaCode || !/^[A-Z0-9]{6}$/.test(turmaCode)) {
          return res.status(400).json({
            error: "Informe um código de turma válido com 6 caracteres.",
          });
        }
        const turmaResult = await pool.query(
          "SELECT id, nome, code, student_type FROM turmas WHERE code = $1",
          [turmaCode]
        );
        if (turmaResult.rowCount === 0) {
          return res
            .status(404)
            .json({ error: "Código de turma não encontrado." });
        }

        const turma = turmaResult.rows[0];
        const deleteResult = await pool.query(
          `DELETE FROM typing_scores
       WHERE user_id IN (
         SELECT id FROM users WHERE turma_id = $1 AND student_type = $2
       )`,
          [turma.id, turma.student_type]
        );

        res.json({
          ok: true,
          deletedScores: deleteResult.rowCount,
          turma: {
            id: turma.id,
            nome: turma.nome,
            code: turma.code,
            studentType: turma.student_type,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/typing/game/ranking/global",
    requireAuth,
    async (req, res, next) => {
      try {
        const studentType = normalizeTypingStudentType(
          req.query.studentType || req.user.student_type
        );
        const result = await pool.query(
          `SELECT name, missions_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_game_ranking
       WHERE student_type = $1
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
          [studentType]
        );
        res.json({ ranking: result.rows });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/typing/game/ranking/turma",
    requireAuth,
    async (req, res, next) => {
      try {
        if (!req.user.turma_id) {
          return res.json({ ranking: [] });
        }
        const result = await pool.query(
          `SELECT name, missions_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_game_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
          [req.user.turma_id, req.user.student_type]
        );
        res.json({ ranking: result.rows });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/typing/game/ranking/turma/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaResult = await pool.query(
          "SELECT student_type FROM turmas WHERE id = $1",
          [req.params.id]
        );
        if (turmaResult.rowCount === 0) {
          return res.status(404).json({ error: "Turma não encontrada." });
        }
        const studentType = turmaResult.rows[0].student_type;
        const result = await pool.query(
          `SELECT name, missions_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_game_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
          [req.params.id, studentType]
        );
        res.json({ ranking: result.rows });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/typing/game/ranking/turma/reset",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaCode = normalizeTurmaCode(req.body.turmaCode);
        if (!turmaCode || !/^[A-Z0-9]{6}$/.test(turmaCode)) {
          return res.status(400).json({
            error: "Informe um código de turma válido com 6 caracteres.",
          });
        }
        const turmaResult = await pool.query(
          "SELECT id, nome, code, student_type FROM turmas WHERE code = $1",
          [turmaCode]
        );
        if (turmaResult.rowCount === 0) {
          return res
            .status(404)
            .json({ error: "Código de turma não encontrado." });
        }

        const turma = turmaResult.rows[0];
        const deleteResult = await pool.query(
          `DELETE FROM typing_game_scores
       WHERE user_id IN (
         SELECT id FROM users WHERE turma_id = $1 AND student_type = $2
       )`,
          [turma.id, turma.student_type]
        );

        res.json({
          ok: true,
          deletedScores: deleteResult.rowCount,
          turma: {
            id: turma.id,
            nome: turma.nome,
            code: turma.code,
            studentType: turma.student_type,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );
};
