const crypto = require("node:crypto");
const checkers = require("../domain/arcadeCheckers.cjs");
const uno = require("../domain/arcadeUno.cjs");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const normalizeUuid = (value, fieldName) => {
  const normalized = String(value || "").trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw httpError(400, `${fieldName} deve ser um UUID válido.`);
  }
  return normalized;
};

module.exports = function injectArcadeRoutes(ctx) {
  const { app, pool, requireAuth } = ctx;

  // Mapa em memória para gerenciamento das salas e conexões SSE
  // roomId -> { room, players, gameState, clients: Set<res> }
  const liveRooms = new Map();

  const getOrCreateLiveRoom = (roomId) => {
    let live = liveRooms.get(roomId);
    if (!live) {
      live = {
        roomId,
        gameState: null,
        clients: new Set(),
      };
      liveRooms.set(roomId, live);
    }
    return live;
  };

  const parseJsonField = (field) => {
    if (!field) return null;
    if (typeof field === "object") return field;
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  };

  /**
   * Sanitiza o estado de Uno para um jogador específico, escondendo as cartas de outros jogadores
   */
  const sanitizeGameStateForUser = (rawGameState, gameType, userId) => {
    const gameState = parseJsonField(rawGameState);
    if (
      !gameState ||
      typeof gameState !== "object" ||
      Object.keys(gameState).length === 0
    ) {
      return null;
    }
    if (gameType !== "uno") return gameState;
    if (!Array.isArray(gameState.players)) return null;

    // No Uno, cada jogador vê suas cartas e apenas o número de cartas dos outros
    return {
      ...gameState,
      drawPileCount:
        gameState.drawPile && Array.isArray(gameState.drawPile)
          ? gameState.drawPile.length
          : 0,
      drawPile: undefined, // Esconde monte de compras para evitar trapaça
      players: gameState.players.map((p) => {
        if (p.userId === userId) {
          return p; // Suas próprias cartas
        }
        return {
          userId: p.userId,
          username: p.username,
          displayName: p.displayName,
          seatIndex: p.seatIndex,
          cardCount: p.hand ? p.hand.length : 0,
          calledUno: p.calledUno,
        };
      }),
    };
  };

  /**
   * Transmite evento para todos os clientes conectados na sala
   */
  const broadcastRoomEvent = (roomId, eventType, data = {}) => {
    const live = liveRooms.get(roomId);
    if (!live || !live.clients || live.clients.size === 0) return;

    for (const client of live.clients) {
      try {
        const sanitizedData = sanitizeGameStateForUser(
          data.gameState || live.gameState,
          data.gameType || live.gameType,
          client.userId
        );

        const payload = {
          type: eventType,
          ...data,
          gameState: sanitizedData,
        };

        client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        live.clients.delete(client);
      }
    }
  };

  /**
   * Atualiza pontuações de ranking no banco
   */
  const recordMatchOutcome = async ({
    winnerUserId,
    gameType,
    turmaId,
    allPlayerIds,
  }) => {
    try {
      const winnerPoints = gameType === "uno" ? 100 : 50;
      const participantPoints = 15;

      for (const uid of allPlayerIds) {
        const isWinner = uid === winnerUserId;
        const pts = isWinner ? winnerPoints : participantPoints;
        const wins = isWinner ? 1 : 0;

        // Atualiza ranking da turma e ranking geral
        await pool.query(
          `INSERT INTO arcade_rankings (user_id, turma_id, game_type, wins_count, matches_played, total_points, updated_at)
           VALUES ($1, $2, $3, $4, 1, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, turma_id, game_type)
           DO UPDATE SET
             wins_count = arcade_rankings.wins_count + $4,
             matches_played = arcade_rankings.matches_played + 1,
             total_points = arcade_rankings.total_points + $5,
             updated_at = CURRENT_TIMESTAMP`,
          [uid, turmaId || null, gameType, wins, pts]
        );

        // Atualiza ranking geral 'overall'
        await pool.query(
          `INSERT INTO arcade_rankings (user_id, turma_id, game_type, wins_count, matches_played, total_points, updated_at)
           VALUES ($1, $2, 'overall', $3, 1, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, turma_id, game_type)
           DO UPDATE SET
             wins_count = arcade_rankings.wins_count + $3,
             matches_played = arcade_rankings.matches_played + 1,
             total_points = arcade_rankings.total_points + $4,
             updated_at = CURRENT_TIMESTAMP`,
          [uid, turmaId || null, wins, pts]
        );
      }
    } catch (err) {
      console.error("Erro ao registrar estatísticas do Arcade:", err);
    }
  };

  const AUTO_REMOVE_FINISHED_DELAY_MS = 30000; // 30 segundos de tolerância para visualização do resultado e revanche

  /**
   * Agenda a remoção automática de uma sala encerrada
   */
  const scheduleRoomAutoRemoval = (
    roomId,
    delayMs = AUTO_REMOVE_FINISHED_DELAY_MS
  ) => {
    const live = getOrCreateLiveRoom(roomId);
    if (live.autoDeleteTimeout) {
      clearTimeout(live.autoDeleteTimeout);
    }

    live.autoDeleteTimeout = setTimeout(async () => {
      try {
        const checkRes = await pool.query(
          `SELECT id, status FROM arcade_rooms WHERE id = $1`,
          [roomId]
        );

        if (
          checkRes.rows.length > 0 &&
          checkRes.rows[0].status === "FINISHED"
        ) {
          broadcastRoomEvent(roomId, "ROOM_CLOSED", {
            roomId,
            message: "A sala encerrada foi removida automaticamente.",
          });

          await pool.query(`DELETE FROM arcade_rooms WHERE id = $1`, [roomId]);
        }
      } catch (err) {
        console.error("Erro na remoção automática da sala encerrada:", err);
      } finally {
        live.autoDeleteTimeout = null;
        liveRooms.delete(roomId);
      }
    }, delayMs);

    if (live.autoDeleteTimeout.unref) {
      live.autoDeleteTimeout.unref();
    }
  };

  /**
   * Cancela a remoção automática agendada de uma sala (ex.: em caso de revanche)
   */
  const cancelRoomAutoRemoval = (roomId) => {
    const live = liveRooms.get(roomId);
    if (live && live.autoDeleteTimeout) {
      clearTimeout(live.autoDeleteTimeout);
      live.autoDeleteTimeout = null;
    }
  };

  /**
   * Limpa salas encerradas expiradas, canceladas ou órfãs abandonadas
   */
  const cleanupStaleRooms = async () => {
    try {
      await pool.query(
        `DELETE FROM arcade_rooms
         WHERE status = 'CANCELLED'
            OR (status = 'FINISHED' AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 seconds')
            OR (NOT EXISTS (SELECT 1 FROM arcade_room_players p WHERE p.room_id = arcade_rooms.id)
                AND created_at < CURRENT_TIMESTAMP - INTERVAL '2 minutes')`
      );
    } catch (err) {
      console.error("Erro na limpeza periódica de salas do Arcade:", err);
    }
  };

  const cleanupInterval = setInterval(cleanupStaleRooms, 30000);
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  // 1. Listar salas disponíveis
  app.get("/api/arcade/rooms", requireAuth, async (req, res, next) => {
    try {
      await cleanupStaleRooms();
      const { gameType, status } = req.query;
      const isStaff = ["professor", "admin"].includes(req.user.role);

      let query = `
        SELECT 
          r.id,
          r.turma_id AS "turmaId",
          r.host_user_id AS "hostUserId",
          r.title,
          r.game_type AS "gameType",
          r.status,
          r.max_players AS "maxPlayers",
          r.created_at AS "createdAt",
          u.display_name AS "hostName",
          u.username AS "hostUsername",
          COUNT(p.id)::int AS "playerCount"
        FROM arcade_rooms r
        JOIN users u ON r.host_user_id = u.id
        LEFT JOIN arcade_room_players p ON r.id = p.room_id
      `;

      const params = [];
      const whereClauses = [];

      // Alunos só enxergam salas da própria turma (ou salas gerais sem turma)
      const userTurmaId = req.user.turma_id || req.user.turmaId;
      if (!isStaff) {
        if (userTurmaId) {
          params.push(userTurmaId);
          whereClauses.push(
            `(r.turma_id = $${params.length} OR r.turma_id IS NULL)`
          );
        } else {
          whereClauses.push(`r.turma_id IS NULL`);
        }
      }

      if (gameType) {
        params.push(gameType);
        whereClauses.push(`r.game_type = $${params.length}`);
      }

      if (status) {
        params.push(status);
        whereClauses.push(`r.status = $${params.length}`);
      } else {
        // Por padrão exibe apenas salas aguardando ou em partida (não polui o saguão com encerradas)
        whereClauses.push(`r.status IN ('WAITING', 'PLAYING')`);
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(" AND ")}`;
      }

      query += ` GROUP BY r.id, u.display_name, u.username ORDER BY r.created_at DESC LIMIT 50`;

      const result = await pool.query(query, params);
      res.json({ rooms: result.rows });
    } catch (err) {
      next(err);
    }
  });

  // 2. Criar nova sala
  app.post("/api/arcade/rooms", requireAuth, async (req, res, next) => {
    try {
      const { title, gameType, maxPlayers } = req.body;

      const trimmedTitle = String(title || "").trim();
      if (!trimmedTitle || trimmedTitle.length > 80) {
        throw httpError(
          400,
          "Título da sala deve ter entre 1 e 80 caracteres."
        );
      }

      if (!["checkers", "uno"].includes(gameType)) {
        throw httpError(
          400,
          "Tipo de jogo inválido. Escolha 'checkers' ou 'uno'."
        );
      }

      let parsedMaxPlayers = 2;
      if (gameType === "checkers") {
        parsedMaxPlayers = 2;
      } else {
        parsedMaxPlayers = parseInt(maxPlayers, 10);
        if (
          isNaN(parsedMaxPlayers) ||
          parsedMaxPlayers < 2 ||
          parsedMaxPlayers > 100
        ) {
          parsedMaxPlayers = 10;
        }
      }

      const userTurmaId = req.user.turma_id || req.user.turmaId;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const roomRes = await client.query(
          `INSERT INTO arcade_rooms (turma_id, host_user_id, title, game_type, status, max_players)
           VALUES ($1, $2, $3, $4, 'WAITING', $5)
           RETURNING id, turma_id AS "turmaId", host_user_id AS "hostUserId", title, game_type AS "gameType", status, max_players AS "maxPlayers", created_at AS "createdAt"`,
          [
            userTurmaId || null,
            req.user.id,
            trimmedTitle,
            gameType,
            parsedMaxPlayers,
          ]
        );
        const newRoom = roomRes.rows[0];

        // Anexa o criador da sala automaticamente como jogador 0
        await client.query(
          `INSERT INTO arcade_room_players (room_id, user_id, seat_index, is_ready)
           VALUES ($1, $2, 0, TRUE)`,
          [newRoom.id, req.user.id]
        );

        await client.query("COMMIT");

        const live = getOrCreateLiveRoom(newRoom.id);
        live.gameType = gameType;

        res.status(201).json({ room: newRoom });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  });

  // 3. Obter detalhes da sala
  app.get("/api/arcade/rooms/:id", requireAuth, async (req, res, next) => {
    try {
      const roomId = normalizeUuid(req.params.id, "ID da sala");

      const roomRes = await pool.query(
        `SELECT 
           r.id,
           r.turma_id AS "turmaId",
           r.host_user_id AS "hostUserId",
           r.title,
           r.game_type AS "gameType",
           r.status,
           r.max_players AS "maxPlayers",
           r.winner_user_id AS "winnerUserId",
           r.game_state AS "gameState",
           r.created_at AS "createdAt",
           u.display_name AS "hostName",
           u.username AS "hostUsername"
         FROM arcade_rooms r
         JOIN users u ON r.host_user_id = u.id
         WHERE r.id = $1`,
        [roomId]
      );

      if (roomRes.rows.length === 0) {
        throw httpError(404, "Sala não encontrada.");
      }

      const room = roomRes.rows[0];

      // Alunos só podem acessar salas da própria turma
      const userTurmaId = req.user.turma_id || req.user.turmaId;
      if (
        !["professor", "admin"].includes(req.user.role) &&
        room.turmaId &&
        room.turmaId !== userTurmaId
      ) {
        throw httpError(403, "Você não tem acesso a salas de outra turma.");
      }

      const playersRes = await pool.query(
        `SELECT 
           p.id,
           p.user_id AS "userId",
           p.seat_index AS "seatIndex",
           p.is_ready AS "isReady",
           p.score,
           u.display_name AS "displayName",
           u.username
         FROM arcade_room_players p
         JOIN users u ON p.user_id = u.id
         WHERE p.room_id = $1
         ORDER BY p.seat_index ASC`,
        [roomId]
      );

      const parsedDbState = parseJsonField(room.gameState);
      const live = getOrCreateLiveRoom(roomId);
      live.gameType = room.gameType;
      if (
        !live.gameState &&
        parsedDbState &&
        Object.keys(parsedDbState).length > 0
      ) {
        live.gameState = parsedDbState;
      }

      const currentGameState = live.gameState || parsedDbState;
      const sanitizedState = sanitizeGameStateForUser(
        currentGameState,
        room.gameType,
        req.user.id
      );

      res.json({
        room,
        players: playersRes.rows,
        gameState: sanitizedState,
      });
    } catch (err) {
      next(err);
    }
  });

  // 4. Entrar na sala
  app.post(
    "/api/arcade/rooms/:id/join",
    requireAuth,
    async (req, res, next) => {
      try {
        const roomId = normalizeUuid(req.params.id, "ID da sala");

        const roomRes = await pool.query(
          `SELECT id, turma_id, status, max_players, game_type FROM arcade_rooms WHERE id = $1`,
          [roomId]
        );

        if (roomRes.rows.length === 0) {
          throw httpError(404, "Sala não encontrada.");
        }

        const room = roomRes.rows[0];

        const userTurmaId = req.user.turma_id || req.user.turmaId;
        if (
          !["professor", "admin"].includes(req.user.role) &&
          room.turma_id &&
          room.turma_id !== userTurmaId
        ) {
          throw httpError(403, "Você não tem acesso a esta turma.");
        }

        // Verifica se já está na sala como jogador
        const existing = await pool.query(
          `SELECT id FROM arcade_room_players WHERE room_id = $1 AND user_id = $2`,
          [roomId, req.user.id]
        );

        if (existing.rows.length > 0) {
          const allPlayersRes = await pool.query(
            `SELECT p.user_id AS "userId", p.seat_index AS "seatIndex", p.is_ready AS "isReady", u.display_name AS "displayName", u.username
           FROM arcade_room_players p
           JOIN users u ON p.user_id = u.id
           WHERE p.room_id = $1
           ORDER BY p.seat_index ASC`,
            [roomId]
          );
          return res.json({
            success: true,
            players: allPlayersRes.rows,
            isSpectator: false,
          });
        }

        // Se não é jogador da sala e a partida já começou ou foi encerrada, aceita como espectador
        if (room.status !== "WAITING") {
          const allPlayersRes = await pool.query(
            `SELECT p.user_id AS "userId", p.seat_index AS "seatIndex", p.is_ready AS "isReady", u.display_name AS "displayName", u.username
           FROM arcade_room_players p
           JOIN users u ON p.user_id = u.id
           WHERE p.room_id = $1
           ORDER BY p.seat_index ASC`,
            [roomId]
          );
          return res.json({
            success: true,
            players: allPlayersRes.rows,
            isSpectator: true,
          });
        }

        const countRes = await pool.query(
          `SELECT COUNT(*)::int AS count FROM arcade_room_players WHERE room_id = $1`,
          [roomId]
        );

        if (countRes.rows[0].count >= room.max_players) {
          throw httpError(400, "A sala já está lotada.");
        }

        const nextSeat = countRes.rows[0].count;
        await pool.query(
          `INSERT INTO arcade_room_players (room_id, user_id, seat_index, is_ready)
         VALUES ($1, $2, $3, FALSE)`,
          [roomId, req.user.id, nextSeat]
        );

        const allPlayersRes = await pool.query(
          `SELECT p.user_id AS "userId", p.seat_index AS "seatIndex", p.is_ready AS "isReady", u.display_name AS "displayName", u.username
         FROM arcade_room_players p
         JOIN users u ON p.user_id = u.id
         WHERE p.room_id = $1
         ORDER BY p.seat_index ASC`,
          [roomId]
        );

        broadcastRoomEvent(roomId, "ROOM_UPDATED", {
          players: allPlayersRes.rows,
          message: `${
            req.user.displayName || req.user.username
          } entrou na sala.`,
        });

        res.json({
          success: true,
          players: allPlayersRes.rows,
          isSpectator: false,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // 5. Alternar status Pronto (Ready)
  app.post(
    "/api/arcade/rooms/:id/ready",
    requireAuth,
    async (req, res, next) => {
      try {
        const roomId = normalizeUuid(req.params.id, "ID da sala");

        await pool.query(
          `UPDATE arcade_room_players
         SET is_ready = NOT is_ready
         WHERE room_id = $1 AND user_id = $2`,
          [roomId, req.user.id]
        );

        const allPlayersRes = await pool.query(
          `SELECT p.user_id AS "userId", p.seat_index AS "seatIndex", p.is_ready AS "isReady", u.display_name AS "displayName", u.username
         FROM arcade_room_players p
         JOIN users u ON p.user_id = u.id
         WHERE p.room_id = $1
         ORDER BY p.seat_index ASC`,
          [roomId]
        );

        broadcastRoomEvent(roomId, "ROOM_UPDATED", {
          players: allPlayersRes.rows,
        });

        res.json({ success: true, players: allPlayersRes.rows });
      } catch (err) {
        next(err);
      }
    }
  );

  // 6. Iniciar partida (Host)
  app.post(
    "/api/arcade/rooms/:id/start",
    requireAuth,
    async (req, res, next) => {
      try {
        const roomId = normalizeUuid(req.params.id, "ID da sala");

        const roomRes = await pool.query(
          `SELECT id, turma_id, host_user_id, game_type, status FROM arcade_rooms WHERE id = $1`,
          [roomId]
        );

        if (roomRes.rows.length === 0) {
          throw httpError(404, "Sala não encontrada.");
        }

        const room = roomRes.rows[0];
        if (
          room.host_user_id !== req.user.id &&
          !["professor", "admin"].includes(req.user.role)
        ) {
          throw httpError(
            403,
            "Apenas o criador da sala pode iniciar a partida."
          );
        }

        if (room.status !== "WAITING") {
          throw httpError(400, "A partida já foi iniciada ou encerrada.");
        }

        const playersRes = await pool.query(
          `SELECT p.user_id AS "userId", p.seat_index AS "seatIndex", u.display_name AS "displayName", u.username
         FROM arcade_room_players p
         JOIN users u ON p.user_id = u.id
         WHERE p.room_id = $1
         ORDER BY p.seat_index ASC`,
          [roomId]
        );

        const players = playersRes.rows;

        if (room.game_type === "checkers" && players.length !== 2) {
          throw httpError(
            400,
            "O jogo de Damas necessita exatamente de 2 jogadores para iniciar."
          );
        }

        if (room.game_type === "uno" && players.length < 2) {
          throw httpError(
            400,
            "O jogo de Uno necessita de no mínimo 2 jogadores para iniciar."
          );
        }

        let initialGameState = null;
        try {
          if (room.game_type === "checkers") {
            initialGameState = checkers.initCheckersGame(players);
          } else if (room.game_type === "uno") {
            initialGameState = uno.initUnoGame(players);
          }
        } catch (domainErr) {
          throw httpError(
            400,
            domainErr.message || "Não foi possível iniciar a partida."
          );
        }

        await pool.query(
          `UPDATE arcade_rooms 
         SET status = 'PLAYING', game_state = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
          [JSON.stringify(initialGameState), roomId]
        );

        const live = getOrCreateLiveRoom(roomId);
        live.gameType = room.game_type;
        live.gameState = initialGameState;

        broadcastRoomEvent(roomId, "GAME_STARTED", {
          status: "PLAYING",
          gameType: room.game_type,
          gameState: initialGameState,
          players,
        });

        res.json({
          success: true,
          status: "PLAYING",
          gameState: sanitizeGameStateForUser(
            initialGameState,
            room.game_type,
            req.user.id
          ),
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // 7. Ação no jogo (Jogar peça, jogar carta, comprar carta, gritar uno, etc.)
  app.post(
    "/api/arcade/rooms/:id/action",
    requireAuth,
    async (req, res, next) => {
      try {
        const roomId = normalizeUuid(req.params.id, "ID da sala");
        const { action } = req.body;

        if (!action || typeof action !== "object") {
          throw httpError(400, "Ação de jogo inválida.");
        }

        const roomRes = await pool.query(
          `SELECT id, turma_id, game_type, status, game_state FROM arcade_rooms WHERE id = $1`,
          [roomId]
        );

        if (roomRes.rows.length === 0) {
          throw httpError(404, "Sala não encontrada.");
        }

        const room = roomRes.rows[0];
        if (room.status !== "PLAYING") {
          throw httpError(400, "A partida não está em andamento.");
        }

        const live = getOrCreateLiveRoom(roomId);
        live.gameType = room.game_type;
        if (!live.gameState && room.game_state) {
          live.gameState = parseJsonField(room.game_state);
        }

        if (!live.gameState) {
          throw httpError(400, "O estado da partida não foi encontrado.");
        }

        // Valida se o usuário é participante ativo da partida
        const isParticipant = (live.gameState?.players || []).some(
          (p) => p.userId === req.user.id
        );
        if (!isParticipant) {
          throw httpError(
            403,
            "Apenas os jogadores participantes podem realizar jogadas na partida."
          );
        }

        let updatedState = live.gameState;
        let notificationMsg = "";

        try {
          if (room.game_type === "checkers") {
            if (action.type === "MOVE") {
              updatedState = checkers.applyCheckersMove(
                updatedState,
                action.move,
                req.user.id
              );
            } else if (action.type === "RESIGN") {
              // Desistência
              const opponent = updatedState.players.find(
                (p) => p.userId !== req.user.id
              );
              updatedState.winner = opponent?.userId;
              updatedState.status = "FINISHED";
              notificationMsg = `${
                req.user.displayName || req.user.username
              } desistiu da partida.`;
            } else {
              throw httpError(400, "Tipo de ação inválido para Damas.");
            }
          } else if (room.game_type === "uno") {
            if (action.type === "PLAY_CARD") {
              updatedState = uno.playUnoCard(
                updatedState,
                req.user.id,
                action.cardId,
                action.chosenColor
              );
            } else if (action.type === "DRAW_CARD") {
              updatedState = uno.drawUnoCard(updatedState, req.user.id);
            } else if (action.type === "PASS") {
              updatedState = uno.passUnoTurn(updatedState, req.user.id);
            } else if (action.type === "CALL_UNO") {
              updatedState = uno.callUno(updatedState, req.user.id);
              notificationMsg = `📢 ${
                req.user.displayName || req.user.username
              } gritou UNO!`;
            } else if (action.type === "CATCH_UNO") {
              const catchRes = uno.catchUno(
                updatedState,
                req.user.id,
                action.targetUserId
              );
              notificationMsg = catchRes.message;
            } else {
              throw httpError(400, "Tipo de ação inválido para Uno.");
            }
          }
        } catch (domainErr) {
          throw httpError(400, domainErr.message || "Ação inválida.");
        }

        live.gameState = updatedState;

        // Se a partida foi finalizada
        if (updatedState.status === "FINISHED") {
          const winnerId = updatedState.winner;
          await pool.query(
            `UPDATE arcade_rooms
           SET status = 'FINISHED', winner_user_id = $1, game_state = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
            [winnerId, JSON.stringify(updatedState), roomId]
          );

          const allPlayerIds = updatedState.players.map((p) => p.userId);
          await recordMatchOutcome({
            winnerUserId: winnerId,
            gameType: room.game_type,
            turmaId: room.turma_id,
            allPlayerIds,
          });

          scheduleRoomAutoRemoval(roomId, AUTO_REMOVE_FINISHED_DELAY_MS);

          broadcastRoomEvent(roomId, "GAME_OVER", {
            status: "FINISHED",
            winnerUserId: winnerId,
            gameState: updatedState,
            gameType: room.game_type,
            autoRemoveInSeconds: Math.round(
              AUTO_REMOVE_FINISHED_DELAY_MS / 1000
            ),
            message: notificationMsg,
          });
        } else {
          // Atualiza estado no banco
          await pool.query(
            `UPDATE arcade_rooms SET game_state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(updatedState), roomId]
          );

          broadcastRoomEvent(roomId, "GAME_UPDATED", {
            gameState: updatedState,
            gameType: room.game_type,
            message: notificationMsg,
          });
        }

        res.json({
          success: true,
          gameState: sanitizeGameStateForUser(
            updatedState,
            room.game_type,
            req.user.id
          ),
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // 8. Sair da sala
  app.post(
    "/api/arcade/rooms/:id/leave",
    requireAuth,
    async (req, res, next) => {
      try {
        const roomId = normalizeUuid(req.params.id, "ID da sala");

        const roomRes = await pool.query(
          `SELECT id, turma_id, host_user_id, status, game_type FROM arcade_rooms WHERE id = $1`,
          [roomId]
        );

        if (roomRes.rows.length === 0) {
          throw httpError(404, "Sala não encontrada.");
        }

        const room = roomRes.rows[0];

        await pool.query(
          `DELETE FROM arcade_room_players WHERE room_id = $1 AND user_id = $2`,
          [roomId, req.user.id]
        );

        const remainingPlayersRes = await pool.query(
          `SELECT p.user_id AS "userId", p.seat_index AS "seatIndex", p.is_ready AS "isReady", u.display_name AS "displayName", u.username
         FROM arcade_room_players p
         JOIN users u ON p.user_id = u.id
         WHERE p.room_id = $1
         ORDER BY p.seat_index ASC`,
          [roomId]
        );

        const remaining = remainingPlayersRes.rows;

        if (remaining.length === 0) {
          // Se ninguém ficou na sala, cancela agendamento e remove imediatamente a sala
          cancelRoomAutoRemoval(roomId);
          await pool.query(`DELETE FROM arcade_rooms WHERE id = $1`, [roomId]);
          liveRooms.delete(roomId);
        } else {
          // Se o host saiu, passa o host para o próximo jogador
          if (room.host_user_id === req.user.id) {
            const newHost = remaining[0];
            await pool.query(
              `UPDATE arcade_rooms SET host_user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [newHost.userId, roomId]
            );
          }

          // Se estava jogando Damas e um jogador saiu, o outro vence
          const live = getOrCreateLiveRoom(roomId);
          if (room.status === "PLAYING") {
            if (room.game_type === "checkers" && remaining.length === 1) {
              const winner = remaining[0];
              if (live.gameState) {
                live.gameState.status = "FINISHED";
                live.gameState.winner = winner.userId;
              }
              await pool.query(
                `UPDATE arcade_rooms SET status = 'FINISHED', winner_user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [winner.userId, roomId]
              );
              await recordMatchOutcome({
                winnerUserId: winner.userId,
                gameType: room.game_type,
                turmaId: room.turma_id,
                allPlayerIds: [winner.userId, req.user.id],
              });
              scheduleRoomAutoRemoval(roomId, AUTO_REMOVE_FINISHED_DELAY_MS);
              broadcastRoomEvent(roomId, "GAME_OVER", {
                status: "FINISHED",
                winnerUserId: winner.userId,
                autoRemoveInSeconds: Math.round(
                  AUTO_REMOVE_FINISHED_DELAY_MS / 1000
                ),
                message: `${
                  req.user.displayName || req.user.username
                } saiu da sala. Vitória de ${winner.displayName}!`,
              });
            }
          }

          broadcastRoomEvent(roomId, "ROOM_UPDATED", {
            players: remaining,
            message: `${
              req.user.displayName || req.user.username
            } saiu da sala.`,
          });
        }

        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    }
  );

  // 9. Reiniciar partida / Revanche
  app.post(
    "/api/arcade/rooms/:id/rematch",
    requireAuth,
    async (req, res, next) => {
      try {
        const roomId = normalizeUuid(req.params.id, "ID da sala");

        const roomRes = await pool.query(
          `SELECT id, host_user_id, game_type FROM arcade_rooms WHERE id = $1`,
          [roomId]
        );

        if (roomRes.rows.length === 0) {
          throw httpError(404, "Sala não encontrada.");
        }

        const room = roomRes.rows[0];
        if (
          room.host_user_id !== req.user.id &&
          !["professor", "admin"].includes(req.user.role)
        ) {
          throw httpError(403, "Apenas o anfitrião pode solicitar revanche.");
        }

        cancelRoomAutoRemoval(roomId);

        await pool.query(
          `UPDATE arcade_rooms SET status = 'WAITING', winner_user_id = NULL, game_state = '{}'::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [roomId]
        );

        const live = getOrCreateLiveRoom(roomId);
        live.gameState = null;

        const playersRes = await pool.query(
          `SELECT p.user_id AS "userId", p.seat_index AS "seatIndex", p.is_ready AS "isReady", u.display_name AS "displayName", u.username
         FROM arcade_room_players p
         JOIN users u ON p.user_id = u.id
         WHERE p.room_id = $1
         ORDER BY p.seat_index ASC`,
          [roomId]
        );

        broadcastRoomEvent(roomId, "ROOM_RESET", {
          status: "WAITING",
          players: playersRes.rows,
          message: "Sala reiniciada para nova partida!",
        });

        res.json({ success: true, status: "WAITING" });
      } catch (err) {
        next(err);
      }
    }
  );

  // 10. Streaming SSE para sincronização da sala em tempo real
  app.get(
    "/api/arcade/rooms/:id/stream",
    requireAuth,
    async (req, res, next) => {
      try {
        const roomId = normalizeUuid(req.params.id, "ID da sala");

        const roomRes = await pool.query(
          `SELECT id, turma_id, game_type, status, game_state FROM arcade_rooms WHERE id = $1`,
          [roomId]
        );

        if (roomRes.rows.length === 0) {
          throw httpError(404, "Sala não encontrada.");
        }

        const room = roomRes.rows[0];
        const userTurmaId = req.user.turma_id || req.user.turmaId;
        if (
          !["professor", "admin"].includes(req.user.role) &&
          room.turma_id &&
          room.turma_id !== userTurmaId
        ) {
          throw httpError(403, "Você não pertence à turma desta sala.");
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-store, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const clientEntry = {
          res,
          userId: req.user.id,
        };

        const parsedDbState = parseJsonField(room.game_state);
        const live = getOrCreateLiveRoom(roomId);
        live.gameType = room.game_type;
        if (
          !live.gameState &&
          parsedDbState &&
          Object.keys(parsedDbState).length > 0
        ) {
          live.gameState = parsedDbState;
        }
        live.clients.add(clientEntry);

        // Envia estado inicial sincronizado
        const initialSanitized = sanitizeGameStateForUser(
          live.gameState || parsedDbState,
          room.game_type,
          req.user.id
        );

        res.write(
          `data: ${JSON.stringify({
            type: "SYNC_STATE",
            status: room.status,
            gameState: initialSanitized,
          })}\n\n`
        );

        const heartbeat = setInterval(() => {
          try {
            res.write(": keep-alive\n\n");
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);

        req.on("close", () => {
          clearInterval(heartbeat);
          live.clients.delete(clientEntry);
          if (live.clients.size === 0 && room.status === "FINISHED") {
            setTimeout(async () => {
              try {
                const currentLive = liveRooms.get(roomId);
                if (!currentLive || currentLive.clients.size === 0) {
                  cancelRoomAutoRemoval(roomId);
                  await pool.query(
                    `DELETE FROM arcade_rooms WHERE id = $1 AND status = 'FINISHED'`,
                    [roomId]
                  );
                  liveRooms.delete(roomId);
                }
              } catch (err) {
                console.error("Erro ao remover sala encerrada vazia:", err);
              }
            }, 3000);
          }
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // 11. Rankings (Global e por Turma)
  app.get("/api/arcade/rankings", requireAuth, async (req, res, next) => {
    try {
      const { turmaId, gameType = "overall" } = req.query;

      // Ranking por Turma
      let turmaRankings = [];
      const activeTurmaId =
        turmaId || req.user.turma_id || req.user.turmaId;

      if (activeTurmaId) {
        const turmaRes = await pool.query(
          `SELECT 
             r.user_id AS "userId",
             r.game_type AS "gameType",
             r.wins_count AS "winsCount",
             r.matches_played AS "matchesPlayed",
             r.total_points AS "totalPoints",
             u.display_name AS "displayName",
             u.username
           FROM arcade_rankings r
           JOIN users u ON r.user_id = u.id
           WHERE r.turma_id = $1 AND r.game_type = $2
           ORDER BY r.total_points DESC, r.wins_count DESC
           LIMIT 20`,
          [activeTurmaId, gameType]
        );
        turmaRankings = turmaRes.rows;
      }

      // Ranking Global
      const globalRes = await pool.query(
        `SELECT 
           r.user_id AS "userId",
           r.game_type AS "gameType",
           SUM(r.wins_count)::int AS "winsCount",
           SUM(r.matches_played)::int AS "matchesPlayed",
           SUM(r.total_points)::int AS "totalPoints",
           u.display_name AS "displayName",
           u.username
         FROM arcade_rankings r
         JOIN users u ON r.user_id = u.id
         WHERE r.game_type = $1
         GROUP BY r.user_id, r.game_type, u.display_name, u.username
         ORDER BY "totalPoints" DESC, "winsCount" DESC
         LIMIT 25`,
        [gameType]
      );

      res.json({
        turmaRankings,
        globalRankings: globalRes.rows,
      });
    } catch (err) {
      next(err);
    }
  });
};
