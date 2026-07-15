const crypto = require("node:crypto");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeRequiredText = (value, maxLength, fieldName) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw httpError(400, `${fieldName} é obrigatório.`);
  }
  if (normalized.length > maxLength) {
    throw httpError(
      400,
      `${fieldName} deve ter no máximo ${maxLength} caracteres.`
    );
  }
  return normalized;
};

const normalizeDescription = (value) => {
  const normalized = String(value || "").trim();
  if (normalized.length > 4000) {
    throw httpError(400, "A descrição deve ter no máximo 4000 caracteres.");
  }
  return normalized;
};

const normalizeDueAt = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, "O prazo informado é inválido.");
  }
  return parsed.toISOString();
};

const normalizeActivityType = (value) => {
  const normalized = String(value || "solo")
    .trim()
    .toLowerCase();
  if (!["solo", "group"].includes(normalized)) {
    throw httpError(
      400,
      "O formato da atividade deve ser individual ou em grupo."
    );
  }
  return normalized;
};

const normalizeUuid = (value, fieldName) => {
  const normalized = String(value || "").trim();
  if (!UUID_PATTERN.test(normalized)) {
    const subject = String(fieldName || "recurso")
      .replace(/^(a|o|as|os)\s+/i, "")
      .toLowerCase();
    throw httpError(400, `O identificador de ${subject} é inválido.`);
  }
  return normalized;
};

const normalizeUuidList = (value, fieldName, { required = false } = {}) => {
  if (!Array.isArray(value)) {
    throw httpError(400, `${fieldName} deve ser uma lista.`);
  }
  const unique = [...new Set(value.map((item) => String(item || "").trim()))];
  if (unique.length > 200) {
    throw httpError(400, `${fieldName} excede o limite de 200 itens.`);
  }
  unique.forEach((item) => normalizeUuid(item, fieldName));
  if (required && unique.length === 0) {
    throw httpError(400, `${fieldName} deve ter ao menos um item.`);
  }
  return unique;
};

const publicGroup = (row) => ({
  id: row.id,
  turmaId: row.turma_id,
  turmaNome: row.turma_nome,
  name: row.name,
  createdBy: {
    id: row.created_by,
    displayName: row.creator_name,
  },
  members: Array.isArray(row.members) ? row.members : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const publicLesson = (row) => ({
  id: row.id,
  turmaId: row.turma_id,
  turmaNome: row.turma_nome,
  title: row.title,
  description: row.description,
  activityType: row.activity_type,
  dueAt: row.due_at,
  groups: Array.isArray(row.groups) ? row.groups : [],
  completed: Boolean(row.completed),
  completedAt: row.completed_at || null,
  completedCount: Number(row.completed_count || 0),
  eligibleCount: Number(row.eligible_count || 0),
  createdBy: {
    id: row.created_by,
    displayName: row.creator_name,
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const GROUP_SELECT = `
  SELECT lg.id, lg.turma_id, lg.name, lg.created_by,
         lg.created_at, lg.updated_at,
         t.nome AS turma_nome,
         creator.display_name AS creator_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', member.id,
               'displayName', member.display_name,
               'username', member.username
             ) ORDER BY member.display_name
           ) FILTER (WHERE member.id IS NOT NULL),
           '[]'::json
         ) AS members
    FROM lesson_groups lg
    JOIN turmas t ON t.id = lg.turma_id
    JOIN users creator ON creator.id = lg.created_by
    LEFT JOIN lesson_group_members lgm ON lgm.group_id = lg.id
    LEFT JOIN users member ON member.id = lgm.user_id`;

const lessonSelect = (
  progressUserParameter = null,
  visibleGroupsUserParameter = null
) => `
  SELECT l.id, l.turma_id, l.created_by, l.title, l.description,
         l.activity_type, l.due_at, l.created_at, l.updated_at,
         t.nome AS turma_nome,
         creator.display_name AS creator_name,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object('id', lg.id, 'name', lg.name)
               ORDER BY lg.name
             )
              FROM lesson_group_assignments lga
              JOIN lesson_groups lg ON lg.id = lga.group_id
              WHERE lga.lesson_id = l.id
                ${
                  visibleGroupsUserParameter
                    ? `AND EXISTS (
                         SELECT 1
                           FROM lesson_group_members visible_group_member
                          WHERE visible_group_member.group_id = lg.id
                            AND visible_group_member.user_id = ${visibleGroupsUserParameter}
                       )`
                    : ""
                }
           ),
           '[]'::json
         ) AS groups,
         COALESCE(
           (
             SELECT COUNT(*)::int
               FROM lesson_student_progress lsp
               JOIN users completed_user ON completed_user.id = lsp.user_id
              WHERE lsp.lesson_id = l.id
                AND lsp.completed = TRUE
                AND completed_user.active = TRUE
                AND completed_user.turma_id = l.turma_id
                AND (
                  l.activity_type = 'solo'
                  OR EXISTS (
                    SELECT 1
                      FROM lesson_group_assignments completed_assignment
                      JOIN lesson_group_members completed_member
                        ON completed_member.group_id = completed_assignment.group_id
                     WHERE completed_assignment.lesson_id = l.id
                       AND completed_member.user_id = lsp.user_id
                  )
                )
           ),
           0
         ) AS completed_count,
         CASE
           WHEN l.activity_type = 'solo' THEN (
             SELECT COUNT(*)::int
               FROM users eligible
              WHERE eligible.role = 'aluno'
                AND eligible.active = TRUE
                AND eligible.turma_id = l.turma_id
           )
           ELSE (
             SELECT COUNT(DISTINCT lgm.user_id)::int
               FROM lesson_group_assignments eligible_assignment
               JOIN lesson_group_members lgm
                 ON lgm.group_id = eligible_assignment.group_id
               JOIN users eligible ON eligible.id = lgm.user_id
              WHERE eligible_assignment.lesson_id = l.id
                AND eligible.role = 'aluno'
                AND eligible.active = TRUE
                AND eligible.turma_id = l.turma_id
           )
         END AS eligible_count,
         ${
           progressUserParameter
             ? `COALESCE((SELECT lsp.completed FROM lesson_student_progress lsp WHERE lsp.lesson_id = l.id AND lsp.user_id = ${progressUserParameter}), FALSE) AS completed,
                (SELECT lsp.completed_at FROM lesson_student_progress lsp WHERE lsp.lesson_id = l.id AND lsp.user_id = ${progressUserParameter}) AS completed_at`
             : "FALSE AS completed, NULL::timestamptz AS completed_at"
         }
    FROM lessons l
    JOIN turmas t ON t.id = l.turma_id
    JOIN users creator ON creator.id = l.created_by`;

const fetchGroupById = async (queryable, id) => {
  const result = await queryable.query(
    `${GROUP_SELECT}
      WHERE lg.id = $1
      GROUP BY lg.id, t.nome, creator.display_name`,
    [id]
  );
  return result.rowCount > 0 ? publicGroup(result.rows[0]) : null;
};

const fetchLessonById = async (queryable, id) => {
  const result = await queryable.query(`${lessonSelect()} WHERE l.id = $1`, [
    id,
  ]);
  return result.rowCount > 0 ? publicLesson(result.rows[0]) : null;
};

const ensureTurmaExists = async (queryable, turmaId) => {
  const result = await queryable.query("SELECT id FROM turmas WHERE id = $1", [
    turmaId,
  ]);
  if (result.rowCount === 0) {
    throw httpError(404, "Turma não encontrada.");
  }
};

const ensureStudentsBelongToTurma = async (queryable, turmaId, studentIds) => {
  if (studentIds.length === 0) return;
  const result = await queryable.query(
    `SELECT id
       FROM users
      WHERE id = ANY($1::uuid[])
        AND role = 'aluno'
        AND turma_id = $2`,
    [studentIds, turmaId]
  );
  if (result.rowCount !== studentIds.length) {
    throw httpError(
      400,
      "Todos os membros do grupo devem ser alunos da turma selecionada."
    );
  }
};

const ensureGroupsBelongToTurma = async (queryable, turmaId, groupIds) => {
  if (groupIds.length === 0) return;
  const result = await queryable.query(
    `SELECT id
       FROM lesson_groups
      WHERE id = ANY($1::uuid[])
        AND turma_id = $2`,
    [groupIds, turmaId]
  );
  if (result.rowCount !== groupIds.length) {
    throw httpError(
      400,
      "Todos os grupos da atividade devem pertencer à turma selecionada."
    );
  }
};

const replaceGroupMembers = async (queryable, groupId, studentIds) => {
  await queryable.query(
    "DELETE FROM lesson_group_members WHERE group_id = $1",
    [groupId]
  );
  for (const studentId of studentIds) {
    await queryable.query(
      `INSERT INTO lesson_group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [groupId, studentId]
    );
  }
};

const replaceLessonGroups = async (queryable, lessonId, groupIds) => {
  await queryable.query(
    "DELETE FROM lesson_group_assignments WHERE lesson_id = $1",
    [lessonId]
  );
  for (const groupId of groupIds) {
    await queryable.query(
      `INSERT INTO lesson_group_assignments (lesson_id, group_id)
       VALUES ($1, $2)`,
      [lessonId, groupId]
    );
  }
};

function injectLessonsRoutes(ctx) {
  const { app, pool, requireAuth, requireProfessor } = ctx;

  app.get(
    "/api/lessons/groups",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaId = normalizeUuid(req.query.turmaId, "A turma");
        const result = await pool.query(
          `${GROUP_SELECT}
            WHERE lg.turma_id = $1
            GROUP BY lg.id, t.nome, creator.display_name
            ORDER BY lg.name ASC`,
          [turmaId]
        );
        res.json({ groups: result.rows.map(publicGroup) });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/lessons/groups",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      const client = await pool.connect();
      try {
        const turmaId = normalizeUuid(req.body.turmaId, "A turma");
        const name = normalizeRequiredText(
          req.body.name,
          100,
          "O nome do grupo"
        );
        const studentIds = normalizeUuidList(
          req.body.studentIds || [],
          "Os alunos"
        );

        await client.query("BEGIN");
        await ensureTurmaExists(client, turmaId);
        await ensureStudentsBelongToTurma(client, turmaId, studentIds);
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO lesson_groups (id, turma_id, name, created_by)
           VALUES ($1, $2, $3, $4)`,
          [id, turmaId, name, req.user.id]
        );
        await replaceGroupMembers(client, id, studentIds);
        await client.query("COMMIT");
        res.status(201).json({ group: await fetchGroupById(pool, id) });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        if (error.code === "23505") {
          return res
            .status(409)
            .json({ error: "Já existe um grupo com este nome na turma." });
        }
        next(error);
      } finally {
        client.release();
      }
    }
  );

  app.put(
    "/api/lessons/groups/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      const client = await pool.connect();
      try {
        const id = normalizeUuid(req.params.id, "O grupo");
        const current = await pool.query(
          "SELECT id, turma_id, name FROM lesson_groups WHERE id = $1",
          [id]
        );
        if (current.rowCount === 0) {
          throw httpError(404, "Grupo não encontrado.");
        }

        const name = normalizeRequiredText(
          req.body.name ?? current.rows[0].name,
          100,
          "O nome do grupo"
        );
        const studentIds = normalizeUuidList(
          req.body.studentIds || [],
          "Os alunos"
        );

        await client.query("BEGIN");
        await ensureStudentsBelongToTurma(
          client,
          current.rows[0].turma_id,
          studentIds
        );
        await client.query(
          `UPDATE lesson_groups
              SET name = $1, updated_at = NOW()
            WHERE id = $2`,
          [name, id]
        );
        await replaceGroupMembers(client, id, studentIds);
        await client.query("COMMIT");
        res.json({ group: await fetchGroupById(pool, id) });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        if (error.code === "23505") {
          return res
            .status(409)
            .json({ error: "Já existe um grupo com este nome na turma." });
        }
        next(error);
      } finally {
        client.release();
      }
    }
  );

  app.delete(
    "/api/lessons/groups/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const id = normalizeUuid(req.params.id, "O grupo");
        const result = await pool.query(
          "DELETE FROM lesson_groups WHERE id = $1",
          [id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Grupo não encontrado." });
        }
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );

  app.get("/api/lessons", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role === "aluno") {
        if (!req.user.turma_id) return res.json({ lessons: [] });
        const result = await pool.query(
          `${lessonSelect("$2", "$2")}
            WHERE l.turma_id = $1
              AND (
                l.activity_type = 'solo'
                OR EXISTS (
                  SELECT 1
                    FROM lesson_group_assignments visible_assignment
                    JOIN lesson_group_members visible_member
                      ON visible_member.group_id = visible_assignment.group_id
                   WHERE visible_assignment.lesson_id = l.id
                     AND visible_member.user_id = $2
                )
              )
            ORDER BY l.due_at ASC NULLS LAST, l.created_at DESC`,
          [req.user.turma_id, req.user.id]
        );
        return res.json({ lessons: result.rows.map(publicLesson) });
      }

      const turmaId = normalizeUuid(req.query.turmaId, "A turma");
      const result = await pool.query(
        `${lessonSelect()}
          WHERE l.turma_id = $1
          ORDER BY l.due_at ASC NULLS LAST, l.created_at DESC`,
        [turmaId]
      );
      res.json({ lessons: result.rows.map(publicLesson) });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/lessons",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      const client = await pool.connect();
      try {
        const turmaId = normalizeUuid(req.body.turmaId, "A turma");
        const title = normalizeRequiredText(req.body.title, 160, "O título");
        const description = normalizeDescription(req.body.description);
        const activityType = normalizeActivityType(req.body.activityType);
        const dueAt = normalizeDueAt(req.body.dueAt);
        const groupIds =
          activityType === "group"
            ? normalizeUuidList(req.body.groupIds || [], "Os grupos", {
                required: true,
              })
            : [];

        await client.query("BEGIN");
        await ensureTurmaExists(client, turmaId);
        await ensureGroupsBelongToTurma(client, turmaId, groupIds);
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO lessons
             (id, turma_id, created_by, title, description, activity_type, due_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, turmaId, req.user.id, title, description, activityType, dueAt]
        );
        await replaceLessonGroups(client, id, groupIds);
        await client.query("COMMIT");
        res.status(201).json({ lesson: await fetchLessonById(pool, id) });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        next(error);
      } finally {
        client.release();
      }
    }
  );

  app.put(
    "/api/lessons/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      const client = await pool.connect();
      try {
        const id = normalizeUuid(req.params.id, "A atividade");
        const currentResult = await pool.query(
          `SELECT l.*,
                  COALESCE(array_agg(lga.group_id) FILTER (WHERE lga.group_id IS NOT NULL), ARRAY[]::uuid[]) AS group_ids
             FROM lessons l
             LEFT JOIN lesson_group_assignments lga ON lga.lesson_id = l.id
            WHERE l.id = $1
            GROUP BY l.id`,
          [id]
        );
        if (currentResult.rowCount === 0) {
          throw httpError(404, "Atividade não encontrada.");
        }
        const current = currentResult.rows[0];
        const title = normalizeRequiredText(
          req.body.title ?? current.title,
          160,
          "O título"
        );
        const description = normalizeDescription(
          req.body.description ?? current.description
        );
        const activityType = normalizeActivityType(
          req.body.activityType ?? current.activity_type
        );
        const dueAt = Object.prototype.hasOwnProperty.call(req.body, "dueAt")
          ? normalizeDueAt(req.body.dueAt)
          : current.due_at;
        const groupIds =
          activityType === "group"
            ? normalizeUuidList(
                req.body.groupIds ?? current.group_ids,
                "Os grupos",
                { required: true }
              )
            : [];

        await client.query("BEGIN");
        await ensureGroupsBelongToTurma(client, current.turma_id, groupIds);
        await client.query(
          `UPDATE lessons
              SET title = $1,
                  description = $2,
                  activity_type = $3,
                  due_at = $4,
                  updated_at = NOW()
            WHERE id = $5`,
          [title, description, activityType, dueAt, id]
        );
        await replaceLessonGroups(client, id, groupIds);
        await client.query("COMMIT");
        res.json({ lesson: await fetchLessonById(pool, id) });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        next(error);
      } finally {
        client.release();
      }
    }
  );

  app.delete(
    "/api/lessons/:id",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const id = normalizeUuid(req.params.id, "A atividade");
        const result = await pool.query("DELETE FROM lessons WHERE id = $1", [
          id,
        ]);
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Atividade não encontrada." });
        }
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );

  app.put("/api/lessons/:id/progress", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "aluno") {
        return res
          .status(403)
          .json({ error: "Apenas alunos podem alterar o próprio progresso." });
      }
      const id = normalizeUuid(req.params.id, "A atividade");
      if (typeof req.body.completed !== "boolean") {
        return res
          .status(400)
          .json({
            error: "O estado de conclusão deve ser verdadeiro ou falso.",
          });
      }

      const visible = await pool.query(
        `SELECT l.id
             FROM lessons l
            WHERE l.id = $1
              AND l.turma_id = $2
              AND (
                l.activity_type = 'solo'
                OR EXISTS (
                  SELECT 1
                    FROM lesson_group_assignments lga
                    JOIN lesson_group_members lgm ON lgm.group_id = lga.group_id
                   WHERE lga.lesson_id = l.id AND lgm.user_id = $3
                )
              )`,
        [id, req.user.turma_id, req.user.id]
      );
      if (visible.rowCount === 0) {
        return res.status(404).json({ error: "Atividade não encontrada." });
      }

      const result = await pool.query(
        `INSERT INTO lesson_student_progress
             (lesson_id, user_id, completed, completed_at, updated_at)
           VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END, NOW())
           ON CONFLICT (lesson_id, user_id)
           DO UPDATE SET
             completed = EXCLUDED.completed,
             completed_at = EXCLUDED.completed_at,
             updated_at = NOW()
           RETURNING completed, completed_at`,
        [id, req.user.id, req.body.completed]
      );
      res.json({
        progress: {
          lessonId: id,
          completed: result.rows[0].completed,
          completedAt: result.rows[0].completed_at,
        },
      });
    } catch (error) {
      next(error);
    }
  });
}

injectLessonsRoutes.validators = {
  normalizeActivityType,
  normalizeDescription,
  normalizeDueAt,
  normalizeRequiredText,
  normalizeUuid,
  normalizeUuidList,
};

module.exports = injectLessonsRoutes;
