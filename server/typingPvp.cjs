const crypto = require("node:crypto");

const pvpClients = new Map(); // roomId -> Set of clients
const pvpLobby = new Map(); // userId -> client

const coercePvpScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1000000, Math.trunc(score)));
};

const readPvpClientScore = (client) =>
  coercePvpScore(client?.pvpState?.wordsCompleted);

const mergePvpClientState = (client, state = {}) => {
  if (!client || !state || typeof state !== "object") return;
  client.pvpState = {
    ...(client.pvpState || {}),
    ...state,
  };
  if (state.wordsCompleted !== undefined) {
    client.pvpState.wordsCompleted = coercePvpScore(state.wordsCompleted);
  }
};

const buildPvpMatchScores = ({
  winnerClient,
  loserClient,
  winnerScore,
  loserScore,
}) => ({
  winnerScore: Math.max(
    coercePvpScore(winnerScore),
    readPvpClientScore(winnerClient)
  ),
  loserScore: Math.max(
    coercePvpScore(loserScore),
    readPvpClientScore(loserClient)
  ),
});

const injectPvpRoutes = (
  app,
  requireAuth,
  publicUser,
  pool,
  sendUserNotification = () => {},
  getOnlinePvpUsers = () => []
) => {
  app.get("/api/typing-pvp/stream", requireAuth, (req, res, next) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const client = {
      res,
      user: req.user,
      roomId: null,
      isWaitingRandom: false,
      pvpState: {},
    };
    pvpLobby.set(req.user.id, client);

    res.write(
      `data: ${JSON.stringify({
        type: "connected",
        user: publicUser(req.user),
      })}\n\n`
    );

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      pvpLobby.delete(req.user.id);
      if (client.roomId && pvpClients.has(client.roomId)) {
        const room = pvpClients.get(client.roomId);
        room.delete(client);
        for (const c of room) {
          c.res.write(
            `data: ${JSON.stringify({ type: "opponent_disconnected" })}\n\n`
          );
        }
        if (room.size === 0) pvpClients.delete(client.roomId);
      }
    });
  });

  app.get("/api/typing-pvp/lobby", requireAuth, (req, res) => {
    const players = getOnlinePvpUsers(req.user).filter((player) => {
      const pvpClient = pvpLobby.get(player.id);
      return !pvpClient?.roomId;
    });
    res.json({ players });
  });

  app.post("/api/typing-pvp/challenge", requireAuth, (req, res) => {
    const targetId = req.body.targetId;
    const targetClient = pvpLobby.get(targetId);
    const targetUser = getOnlinePvpUsers(req.user).find(
      (player) => player.id === targetId
    );
    if (!targetUser || targetClient?.roomId) {
      return res.status(400).json({ error: "Jogador não disponível" });
    }
    if (targetClient) {
      targetClient.res.write(
        `data: ${JSON.stringify({
          type: "challenge_received",
          challenger: publicUser(req.user),
        })}\n\n`
      );
    }
    sendUserNotification(targetId, {
      source: "typing-pvp",
      title: "Desafio de duelo",
      body: `${req.user.username} quer disputar uma partida de digitação.`,
      icon: "typing",
      action: {
        type: "open-typing-pvp",
        challenge: {
          challenger: publicUser(req.user),
        },
      },
    });
    res.json({ success: true });
  });

  app.post("/api/typing-pvp/accept", requireAuth, (req, res) => {
    const challengerId = req.body.challengerId;
    const challengerClient = pvpLobby.get(challengerId);
    const myClient = pvpLobby.get(req.user.id);

    if (!myClient) {
      return res
        .status(400)
        .json({ error: "Abra a tela de duelos antes de aceitar." });
    }

    if (!challengerClient || challengerClient.roomId) {
      return res
        .status(400)
        .json({ error: "Desafiante não está mais disponível" });
    }

    const roomId = crypto.randomUUID();
    myClient.roomId = roomId;
    challengerClient.roomId = roomId;
    myClient.pvpState = { wordsCompleted: 0 };
    challengerClient.pvpState = { wordsCompleted: 0 };

    const room = new Set([myClient, challengerClient]);
    pvpClients.set(roomId, room);

    const seed = Date.now() + Math.floor(Math.random() * 99999);
    const msg = JSON.stringify({
      type: "match_started",
      roomId,
      seed,
      players: [publicUser(myClient.user), publicUser(challengerClient.user)],
    });

    myClient.res.write(`data: ${msg}\n\n`);
    challengerClient.res.write(`data: ${msg}\n\n`);

    res.json({ success: true, roomId });
  });

  app.post("/api/typing-pvp/reject", requireAuth, (req, res) => {
    const challengerId = req.body.challengerId;
    const challengerClient = pvpLobby.get(challengerId);
    if (challengerClient && !challengerClient.roomId) {
      challengerClient.res.write(
        `data: ${JSON.stringify({
          type: "challenge_rejected",
          rejecter: publicUser(req.user),
        })}\n\n`
      );
    }
    res.json({ success: true });
  });

  app.post("/api/typing-pvp/random", requireAuth, (req, res) => {
    const myClient = pvpLobby.get(req.user.id);
    const turmaId = req.user.turma_id;

    let matched = null;
    for (const [userId, client] of pvpLobby.entries()) {
      if (
        userId !== req.user.id &&
        client.user.turma_id === turmaId &&
        !client.roomId &&
        client.isWaitingRandom
      ) {
        matched = client;
        break;
      }
    }

    if (matched) {
      matched.isWaitingRandom = false;
      const roomId = crypto.randomUUID();
      myClient.roomId = roomId;
      matched.roomId = roomId;
      myClient.pvpState = { wordsCompleted: 0 };
      matched.pvpState = { wordsCompleted: 0 };

      const room = new Set([myClient, matched]);
      pvpClients.set(roomId, room);

      const seed = Date.now() + Math.floor(Math.random() * 99999);
      const msg = JSON.stringify({
        type: "match_started",
        roomId,
        seed,
        players: [publicUser(myClient.user), publicUser(matched.user)],
      });

      myClient.res.write(`data: ${msg}\n\n`);
      matched.res.write(`data: ${msg}\n\n`);
      res.json({ success: true, roomId, status: "matched" });
    } else {
      myClient.isWaitingRandom = true;
      res.json({ success: true, status: "waiting" });
    }
  });

  app.post("/api/typing-pvp/cancel-random", requireAuth, (req, res) => {
    const myClient = pvpLobby.get(req.user.id);
    if (myClient) myClient.isWaitingRandom = false;
    res.json({ success: true });
  });

  app.post("/api/typing-pvp/sync", requireAuth, (req, res) => {
    const myClient = pvpLobby.get(req.user.id);
    if (!myClient || !myClient.roomId || !pvpClients.has(myClient.roomId)) {
      return res.status(400).json({ error: "Não está em uma partida" });
    }
    const room = pvpClients.get(myClient.roomId);
    mergePvpClientState(myClient, req.body.state);
    const data = JSON.stringify({
      type: "sync",
      userId: req.user.id,
      state: req.body.state,
    });
    for (const c of room) {
      if (c !== myClient) {
        c.res.write(`data: ${data}\n\n`);
      }
    }
    res.json({ success: true });
  });

  app.post("/api/typing-pvp/leave", requireAuth, (req, res) => {
    const myClient = pvpLobby.get(req.user.id);
    if (myClient && myClient.roomId && pvpClients.has(myClient.roomId)) {
      const roomId = myClient.roomId;
      const room = pvpClients.get(roomId);
      room.delete(myClient);
      myClient.roomId = null;
      for (const c of room) {
        c.res.write(
          `data: ${JSON.stringify({ type: "opponent_disconnected" })}\n\n`
        );
      }
      if (room.size === 0) pvpClients.delete(roomId);
    }
    res.json({ success: true });
  });

  app.post("/api/typing-pvp/win", requireAuth, async (req, res, next) => {
    const myClient = pvpLobby.get(req.user.id);
    if (!myClient || !myClient.roomId || !pvpClients.has(myClient.roomId)) {
      return res.status(400).json({ error: "Não está em uma partida" });
    }
    const roomId = myClient.roomId;
    const room = pvpClients.get(roomId);

    // Identificar loser
    let loserClient = null;
    for (const c of room) {
      if (c.user.id !== req.user.id) {
        loserClient = c;
      }
    }

    try {
      if (!loserClient) {
        return res.status(409).json({
          error: "Não foi possível identificar o oponente do duelo.",
        });
      }

      const { winnerScore, loserScore } = buildPvpMatchScores({
        winnerClient: myClient,
        loserClient,
        winnerScore: req.body.winnerScore,
        loserScore: req.body.loserScore,
      });
      const match = {
        winnerId: req.user.id,
        loserId: loserClient.user.id,
        winnerScore,
        loserScore,
      };

      await pool.query(
        `INSERT INTO typing_pvp_matches (id, winner_id, loser_id, winner_score, loser_score, turma_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          crypto.randomUUID(),
          req.user.id,
          loserClient.user.id,
          winnerScore,
          loserScore,
          req.user.turma_id,
        ]
      );

      const data = JSON.stringify({
        type: "match_finished",
        ...match,
      });
      for (const c of room) {
        c.res.write(`data: ${data}\n\n`);
        c.roomId = null;
      }
      pvpClients.delete(roomId);

      res.json({ success: true, match });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/typing-pvp/lose", requireAuth, async (req, res, next) => {
    const myClient = pvpLobby.get(req.user.id);
    if (!myClient || !myClient.roomId || !pvpClients.has(myClient.roomId)) {
      return res.status(400).json({ error: "Não está em uma partida" });
    }
    const roomId = myClient.roomId;
    const room = pvpClients.get(roomId);

    // Identificar winner (the opponent)
    let winnerClient = null;
    for (const c of room) {
      if (c.user.id !== req.user.id) {
        winnerClient = c;
      }
    }

    try {
      if (!winnerClient) {
        return res.status(409).json({
          error: "Não foi possível identificar o vencedor do duelo.",
        });
      }

      const { winnerScore, loserScore } = buildPvpMatchScores({
        winnerClient,
        loserClient: myClient,
        winnerScore: req.body.winnerScore,
        loserScore: req.body.loserScore,
      });
      const match = {
        winnerId: winnerClient.user.id,
        loserId: req.user.id,
        winnerScore,
        loserScore,
      };

      await pool.query(
        `INSERT INTO typing_pvp_matches (id, winner_id, loser_id, winner_score, loser_score, turma_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          crypto.randomUUID(),
          winnerClient.user.id,
          req.user.id,
          winnerScore,
          loserScore,
          req.user.turma_id,
        ]
      );

      const data = JSON.stringify({
        type: "match_finished",
        ...match,
      });
      for (const c of room) {
        c.res.write(`data: ${data}\n\n`);
        c.roomId = null;
      }
      pvpClients.delete(roomId);

      res.json({ success: true, match });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/typing-pvp/scores", requireAuth, async (req, res, next) => {
    try {
      const scope = req.query.scope === "global" ? "global" : "turma";
      let whereClause = "WHERE w.role = 'aluno' AND l.role = 'aluno'";
      const params = [];
      if (scope === "turma") {
        const turmaId =
          req.user.role === "professor" && req.query.turmaId
            ? req.query.turmaId
            : req.user.turma_id;
        if (!turmaId) return res.json({ matches: [] });
        params.push(turmaId);
        whereClause += " AND m.turma_id = $1";
      }
      const result = await pool.query(
        `SELECT m.id, m.created_at, m.winner_score, m.loser_score,
                w.username AS winner_name, w.id AS winner_id,
                l.username AS loser_name, l.id AS loser_id
         FROM typing_pvp_matches m
         LEFT JOIN users w ON w.id = m.winner_id
         LEFT JOIN users l ON l.id = m.loser_id
         ${whereClause}
         ORDER BY m.created_at DESC LIMIT 50`,
        params
      );
      res.json({ matches: result.rows });
    } catch (err) {
      next(err);
    }
  });
};

module.exports = { injectPvpRoutes };
