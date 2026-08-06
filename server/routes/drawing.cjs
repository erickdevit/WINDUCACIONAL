const crypto = require("node:crypto");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MAX_STROKES = 500;
const MAX_POINTS_PER_STROKE = 500;

const drawingClients = new Map();

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const normalizeUuid = (value, fieldName) => {
  const normalized = String(value || "").trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw httpError(400, `${fieldName} é inválido.`);
  }
  return normalized;
};

const normalizeText = (value, { fieldName, maxLength, required = false }) => {
  const normalized = String(value || "").trim();
  if (required && !normalized) {
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

const normalizeColor = (value, fallback = "#ffffff") => {
  const normalized = String(value || "").trim().toLowerCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : fallback;
};

const normalizeStroke = (stroke) => {
  if (
    !stroke ||
    !Array.isArray(stroke.points) ||
    stroke.points.length < 2 ||
    stroke.points.length > MAX_POINTS_PER_STROKE
  ) {
    throw httpError(400, "Um traço do desenho é inválido.");
  }

  const width = Number(stroke.width);
  if (!Number.isFinite(width) || width < 1 || width > 80) {
    throw httpError(400, "A espessura do traço é inválida.");
  }

  const points = stroke.points.map((point) => {
    const x = Number(point?.x);
    const y = Number(point?.y);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 1 ||
      y < 0 ||
      y > 1
    ) {
      throw httpError(400, "Um ponto do desenho é inválido.");
    }
    return {
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
    };
  });

  const tool = String(stroke.tool || "brush").slice(0, 20);
  const shape = stroke.shape ? String(stroke.shape).slice(0, 20) : undefined;
  const text = stroke.text ? String(stroke.text).slice(0, 120) : undefined;
  const fontSize = Number.isFinite(Number(stroke.fontSize))
    ? Math.min(Math.max(Number(stroke.fontSize), 10), 100)
    : undefined;

  return {
    color: normalizeColor(stroke.color, "#172033"),
    width: Math.round(width * 10) / 10,
    points,
    tool,
    ...(shape ? { shape } : {}),
    ...(text !== undefined ? { text } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
  };
};

const normalizeStrokes = (value) => {
  if (!Array.isArray(value) || value.length > MAX_STROKES) {
    throw httpError(400, "O desenho excede o limite de traços permitido.");
  }
  return value.map(normalizeStroke);
};

const serializeActivity = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  turmaId: row.turma_id,
  turmaName: row.turma_nome,
  topic: row.topic,
  instructions: row.instructions || "",
  backgroundColor: row.background_color || "#ffffff",
  mode: row.mode,
  status: row.status,
  winnerId: row.winner_id || null,
  winnerName: row.winner_name || null,
  winnerStrokes: row.winner_strokes || [],
  participantCount: Number(row.participant_count || 0),
  drawingCount: Number(row.drawing_count || 0),
  createdAt: row.created_at,
  closedAt: row.closed_at,
});

const serializeDrawing = (row, activity) => ({
  userId: activity.mode === "chaos" ? null : row.user_id,
  displayName:
    activity.mode === "chaos"
      ? "Quadro coletivo"
      : row.display_name || row.username || "Aluno",
  strokes: Array.isArray(row.strokes) ? row.strokes : [],
  strokeCount: Array.isArray(row.strokes) ? row.strokes.length : 0,
  updatedAt: row.updated_at || null,
  started: Boolean(row.updated_at),
});

const shouldReceiveDrawingEvent = (client, activity, ownerId) => {
  if (client.user.role === "professor") return client.user.id === activity.teacher_id;
  if (client.user.turma_id !== activity.turma_id) return false;
  if (activity.mode === "chaos" || ownerId === null) return true;
  return client.user.id === ownerId;
};

const emitDrawingEvent = (activity, type, payload, ownerId = null) => {
  const clients = drawingClients.get(activity.id);
  if (!clients) return;
  const data = `event: drawing\ndata: ${JSON.stringify({
    type,
    ...payload,
  })}\n\n`;

  for (const client of clients) {
    if (!shouldReceiveDrawingEvent(client, activity, ownerId)) continue;
    try {
      client.res.write(data);
    } catch {
      clients.delete(client);
    }
  }
};

module.exports = function injectDrawingRoutes(ctx) {
  const { app, pool, requireAuth, requireProfessor } = ctx;

  const getActivity = async (id) => {
    const normalizedId = normalizeUuid(id, "O identificador da atividade");
    const result = await pool.query(
      `SELECT a.*, t.nome AS turma_nome,
              winner.display_name AS winner_name,
              winner_drawing.strokes AS winner_strokes,
              (SELECT COUNT(*) FROM users students
               WHERE students.turma_id = a.turma_id
                 AND students.role = 'aluno'
                 AND students.active = TRUE) AS participant_count,
              (SELECT COUNT(*) FROM drawing_strokes drawing
               WHERE drawing.activity_id = a.id) AS drawing_count
       FROM drawing_activities a
       JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN users winner ON winner.id = a.winner_id
       LEFT JOIN drawing_strokes winner_drawing
         ON winner_drawing.activity_id = a.id
        AND winner_drawing.user_id = a.winner_id
       WHERE a.id = $1`,
      [normalizedId]
    );
    if (!result.rowCount) {
      throw httpError(404, "Atividade de desenho não encontrada.");
    }
    return result.rows[0];
  };

  const assertCanAccess = (user, activity) => {
    if (user.role === "professor") {
      if (activity.teacher_id !== user.id) {
        throw httpError(403, "Acesso negado para esta atividade.");
      }
      return;
    }
    if (user.role !== "aluno" || user.turma_id !== activity.turma_id) {
      throw httpError(403, "Acesso negado para esta atividade.");
    }
  };

  const readDrawings = async (activity, viewer) => {
    if (activity.mode === "chaos") {
      const result = await pool.query(
        `SELECT s.user_id, s.strokes, s.updated_at
         FROM drawing_strokes s
         WHERE s.activity_id = $1 AND s.user_id = $2`,
        [activity.id, activity.teacher_id]
      );
      return [
        serializeDrawing(
          result.rows[0] || { strokes: [], updated_at: null },
          activity
        ),
      ];
    }

    if (viewer.role === "aluno") {
      const result = await pool.query(
        `SELECT u.id AS user_id, u.username, u.display_name,
                s.strokes, s.updated_at
         FROM users u
         LEFT JOIN drawing_strokes s
           ON s.activity_id = $1 AND s.user_id = u.id
         WHERE u.id = $2 AND u.turma_id = $3 AND u.role = 'aluno'`,
        [activity.id, viewer.id, activity.turma_id]
      );
      return result.rows.map((row) => serializeDrawing(row, activity));
    }

    const result = await pool.query(
      `SELECT u.id AS user_id, u.username, u.display_name,
              s.strokes, s.updated_at
       FROM users u
       LEFT JOIN drawing_strokes s
         ON s.activity_id = $1 AND s.user_id = u.id
       WHERE u.turma_id = $2
         AND u.role = 'aluno'
         AND u.active = TRUE
       ORDER BY u.display_name ASC, u.username ASC`,
      [activity.id, activity.turma_id]
    );
    return result.rows.map((row) => serializeDrawing(row, activity));
  };

  app.get("/api/drawing/active", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "aluno" || !req.user.turma_id) {
        return res.json({ activity: null, drawing: null });
      }
      const result = await pool.query(
        `SELECT a.*, t.nome AS turma_nome
         FROM drawing_activities a
         JOIN turmas t ON t.id = a.turma_id
         WHERE a.turma_id = $1 AND a.status = 'active'
         ORDER BY a.created_at DESC
         LIMIT 1`,
        [req.user.turma_id]
      );
      if (!result.rowCount) {
        const closedResult = await pool.query(
          `SELECT a.*, t.nome AS turma_nome, w.display_name AS winner_name
           FROM drawing_activities a
           JOIN turmas t ON t.id = a.turma_id
           LEFT JOIN users w ON w.id = a.winner_id
           WHERE a.turma_id = $1 AND a.status = 'closed' AND a.winner_id IS NOT NULL
           ORDER BY a.closed_at DESC
           LIMIT 1`,
          [req.user.turma_id]
        );
        if (closedResult.rowCount) {
          const lastClosed = closedResult.rows[0];
          const drawings = await readDrawings(lastClosed, req.user);
          return res.json({
            activity: null,
            drawing: drawings[0] || null,
            lastResult: {
              activityId: lastClosed.id,
              topic: lastClosed.topic,
              winnerId: lastClosed.winner_id,
              winnerName: lastClosed.winner_name || "um colega",
              closedAt: lastClosed.closed_at,
            },
          });
        }
        return res.json({ activity: null, drawing: null });
      }
      const activity = result.rows[0];
      const drawings = await readDrawings(activity, req.user);
      return res.json({
        activity: serializeActivity(activity),
        drawing: drawings[0] || null,
      });
    } catch (requestError) {
      return next(requestError);
    }
  });

  app.get("/api/drawing/my-drawings", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "aluno") {
        return res.json({ drawings: [] });
      }
      const result = await pool.query(
        `SELECT s.strokes, s.updated_at, a.id AS activity_id, a.topic, a.mode, a.background_color,
                t.nome AS turma_nome, a.closed_at, a.winner_id
         FROM drawing_strokes s
         JOIN drawing_activities a ON a.id = s.activity_id
         JOIN turmas t ON t.id = a.turma_id
         WHERE s.user_id = $1
         ORDER BY s.updated_at DESC
         LIMIT 50`,
        [req.user.id]
      );
      return res.json({
        drawings: result.rows.map((row) => ({
          activityId: row.activity_id,
          topic: row.topic,
          mode: row.mode,
          backgroundColor: row.background_color || "#ffffff",
          turmaName: row.turma_nome,
          strokes: Array.isArray(row.strokes) ? row.strokes : [],
          strokeCount: Array.isArray(row.strokes) ? row.strokes.length : 0,
          updatedAt: row.updated_at,
          isWinner: row.winner_id === req.user.id,
        })),
      });
    } catch (requestError) {
      return next(requestError);
    }
  });

  app.get(
    "/api/drawing/activities",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const params = [req.user.id];
        const filters = ["a.teacher_id = $1"];
        if (req.query.turmaId) {
          params.push(normalizeUuid(req.query.turmaId, "A turma"));
          filters.push(`a.turma_id = $${params.length}`);
        }
        if (["active", "closed"].includes(req.query.status)) {
          params.push(req.query.status);
          filters.push(`a.status = $${params.length}`);
        }
        if (["individual", "chaos"].includes(req.query.mode)) {
          params.push(req.query.mode);
          filters.push(`a.mode = $${params.length}`);
        }
        const whereClause = `WHERE ${filters.join(" AND ")}`;
        const result = await pool.query(
          `SELECT a.*, t.nome AS turma_nome,
                  winner.display_name AS winner_name,
                  winner_drawing.strokes AS winner_strokes,
                  (SELECT COUNT(*) FROM users students
                   WHERE students.turma_id = a.turma_id
                     AND students.role = 'aluno'
                     AND students.active = TRUE) AS participant_count,
                  (SELECT COUNT(*) FROM drawing_strokes drawing
                   WHERE drawing.activity_id = a.id) AS drawing_count
           FROM drawing_activities a
           JOIN turmas t ON t.id = a.turma_id
           LEFT JOIN users winner ON winner.id = a.winner_id
           LEFT JOIN drawing_strokes winner_drawing
             ON winner_drawing.activity_id = a.id
            AND winner_drawing.user_id = a.winner_id
           ${whereClause}
           ORDER BY a.created_at DESC
           LIMIT 100`,
          params
        );
        return res.json({ activities: result.rows.map(serializeActivity) });
      } catch (requestError) {
        return next(requestError);
      }
    }
  );

  app.post(
    "/api/drawing/activities",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      const client = await pool.connect();
      try {
        const turmaId = normalizeUuid(req.body.turmaId, "A turma");
        const topic = normalizeText(req.body.topic, {
          fieldName: "O tema",
          maxLength: 120,
          required: true,
        });
        const instructions = normalizeText(req.body.instructions, {
          fieldName: "As orientações",
          maxLength: 500,
        });
        const mode = String(req.body.mode || "").trim();
        const backgroundColor = normalizeColor(req.body.backgroundColor);
        if (!["individual", "chaos"].includes(mode)) {
          throw httpError(400, "O modo da atividade é inválido.");
        }

        await client.query("BEGIN");
        const turma = await client.query(
          "SELECT id, nome FROM turmas WHERE id = $1 AND active = TRUE FOR UPDATE",
          [turmaId]
        );
        if (!turma.rowCount) {
          throw httpError(404, "Turma não encontrada ou inativa.");
        }
        const oldActRes = await client.query(
          `SELECT id, teacher_id, turma_id, topic, mode, background_color FROM drawing_activities
           WHERE turma_id = $1 AND status = 'active'`,
          [turmaId]
        );
        const oldActivities = oldActRes.rows;
        await client.query(
          `UPDATE drawing_activities
           SET status = 'closed', closed_at = NOW()
           WHERE turma_id = $1 AND status = 'active'`,
          [turmaId]
        );
        const id = crypto.randomUUID();
        const result = await client.query(
          `INSERT INTO drawing_activities
             (id, teacher_id, turma_id, topic, instructions, mode, background_color)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            id,
            req.user.id,
            turmaId,
            topic,
            instructions,
            mode,
            backgroundColor,
          ]
        );
        await client.query("COMMIT");
        oldActivities.forEach((oldAct) => {
          emitDrawingEvent(oldAct, "closed", { activityId: oldAct.id });
        });
        const activity = {
          ...result.rows[0],
          turma_nome: turma.rows[0].nome,
          participant_count: 0,
          drawing_count: 0,
        };
        return res.status(201).json({ activity: serializeActivity(activity) });
      } catch (requestError) {
        await client.query("ROLLBACK").catch(() => {});
        return next(requestError);
      } finally {
        client.release();
      }
    }
  );

  app.get(
    "/api/drawing/activities/:id",
    requireAuth,
    async (req, res, next) => {
      try {
        const activity = await getActivity(req.params.id);
        assertCanAccess(req.user, activity);
        const drawings = await readDrawings(activity, req.user);
        return res.json({
          activity: serializeActivity(activity),
          drawings,
        });
      } catch (requestError) {
        return next(requestError);
      }
    }
  );

  app.post(
    "/api/drawing/activities/:id/strokes",
    requireAuth,
    async (req, res, next) => {
      try {
        const activity = await getActivity(req.params.id);
        assertCanAccess(req.user, activity);
        if (activity.status !== "active") {
          throw httpError(403, "Esta atividade não aceita novos traços.");
        }
        if (req.user.role === "professor") {
          if (req.body.action !== "clear") {
            throw httpError(403, "Professores só podem limpar o quadro.");
          }
        } else if (req.user.role !== "aluno") {
          throw httpError(403, "Acesso negado para esta atividade.");
        }

        const targetStudentId =
          req.user.role === "professor" && req.body.targetUserId
            ? normalizeUuid(req.body.targetUserId, "O aluno alvo")
            : req.user.id;

        const ownerId =
          activity.mode === "chaos" ? activity.teacher_id : targetStudentId;
        const action = String(req.body.action || "replace");
        let strokes;

        if (activity.mode === "chaos" && action === "append") {
          const stroke = normalizeStroke(req.body.stroke);
          const result = await pool.query(
            `INSERT INTO drawing_strokes
               (activity_id, user_id, strokes, updated_at)
             VALUES ($1, $2, $3::jsonb, NOW())
             ON CONFLICT (activity_id, user_id)
             DO UPDATE SET
               strokes = CASE
                 WHEN jsonb_array_length(drawing_strokes.strokes) < $4
                 THEN drawing_strokes.strokes || EXCLUDED.strokes
                 ELSE drawing_strokes.strokes
               END,
               updated_at = NOW()
             RETURNING strokes, updated_at`,
            [activity.id, ownerId, JSON.stringify([stroke]), MAX_STROKES]
          );
          strokes = result.rows[0].strokes;
        } else {
          if (activity.mode === "chaos" && action !== "clear") {
            throw httpError(
              400,
              "No modo caos, use uma ação de desenho válida."
            );
          }
          strokes = action === "clear" ? [] : normalizeStrokes(req.body.strokes);
          const result = await pool.query(
            `INSERT INTO drawing_strokes
               (activity_id, user_id, strokes, updated_at)
             VALUES ($1, $2, $3::jsonb, NOW())
             ON CONFLICT (activity_id, user_id)
             DO UPDATE SET strokes = EXCLUDED.strokes, updated_at = NOW()
             RETURNING strokes, updated_at`,
            [activity.id, ownerId, JSON.stringify(strokes)]
          );
          strokes = result.rows[0].strokes;
        }

        emitDrawingEvent(
          activity,
          "strokes",
          {
            activityId: activity.id,
            userId: activity.mode === "chaos" ? null : ownerId,
            displayName:
              activity.mode === "chaos"
                ? "Quadro coletivo"
                : req.user.display_name || req.user.username,
            strokes,
            updatedAt: new Date().toISOString(),
          },
          activity.mode === "chaos" ? null : ownerId
        );
        return res.json({ strokes });
      } catch (requestError) {
        return next(requestError);
      }
    }
  );

  app.post(
    "/api/drawing/activities/:id/close",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const activity = await getActivity(req.params.id);
        await pool.query(
          `UPDATE drawing_activities
           SET status = 'closed', closed_at = COALESCE(closed_at, NOW())
           WHERE id = $1`,
          [activity.id]
        );
        emitDrawingEvent(activity, "closed", { activityId: activity.id });
        return res.json({ success: true });
      } catch (requestError) {
        return next(requestError);
      }
    }
  );

  app.post(
    "/api/drawing/activities/:id/winner",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const activity = await getActivity(req.params.id);
        const winnerId = normalizeUuid(req.body.winnerId, "O vencedor");
        if (activity.mode !== "individual") {
          throw httpError(
            400,
            "O modo caos não possui vencedor individual."
          );
        }
        const winner = await pool.query(
          `SELECT u.id, u.display_name
           FROM users u
           JOIN drawing_strokes drawing
             ON drawing.activity_id = $1 AND drawing.user_id = u.id
           WHERE u.id = $2
             AND u.turma_id = $3
             AND u.role = 'aluno'
             AND u.active = TRUE`,
          [activity.id, winnerId, activity.turma_id]
        );
        if (!winner.rowCount) {
          throw httpError(
            400,
            "O vencedor deve ser um aluno da turma com desenho enviado."
          );
        }
        await pool.query(
          `UPDATE drawing_activities
           SET winner_id = $2,
               status = 'closed',
               closed_at = COALESCE(closed_at, NOW())
           WHERE id = $1`,
          [activity.id, winnerId]
        );
        emitDrawingEvent(activity, "winner", {
          activityId: activity.id,
          winnerId,
          winnerName: winner.rows[0].display_name,
        });
        return res.json({
          success: true,
          winner: {
            id: winnerId,
            displayName: winner.rows[0].display_name,
          },
        });
      } catch (requestError) {
        return next(requestError);
      }
    }
  );

  app.get(
    "/api/drawing/activities/:id/events",
    requireAuth,
    async (req, res, next) => {
      try {
        const activity = await getActivity(req.params.id);
        assertCanAccess(req.user, activity);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-store, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        if (!drawingClients.has(activity.id)) {
          drawingClients.set(activity.id, new Set());
        }
        const client = { res, user: req.user };
        drawingClients.get(activity.id).add(client);
        res.write(
          `event: drawing\ndata: ${JSON.stringify({
            type: "connected",
            activityId: activity.id,
          })}\n\n`
        );

        const heartbeat = setInterval(
          () => res.write(": keep-alive\n\n"),
          15000
        );
        req.on("close", () => {
          clearInterval(heartbeat);
          const clients = drawingClients.get(activity.id);
          clients?.delete(client);
          if (clients?.size === 0) drawingClients.delete(activity.id);
        });
      } catch (requestError) {
        return next(requestError);
      }
    }
  );
};

module.exports.UUID_PATTERN = UUID_PATTERN;
