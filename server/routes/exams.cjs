const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectExamsRoutes(ctx) {
  const {
    app,
    ensureExamAccess,
    gradePracticalRules,
    normalizeDisplayName,
    normalizeExamQuestionType,
    normalizeExamText,
    normalizeExamTimeLimit,
    normalizeQuestionOptions,
    normalizeQuestionPoints,
    normalizeValidationRules,
    pool,
    publicExam,
    publicExamApplication,
    publicExamApplicationItem,
    publicExamQuestion,
    publicExamQuestionFull,
    publicExamSubmission,
    requireAuth,
    requireProfessor,
  } = ctx;

  app.get("/api/exams", requireAuth, async (req, res, next) => {
    try {
      let result;
      if (req.user.role !== "aluno") {
        result = await pool.query(
          "SELECT * FROM exams ORDER BY created_at DESC"
        );
        res.json({ exams: result.rows.map(publicExam) });
      } else {
        result = await pool.query(
          `SELECT e.*, s.status AS submission_status
         FROM exams e
         JOIN exam_assignments ea ON e.id = ea.exam_id
         LEFT JOIN exam_submissions s
           ON s.exam_id = e.id AND s.user_id = ea.user_id
         WHERE ea.user_id = $1 AND e.active = TRUE AND e.is_published = TRUE
         ORDER BY e.created_at DESC`,
          [req.user.id]
        );
        res.json({
          exams: result.rows.map((row) => ({
            ...publicExam(row),
            submissionStatus: row.submission_status || "pending",
          })),
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/exams/analytics",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaId = req.query.turmaId || null;
        const turmaFilter = turmaId ? " AND u.turma_id = $1" : "";
        const turmaParams = turmaId ? [turmaId] : [];

        const statsRes = await pool.query(
          `
      SELECT 
        COUNT(s.id) FILTER (WHERE s.status = 'completed') as completed_submissions,
        COUNT(ea.id) as assigned_submissions,
        AVG(s.total_score) FILTER (WHERE s.status = 'completed') as average_score
      FROM exam_assignments ea
      JOIN users u ON u.id = ea.user_id
      LEFT JOIN exam_submissions s
        ON s.exam_id = ea.exam_id AND s.user_id = ea.user_id
      WHERE 1=1${turmaFilter}
    `,
          turmaParams
        );

        const byTurmaRes = await pool.query(
          `
      SELECT 
        t.nome as name,
        AVG(s.total_score) as avg,
        COUNT(s.id) as count
      FROM exam_submissions s
      JOIN users u ON u.id = s.user_id
      JOIN turmas t ON t.id = u.turma_id
      WHERE s.status = 'completed'${turmaId ? " AND u.turma_id = $1" : ""}
      GROUP BY t.id, t.nome
    `,
          turmaParams
        );

        const stats = statsRes.rows[0];
        const assignedCount = Number(stats.assigned_submissions || 0);
        const completedCount = Number(stats.completed_submissions || 0);
        res.json({
          totalSubmissions: completedCount,
          averageScore: parseFloat(stats.average_score || 0).toFixed(1),
          completionRate:
            assignedCount > 0
              ? Math.round((completedCount / assignedCount) * 100)
              : 0,
          byTurma: byTurmaRes.rows.map((r) => ({
            name: r.name,
            avg: parseFloat(r.avg || 0).toFixed(1),
            count: parseInt(r.count),
          })),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/exams/applications",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaId = req.query.turmaId || null;
        const result = await pool.query(
          `
      SELECT
        b.id,
        b.mode,
        b.total_requested,
        b.total_created,
        b.total_existing,
        b.total_skipped,
        b.total_removed,
        b.total_retained,
        b.cancelled_at,
        b.cancellation_reason,
        b.created_at,
        teacher.id as applied_by,
        teacher.username as applied_by_username,
        teacher.display_name as applied_by_display_name,
        canceller.id as cancelled_by,
        canceller.username as cancelled_by_username,
        canceller.display_name as cancelled_by_display_name,
        i.id as item_id,
        i.exam_id,
        i.user_id,
        i.status as assignment_status,
        i.removal_status,
        i.removal_reason,
        i.removed_at,
        i.reason,
        i.created_at as item_created_at,
        e.title as exam_title,
        e.time_limit as exam_time_limit,
        t.nome as turma_name,
        student.username,
        student.display_name,
        s.status as submission_status,
        s.score_mcq,
        s.score_practical,
        s.total_score,
        s.started_at,
        s.completed_at
      FROM (
        SELECT *
        FROM exam_application_batches
        ORDER BY created_at DESC
        LIMIT 50
      ) b
      LEFT JOIN users teacher ON teacher.id = b.applied_by
      LEFT JOIN users canceller ON canceller.id = b.cancelled_by
      LEFT JOIN exam_application_items i ON i.batch_id = b.id
      LEFT JOIN exams e ON e.id = i.exam_id
      LEFT JOIN turmas t ON t.id = e.turma_id
      LEFT JOIN users student ON student.id = i.user_id
      LEFT JOIN exam_submissions s
        ON s.exam_id = i.exam_id AND s.user_id = i.user_id
      ${turmaId ? "WHERE student.turma_id = $1" : ""}
      ORDER BY b.created_at DESC, i.created_at ASC
    `,
          turmaId ? [turmaId] : []
        );

        const batches = new Map();
        for (const row of result.rows) {
          if (!batches.has(row.id)) {
            batches.set(row.id, {
              batch: row,
              items: [],
            });
          }
          if (row.item_id) {
            batches.get(row.id).items.push(publicExamApplicationItem(row));
          }
        }

        res.json({
          applications: Array.from(batches.values()).map(({ batch, items }) =>
            publicExamApplication(batch, items)
          ),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.delete(
    "/api/exams/applications/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const batchRes = await client.query(
          `SELECT *
       FROM exam_application_batches
       WHERE id = $1
       FOR UPDATE`,
          [req.params.id]
        );
        if (batchRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "Aplicação não encontrada." });
        }
        if (batchRes.rows[0].cancelled_at) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({ error: "Esta aplicação já foi removida." });
        }

        const itemsRes = await client.query(
          `SELECT i.*, s.id as submission_id, s.status as submission_status
       FROM exam_application_items i
       LEFT JOIN exam_submissions s
         ON s.exam_id = i.exam_id AND s.user_id = i.user_id
       WHERE i.batch_id = $1
       FOR UPDATE OF i`,
          [req.params.id]
        );

        let removedCount = 0;
        let retainedCount = 0;
        for (const item of itemsRes.rows) {
          if (item.status !== "created") {
            retainedCount += 1;
            await client.query(
              `UPDATE exam_application_items
           SET removal_status = 'retained',
               removal_reason = $1,
               removed_at = NOW()
           WHERE id = $2`,
              [
                item.status === "existing"
                  ? "A atribuição já existia antes desta aplicação."
                  : "A aplicação original já havia ignorado este item.",
                item.id,
              ]
            );
            continue;
          }

          if (item.submission_id) {
            retainedCount += 1;
            await client.query(
              `UPDATE exam_application_items
           SET removal_status = 'retained',
               removal_reason = $1,
               removed_at = NOW()
           WHERE id = $2`,
              ["O aluno já iniciou ou concluiu esta prova.", item.id]
            );
            continue;
          }

          await client.query(
            "DELETE FROM exam_assignments WHERE exam_id = $1 AND user_id = $2",
            [item.exam_id, item.user_id]
          );
          await client.query(
            `UPDATE exam_application_items
         SET removal_status = 'removed',
             removal_reason = $1,
             removed_at = NOW()
         WHERE id = $2`,
            ["A atribuição criada nesta aplicação foi removida.", item.id]
          );
          removedCount += 1;
        }

        const reason = normalizeExamText(
          req.body?.reason,
          "Aplicação removida pelo professor."
        );
        const updatedBatch = await client.query(
          `UPDATE exam_application_batches
       SET cancelled_at = NOW(),
           cancelled_by = $1,
           cancellation_reason = $2,
           total_removed = $3,
           total_retained = $4
       WHERE id = $5
       RETURNING *`,
          [req.user.id, reason, removedCount, retainedCount, req.params.id]
        );

        await client.query("COMMIT");
        return res.json({
          success: true,
          application: publicExamApplication(updatedBatch.rows[0]),
        });
      } catch (error) {
        await client.query("ROLLBACK");
        return next(error);
      } finally {
        client.release();
      }
    }
  );

  app.get("/api/exams/student/history", requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        `
      SELECT s.*, e.title as exam_title
      FROM exam_submissions s
      JOIN exams e ON e.id = s.exam_id
      WHERE s.user_id = $1
      ORDER BY s.completed_at DESC NULLS LAST
    `,
        [req.user.id]
      );
      res.json({
        submissions: result.rows.map((s) => ({
          ...publicExamSubmission(s),
          examTitle: s.exam_title,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/exams",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const {
          title,
          description,
          turmaId,
          containerInitialState,
          timeLimit,
        } = req.body;
        const normalizedTitle = normalizeExamText(title);
        if (!normalizedTitle) {
          return res
            .status(400)
            .json({ error: "Título da prova é obrigatório." });
        }

        const id = crypto.randomUUID();
        const result = await pool.query(
          `INSERT INTO exams (id, title, description, turma_id, container_initial_state, time_limit)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
          [
            id,
            normalizedTitle,
            normalizeExamText(description),
            turmaId || null,
            JSON.stringify(containerInitialState || {}),
            normalizeExamTimeLimit(timeLimit),
          ]
        );
        res.status(201).json({ exam: publicExam(result.rows[0]) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get("/api/exams/:id", requireAuth, async (req, res, next) => {
    try {
      const exam = await ensureExamAccess(pool, req.user, req.params.id, {
        forSubmit: req.user.role !== "professor",
      });

      const questionsRes = await pool.query(
        "SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY order_index ASC",
        [req.params.id]
      );

      const questions = questionsRes.rows.map((q) =>
        req.user.role !== "aluno"
          ? publicExamQuestionFull(q)
          : publicExamQuestion(q)
      );

      res.json({
        exam: publicExam(exam),
        questions,
      });
    } catch (error) {
      next(error);
    }
  });

  app.put(
    "/api/exams/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const {
          title,
          description,
          active,
          containerInitialState,
          timeLimit,
          isPublished,
        } = req.body;
        const normalizedTitle =
          title === undefined ? undefined : normalizeExamText(title);
        if (title !== undefined && !normalizedTitle) {
          return res
            .status(400)
            .json({ error: "Título da prova é obrigatório." });
        }

        const result = await pool.query(
          `UPDATE exams
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             active = COALESCE($3, active),
             container_initial_state = COALESCE($4, container_initial_state),
             time_limit = COALESCE($5, time_limit),
             is_published = COALESCE($6, is_published),
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
          [
            normalizedTitle,
            description === undefined
              ? undefined
              : normalizeExamText(description),
            active,
            containerInitialState
              ? JSON.stringify(containerInitialState)
              : null,
            timeLimit === undefined
              ? undefined
              : normalizeExamTimeLimit(timeLimit),
            isPublished,
            req.params.id,
          ]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Prova não encontrada." });
        }
        res.json({ exam: publicExam(result.rows[0]) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.patch(
    "/api/exams/:id/publish",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const { isPublished } = req.body;
        const result = await pool.query(
          `UPDATE exams
         SET is_published = $1, updated_at = NOW()
         WHERE id = $2
           AND ($1 = FALSE OR EXISTS (SELECT 1 FROM exam_questions WHERE exam_id = exams.id))
         RETURNING *`,
          [Boolean(isPublished), req.params.id]
        );
        if (result.rowCount === 0) {
          return res
            .status(400)
            .json({ error: "Prova não encontrada ou sem questões." });
        }
        res.json({ exam: publicExam(result.rows[0]) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/exams/assign-batch",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { assignments, mode } = req.body; // Array de { examId, userId }
        const normalizedMode = mode === "balanced" ? "balanced" : "all";
        const assignmentList = Array.isArray(assignments) ? assignments : [];
        const counters = {
          requested: assignmentList.length,
          created: 0,
          existing: 0,
          skipped: 0,
        };
        const batchId = crypto.randomUUID();

        await client.query(
          `INSERT INTO exam_application_batches
           (id, applied_by, mode, total_requested, total_created, total_existing, total_skipped)
         VALUES ($1, $2, $3, $4, 0, 0, 0)`,
          [batchId, req.user.id, normalizedMode, counters.requested]
        );

        for (const item of assignmentList) {
          let itemStatus = "skipped";
          let reason = "";
          let itemExamId = null;
          let itemUserId = null;

          const targetRes = await client.query(
            "SELECT id, role FROM users WHERE id = $1 AND active = TRUE",
            [item.userId]
          );
          if (targetRes.rowCount === 0 || targetRes.rows[0].role !== "aluno") {
            counters.skipped += 1;
            reason = "Aluno inexistente, inativo ou sem papel de aluno.";
            await client.query(
              `INSERT INTO exam_application_items (id, batch_id, exam_id, user_id, status, reason)
             VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                crypto.randomUUID(),
                batchId,
                itemExamId,
                itemUserId,
                itemStatus,
                reason,
              ]
            );
            continue;
          }
          itemUserId = targetRes.rows[0].id;

          const examRes = await client.query(
            "SELECT id, is_published, active FROM exams WHERE id = $1",
            [item.examId]
          );
          if (
            examRes.rowCount === 0 ||
            !examRes.rows[0].is_published ||
            !examRes.rows[0].active
          ) {
            counters.skipped += 1;
            reason = "Prova inexistente, inativa ou não publicada.";
            await client.query(
              `INSERT INTO exam_application_items (id, batch_id, exam_id, user_id, status, reason)
             VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                crypto.randomUUID(),
                batchId,
                itemExamId,
                itemUserId,
                itemStatus,
                reason,
              ]
            );
            continue;
          }
          itemExamId = examRes.rows[0].id;

          const assignmentRes = await client.query(
            `INSERT INTO exam_assignments (id, exam_id, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (exam_id, user_id) DO NOTHING
           RETURNING id`,
            [crypto.randomUUID(), itemExamId, itemUserId]
          );

          if (assignmentRes.rowCount === 0) {
            itemStatus = "existing";
            counters.existing += 1;
            reason = "Atribuição já existia antes desta aplicação.";
          } else {
            itemStatus = "created";
            counters.created += 1;
            reason = "Atribuição criada nesta aplicação.";
          }

          await client.query(
            `INSERT INTO exam_application_items (id, batch_id, exam_id, user_id, status, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              crypto.randomUUID(),
              batchId,
              itemExamId,
              itemUserId,
              itemStatus,
              reason,
            ]
          );
        }

        const batchRes = await client.query(
          `UPDATE exam_application_batches
         SET total_created = $1,
             total_existing = $2,
             total_skipped = $3
         WHERE id = $4
         RETURNING *`,
          [counters.created, counters.existing, counters.skipped, batchId]
        );

        await client.query("COMMIT");
        res.status(200).json({
          success: true,
          application: publicExamApplication(batchRes.rows[0]),
        });
      } catch (error) {
        await client.query("ROLLBACK");
        next(error);
      } finally {
        client.release();
      }
    }
  );

  app.delete(
    "/api/exams/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const result = await pool.query("DELETE FROM exams WHERE id = $1", [
          req.params.id,
        ]);
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Prova não encontrada." });
        }
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/exams/:id/questions",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const {
          type,
          text,
          options,
          correctAnswer,
          validationRules,
          points,
          timeLimit,
          orderIndex,
        } = req.body;
        const normalizedType = normalizeExamQuestionType(type);
        const normalizedText = normalizeExamText(text);
        if (!normalizedText) {
          return res
            .status(400)
            .json({ error: "Enunciado da questão é obrigatório." });
        }

        const id = crypto.randomUUID();
        const result = await pool.query(
          `INSERT INTO exam_questions (id, exam_id, type, text, options, correct_answer, validation_rules, points, time_limit, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
          [
            id,
            req.params.id,
            normalizedType,
            normalizedText,
            JSON.stringify(
              normalizedType === "mcq" ? normalizeQuestionOptions(options) : []
            ),
            normalizedType === "mcq"
              ? normalizeExamText(correctAnswer, "a")
              : null,
            JSON.stringify(
              normalizedType === "practical"
                ? normalizeValidationRules(validationRules)
                : []
            ),
            normalizeQuestionPoints(points),
            normalizeExamTimeLimit(timeLimit),
            orderIndex || 0,
          ]
        );
        res
          .status(201)
          .json({ question: publicExamQuestionFull(result.rows[0]) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.patch(
    "/api/exams/:id/questions/:questionId",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const {
          type,
          text,
          options,
          correctAnswer,
          validationRules,
          points,
          timeLimit,
          orderIndex,
        } = req.body;
        const normalizedType =
          type === undefined ? undefined : normalizeExamQuestionType(type);
        const normalizedText =
          text === undefined ? undefined : normalizeExamText(text);
        if (text !== undefined && !normalizedText) {
          return res
            .status(400)
            .json({ error: "Enunciado da questão é obrigatório." });
        }

        const result = await pool.query(
          `UPDATE exam_questions
         SET type = COALESCE($1, type),
             text = COALESCE($2, text),
             options = COALESCE($3, options),
             correct_answer = COALESCE($4, correct_answer),
             validation_rules = COALESCE($5, validation_rules),
             points = COALESCE($6, points),
             time_limit = COALESCE($7, time_limit),
             order_index = COALESCE($8, order_index)
         WHERE id = $9 AND exam_id = $10
         RETURNING *`,
          [
            normalizedType,
            normalizedText,
            options ? JSON.stringify(normalizeQuestionOptions(options)) : null,
            correctAnswer === undefined
              ? undefined
              : normalizeExamText(correctAnswer, "a"),
            validationRules
              ? JSON.stringify(normalizeValidationRules(validationRules))
              : null,
            points === undefined ? undefined : normalizeQuestionPoints(points),
            timeLimit === undefined
              ? undefined
              : normalizeExamTimeLimit(timeLimit),
            orderIndex,
            req.params.questionId,
            req.params.id,
          ]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Questão não encontrada." });
        }
        res.json({ question: publicExamQuestionFull(result.rows[0]) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.delete(
    "/api/exams/:id/questions/:questionId",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const result = await pool.query(
          "DELETE FROM exam_questions WHERE id = $1 AND exam_id = $2",
          [req.params.questionId, req.params.id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Questão não encontrada." });
        }
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/exams/:id/submit", requireAuth, async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { answers, status, practicalSnapshot } = req.body; // status: 'in_progress' ou 'completed'
      const normalizedStatus =
        status === "completed" ? "completed" : "in_progress";
      const exam = await ensureExamAccess(client, req.user, req.params.id, {
        forSubmit: req.user.role !== "professor",
      });

      // Verificar se já existe submissão
      let submissionRes = await client.query(
        "SELECT * FROM exam_submissions WHERE exam_id = $1 AND user_id = $2",
        [req.params.id, req.user.id]
      );

      let submission;
      if (submissionRes.rowCount === 0) {
        const id = crypto.randomUUID();
        submissionRes = await client.query(
          `INSERT INTO exam_submissions (id, exam_id, user_id, status, student_display_name, completed_at)
         VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'completed' THEN NOW() ELSE NULL END)
         RETURNING *`,
          [
            id,
            req.params.id,
            req.user.id,
            normalizedStatus,
            normalizeDisplayName(req.user.display_name),
          ]
        );
        submission = submissionRes.rows[0];
      } else {
        submission = submissionRes.rows[0];
        if (submission.status === "completed") {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Prova já finalizada." });
        }
        submissionRes = await client.query(
          `UPDATE exam_submissions
         SET status = $1,
             student_display_name = $2,
             completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
         WHERE id = $3
         RETURNING *`,
          [
            normalizedStatus,
            normalizeDisplayName(req.user.display_name),
            submission.id,
          ]
        );
        submission = submissionRes.rows[0];
      }

      const isTimedOut =
        req.user.role !== "professor" &&
        Number(exam.time_limit || 0) > 0 &&
        Date.now() - new Date(submission.started_at).getTime() >
          Number(exam.time_limit) * 60 * 1000 + 30000;

      if (isTimedOut) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "O tempo da prova terminou." });
      }

      // Salvar respostas
      if (answers && Array.isArray(answers)) {
        const questionsRes = await client.query(
          "SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY order_index ASC",
          [req.params.id]
        );
        const questions = questionsRes.rows;
        const answersByQuestion = new Map(
          answers
            .filter((answer) => answer?.questionId)
            .map((answer) => [answer.questionId, answer])
        );

        for (const question of questions) {
          const ans = answersByQuestion.get(question.id) || {};
          const answerText =
            question.type === "mcq" ? normalizeExamText(ans.answerText) : null;
          const isCorrect =
            question.type === "mcq"
              ? answerText === question.correct_answer
              : gradePracticalRules(
                  question.validation_rules,
                  practicalSnapshot
                );
          const pointsAwarded = isCorrect ? Number(question.points || 0) : 0;

          await client.query(
            `INSERT INTO exam_answers (id, submission_id, question_id, answer_text, is_correct, points_awarded)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (submission_id, question_id) DO UPDATE
           SET answer_text = EXCLUDED.answer_text,
               is_correct = EXCLUDED.is_correct,
               points_awarded = EXCLUDED.points_awarded`,
            [
              crypto.randomUUID(),
              submission.id,
              question.id,
              answerText,
              isCorrect,
              pointsAwarded,
            ]
          );
        }

        // Recalcular scores se finalizado
        if (normalizedStatus === "completed") {
          const scores = await client.query(
            `SELECT 
             SUM(CASE WHEN q.type = 'mcq' THEN a.points_awarded ELSE 0 END) as score_mcq,
             SUM(CASE WHEN q.type = 'practical' THEN a.points_awarded ELSE 0 END) as score_practical
           FROM exam_answers a
           JOIN exam_questions q ON q.id = a.question_id
           WHERE a.submission_id = $1`,
            [submission.id]
          );

          const { score_mcq, score_practical } = scores.rows[0];
          const totalScore =
            Number(score_mcq || 0) + Number(score_practical || 0);

          submissionRes = await client.query(
            `UPDATE exam_submissions 
           SET score_mcq = $1, score_practical = $2, total_score = $3, practical_snapshot = $4
           WHERE id = $5 RETURNING *`,
            [
              score_mcq || 0,
              score_practical || 0,
              totalScore,
              JSON.stringify(practicalSnapshot || null),
              submission.id,
            ]
          );
          submission = submissionRes.rows[0];
        }
      }

      await client.query("COMMIT");
      res.json({ submission: publicExamSubmission(submission) });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  });

  app.get(
    "/api/exams/:id/submissions",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaId = req.query.turmaId || null;
        const turmaFilter = turmaId ? " AND u.turma_id = $2" : "";
        const params = turmaId ? [req.params.id, turmaId] : [req.params.id];
        const result = await pool.query(
          `SELECT s.*, u.username, COALESCE(NULLIF(s.student_display_name, ''), u.display_name) AS display_name, u.turma_id,
                e.title AS exam_title,
                t.nome AS turma_name,
                (SELECT prof.display_name
                 FROM exam_application_items eai
                 JOIN exam_application_batches eab ON eab.id = eai.batch_id
                 JOIN users prof ON prof.id = eab.applied_by
                 WHERE eai.exam_id = s.exam_id AND eai.user_id = s.user_id
                 ORDER BY eab.created_at DESC
                 LIMIT 1) AS applied_by_name
         FROM exam_submissions s
         JOIN users u ON u.id = s.user_id
         JOIN exams e ON e.id = s.exam_id
         LEFT JOIN turmas t ON t.id = u.turma_id
         WHERE s.exam_id = $1${turmaFilter}
         ORDER BY s.completed_at DESC`,
          params
        );
        const submissions = result.rows.map((s) => ({
          ...publicExamSubmission(s),
          examTitle: s.exam_title || "",
          turmaName: s.turma_name || "",
          appliedByName: s.applied_by_name || "",
        }));
        res.json({ submissions });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/exams/:examId/submissions/:submissionId",
    requireAuth,
    async (req, res, next) => {
      try {
        const { examId, submissionId } = req.params;
        const subRes = await pool.query(
          `SELECT s.*, u.username, COALESCE(NULLIF(s.student_display_name, ''), u.display_name) AS display_name, u.turma_id,
                e.title AS exam_title, e.description AS exam_description,
                e.time_limit AS exam_time_limit,
                t.nome AS turma_name, t.code AS turma_code,
                (SELECT prof.display_name
                 FROM exam_application_items eai
                 JOIN exam_application_batches eab ON eab.id = eai.batch_id
                 JOIN users prof ON prof.id = eab.applied_by
                 WHERE eai.exam_id = s.exam_id AND eai.user_id = s.user_id
                 ORDER BY eab.created_at DESC
                 LIMIT 1) AS applied_by_name
         FROM exam_submissions s
         JOIN users u ON u.id = s.user_id
         JOIN exams e ON e.id = s.exam_id
         LEFT JOIN turmas t ON t.id = u.turma_id
         WHERE s.id = $1 AND s.exam_id = $2`,
          [submissionId, examId]
        );
        if (subRes.rowCount === 0) {
          return res.status(404).json({ error: "Submissão não encontrada." });
        }
        const sub = subRes.rows[0];

        // Aluno só pode ver a própria submissão
        if (req.user.role !== "professor" && sub.user_id !== req.user.id) {
          return res.status(403).json({ error: "Acesso negado." });
        }

        const answersRes = await pool.query(
          `SELECT a.*, q.type, q.text, q.options, q.correct_answer, q.validation_rules, q.points, q.order_index
         FROM exam_answers a
         JOIN exam_questions q ON q.id = a.question_id
         WHERE a.submission_id = $1
         ORDER BY q.order_index ASC`,
          [submissionId]
        );

        const isProfessor = req.user.role !== "aluno";
        const answers = answersRes.rows.map((a) => ({
          questionId: a.question_id,
          type: a.type,
          text: a.text,
          options: a.options,
          correctAnswer: isProfessor ? a.correct_answer : undefined,
          validationRules:
            isProfessor && a.type === "practical"
              ? a.validation_rules
              : undefined,
          answerText: a.answer_text,
          isCorrect: a.is_correct,
          pointsAwarded: Number(a.points_awarded || 0),
          pointsTotal: Number(a.points || 0),
        }));

        res.json({
          submission: {
            ...publicExamSubmission(sub),
            examTitle: sub.exam_title,
            examDescription: sub.exam_description,
            examTimeLimit: Number(sub.exam_time_limit || 0),
            turmaName: sub.turma_name || "",
            turmaCode: sub.turma_code || "",
            appliedByName: sub.applied_by_name || "",
          },
          answers,
          practicalSnapshot:
            isProfessor && sub.practical_snapshot
              ? sub.practical_snapshot
              : undefined,
        });
      } catch (error) {
        next(error);
      }
    }
  );
};
