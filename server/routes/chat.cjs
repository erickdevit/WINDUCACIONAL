const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectChatRoutes(ctx) {
  const { app, pool, requireAuth, sendUserNotification } = ctx;

  // --- Endpoints de Chat ---

  // Clientes SSE aguardando mensagens por thread
  const chatClients = new Map(); // threadId -> Set<res>

  const broadcastChatMessage = (threadId, payload) => {
    const clients = chatClients.get(threadId);
    if (!clients) return;
    const data = JSON.stringify(payload);
    for (const res of clients) {
      try {
        res.write(`data: ${data}\n\n`);
      } catch {
        clients.delete(res);
      }
    }
  };

  const notifyChatRecipients = async (thread, message) => {
    const title =
      thread.type === "group"
        ? "Nova mensagem no grupo"
        : `Mensagem de ${message.sender_username}`;
    const body =
      message.body?.trim() ||
      (message.attachment ? "Enviou um arquivo." : "Enviou uma mensagem.");
    const notification = {
      source: "chat",
      title,
      body,
      icon: "chat",
      action: {
        type: "open-chat",
        threadId: thread.id,
        threadType: thread.type,
        turmaId: thread.turma_id,
        peer: {
          id: message.sender_id,
          username: message.sender_username,
          displayName: message.sender_name,
        },
      },
    };

    if (thread.type === "dm") {
      [thread.user_a, thread.user_b]
        .filter((userId) => userId && userId !== message.sender_id)
        .forEach((userId) => sendUserNotification(userId, notification));
      return;
    }

    if (!thread.turma_id) return;
    const result = await pool.query(
      `SELECT id FROM users
     WHERE turma_id = $1
       AND active = TRUE
       AND id <> $2`,
      [thread.turma_id, message.sender_id]
    );
    result.rows.forEach((row) => sendUserNotification(row.id, notification));
  };

  // Verificar se o usuário pode acessar uma thread
  const canAccessThread = async (userId, userRole, threadId) => {
    const result = await pool.query(
      `SELECT t.id, t.type, t.turma_id, t.user_a, t.user_b,
            u.turma_id AS viewer_turma
     FROM chat_threads t
     CROSS JOIN (SELECT turma_id FROM users WHERE id = $2) u
     WHERE t.id = $1`,
      [threadId, userId]
    );
    if (result.rowCount === 0) return null;
    const thread = result.rows[0];
    if (userRole === "professor" || userRole === "secretaria") return thread;
    if (thread.type === "group") {
      if (thread.turma_id !== thread.viewer_turma) return null;
    } else {
      if (thread.user_a !== userId && thread.user_b !== userId) return null;
    }
    return thread;
  };

  // Obter ou criar thread de grupo para uma turma
  const ensureGroupThread = async (turmaId) => {
    const existing = await pool.query(
      "SELECT id FROM chat_threads WHERE type = 'group' AND turma_id = $1",
      [turmaId]
    );
    if (existing.rowCount > 0) return existing.rows[0].id;
    const id = require("node:crypto").randomUUID();
    await pool.query(
      "INSERT INTO chat_threads (id, type, turma_id) VALUES ($1, 'group', $2) ON CONFLICT DO NOTHING",
      [id, turmaId]
    );
    const again = await pool.query(
      "SELECT id FROM chat_threads WHERE type = 'group' AND turma_id = $1",
      [turmaId]
    );
    return again.rows[0].id;
  };

  // Obter ou criar thread DM entre dois usuários
  const ensureDmThread = async (userA, userB) => {
    const existing = await pool.query(
      `SELECT id FROM chat_threads
     WHERE type = 'dm'
       AND ((user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1))`,
      [userA, userB]
    );
    if (existing.rowCount > 0) return existing.rows[0].id;
    const id = require("node:crypto").randomUUID();
    await pool.query(
      `INSERT INTO chat_threads (id, type, user_a, user_b) VALUES ($1, 'dm', $2, $3)
     ON CONFLICT DO NOTHING`,
      [id, userA, userB]
    );
    const again = await pool.query(
      `SELECT id FROM chat_threads
     WHERE type = 'dm'
       AND ((user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1))`,
      [userA, userB]
    );
    return again.rows[0].id;
  };

  // GET /api/chat/turmas - lista turmas (professor: todas; aluno: a própria)
  app.get("/api/chat/turmas", requireAuth, async (req, res, next) => {
    try {
      let rows;
      if (req.user.role !== "aluno") {
        const result = await pool.query(
          "SELECT id, nome FROM turmas WHERE active = TRUE ORDER BY nome ASC"
        );
        rows = result.rows;
      } else {
        if (!req.user.turma_id) return res.json({ turmas: [] });
        const result = await pool.query(
          "SELECT id, nome FROM turmas WHERE id = $1",
          [req.user.turma_id]
        );
        rows = result.rows;
      }
      res.json({ turmas: rows });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/chat/turmas/:turmaId/members - lista membros de uma turma (exceto o próprio usuário)
  app.get(
    "/api/chat/turmas/:turmaId/members",
    requireAuth,
    async (req, res, next) => {
      try {
        const { turmaId } = req.params;
        // Professor/secretaria pode ver qualquer turma; aluno só a própria
        if (
          req.user.role !== "professor" &&
          req.user.role !== "secretaria" &&
          req.user.turma_id !== turmaId
        ) {
          return res.status(403).json({ error: "Acesso negado." });
        }
        const result = await pool.query(
          `SELECT id, username, display_name, role
       FROM users
       WHERE turma_id = $1 AND active = TRUE AND id != $2
       ORDER BY display_name ASC`,
          [turmaId, req.user.id]
        );
        res.json({
          members: result.rows.map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.display_name,
            role: u.role,
          })),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/chat/turmas/:turmaId/group-thread - obtém (ou cria) thread de grupo
  app.get(
    "/api/chat/turmas/:turmaId/group-thread",
    requireAuth,
    async (req, res, next) => {
      try {
        const { turmaId } = req.params;
        if (
          req.user.role !== "professor" &&
          req.user.role !== "secretaria" &&
          req.user.turma_id !== turmaId
        ) {
          return res.status(403).json({ error: "Acesso negado." });
        }
        const threadId = await ensureGroupThread(turmaId);
        res.json({ threadId });
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/chat/dm - obtém (ou cria) thread DM com outro usuário
  app.post("/api/chat/dm", requireAuth, async (req, res, next) => {
    try {
      const { peerId } = req.body;
      if (!peerId || peerId === req.user.id) {
        return res.status(400).json({ error: "Destinatário inválido." });
      }
      // Verificar se o peer existe e pertence à mesma turma (ou professor pode com qualquer um)
      const peerResult = await pool.query(
        "SELECT id, turma_id, role FROM users WHERE id = $1 AND active = TRUE",
        [peerId]
      );
      if (peerResult.rowCount === 0)
        return res.status(404).json({ error: "Usuário não encontrado." });
      const peer = peerResult.rows[0];
      if (
        req.user.role !== "professor" &&
        req.user.role !== "secretaria" &&
        peer.role !== "professor" &&
        peer.role !== "secretaria"
      ) {
        if (req.user.turma_id !== peer.turma_id) {
          return res
            .status(403)
            .json({ error: "Vocês não pertencem à mesma turma." });
        }
      }
      const threadId = await ensureDmThread(req.user.id, peerId);
      res.json({ threadId });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/chat/threads/:threadId/messages - histórico de mensagens
  app.get(
    "/api/chat/threads/:threadId/messages",
    requireAuth,
    async (req, res, next) => {
      try {
        const thread = await canAccessThread(
          req.user.id,
          req.user.role,
          req.params.threadId
        );
        if (!thread) return res.status(403).json({ error: "Acesso negado." });

        const limit = Math.min(Number(req.query.limit) || 100, 200);
        const before = req.query.before; // ISO timestamp para paginação
        const params = [req.params.threadId, limit];
        let whereClause = before ? "AND m.created_at < $3" : "";
        if (before) params.push(before);

        const result = await pool.query(
          `SELECT m.id, m.thread_id, m.sender_id, m.body, m.attachment, m.created_at,
              u.display_name AS sender_name, u.username AS sender_username, u.role AS sender_role
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.thread_id = $1 ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $2`,
          params
        );
        const messages = result.rows.reverse();
        res.json({ messages });
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/chat/threads/:threadId/messages - enviar mensagem
  app.post(
    "/api/chat/threads/:threadId/messages",
    requireAuth,
    async (req, res, next) => {
      try {
        const thread = await canAccessThread(
          req.user.id,
          req.user.role,
          req.params.threadId
        );
        if (!thread) return res.status(403).json({ error: "Acesso negado." });

        const body = String(req.body.body || "").trim();
        const attachment = req.body.attachment || null;

        if (!body && !attachment) {
          return res.status(400).json({ error: "Mensagem vazia." });
        }
        if (body.length > 2000) {
          return res
            .status(400)
            .json({ error: "Mensagem muito longa (máximo 2000 caracteres)." });
        }

        // Validar attachment se presente
        let safeAttachment = null;
        if (attachment) {
          if (
            typeof attachment !== "object" ||
            !attachment.name ||
            !attachment.content
          ) {
            return res.status(400).json({ error: "Anexo inválido." });
          }
          safeAttachment = {
            name: String(attachment.name).substring(0, 255),
            content: String(attachment.content).substring(0, 100000),
            type: String(attachment.type || "txt").substring(0, 10),
          };
        }

        const id = crypto.randomUUID();
        const result = await pool.query(
          `INSERT INTO chat_messages (id, thread_id, sender_id, body, attachment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, thread_id, sender_id, body, attachment, created_at`,
          [
            id,
            req.params.threadId,
            req.user.id,
            body || "",
            safeAttachment ? JSON.stringify(safeAttachment) : null,
          ]
        );
        const msg = result.rows[0];
        const fullMsg = {
          ...msg,
          sender_name: req.user.display_name,
          sender_username: req.user.username,
          sender_role: req.user.role,
        };

        broadcastChatMessage(req.params.threadId, fullMsg);
        await notifyChatRecipients(thread, fullMsg);
        res.status(201).json({ message: fullMsg });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/chat/threads/:threadId/events - SSE para mensagens em tempo real
  app.get(
    "/api/chat/threads/:threadId/events",
    requireAuth,
    async (req, res, next) => {
      try {
        const thread = await canAccessThread(
          req.user.id,
          req.user.role,
          req.params.threadId
        );
        if (!thread) return res.status(403).json({ error: "Acesso negado." });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        if (!chatClients.has(req.params.threadId)) {
          chatClients.set(req.params.threadId, new Set());
        }
        chatClients.get(req.params.threadId).add(res);

        const heartbeat = setInterval(() => {
          res.write(": keep-alive\n\n");
        }, 25000);

        req.on("close", () => {
          clearInterval(heartbeat);
          const clients = chatClients.get(req.params.threadId);
          if (clients) {
            clients.delete(res);
            if (clients.size === 0) chatClients.delete(req.params.threadId);
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/chat/my-threads - lista threads ativas do usuário (DMs com última mensagem)
  app.get("/api/chat/my-threads", requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT t.id, t.type, t.turma_id, t.user_a, t.user_b,
              ua.display_name AS user_a_name, ua.username AS user_a_username,
              ub.display_name AS user_b_name, ub.username AS user_b_username,
              lm.body AS last_body, lm.created_at AS last_at, lm.sender_id AS last_sender_id
       FROM chat_threads t
       LEFT JOIN users ua ON ua.id = t.user_a
       LEFT JOIN users ub ON ub.id = t.user_b
       LEFT JOIN LATERAL (
         SELECT body, created_at, sender_id FROM chat_messages
         WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
       ) lm ON TRUE
       WHERE t.type = 'dm'
         AND (t.user_a = $1 OR t.user_b = $1)
       ORDER BY lm.created_at DESC NULLS LAST`,
        [req.user.id]
      );
      res.json({ threads: result.rows });
    } catch (error) {
      next(error);
    }
  });
};
