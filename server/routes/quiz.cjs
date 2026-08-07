const crypto = require("node:crypto");

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

module.exports = function injectQuizRoutes(ctx) {
  const { app, pool, requireAuth, sendUserNotification } = ctx;

  // Mapa em memória para gerenciamento das sessões ativas de Quiz e conexões SSE
  // sessionId -> { session, questions, currentQuestionIndex, status, questionStartTime, responsesMap, clients: Set<res> }
  const liveSessions = new Map();

  const broadcastSessionEvent = (sessionId, payload) => {
    const live = liveSessions.get(sessionId);
    if (!live || !live.clients) return;
    const data = JSON.stringify(payload);
    for (const res of live.clients) {
      try {
        res.write(`data: ${data}\n\n`);
      } catch {
        live.clients.delete(res);
      }
    }
  };

  const getSessionLeaderboard = (live) => {
    const userScores = new Map();

    for (const [, resp] of live.responsesMap) {
      const current = userScores.get(resp.userId) || {
        userId: resp.userId,
        displayName: resp.displayName,
        username: resp.username,
        totalPoints: 0,
        correctCount: 0,
      };
      current.totalPoints += resp.pointsEarned || 0;
      if (resp.isCorrect) current.correctCount += 1;
      userScores.set(resp.userId, current);
    }

    return Array.from(userScores.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints
    );
  };

  // Seed de templates padrão caso o banco esteja limpo
  const ensureDefaultTemplates = async () => {
    try {
      const check = await pool.query(
        "SELECT COUNT(*) FROM quiz_quizzes WHERE is_template = TRUE"
      );
      if (parseInt(check.rows[0].count, 10) > 0) return;

      const defaultTemplates = [
        {
          title: "Informática & Conceitos Básicos",
          description: "Quiz rápido sobre atalhos, navegação e conceitos de informática.",
          category: "Informática",
          questions: [
            {
              text: "Qual atalho de teclado é utilizado para copiar um texto selecionado no Windows?",
              timeLimit: 15,
              points: 1000,
              options: [
                { text: "Ctrl + C", isCorrect: true, letter: "A" },
                { text: "Ctrl + V", isCorrect: false, letter: "B" },
                { text: "Ctrl + X", isCorrect: false, letter: "C" },
                { text: "Ctrl + Z", isCorrect: false, letter: "D" },
              ],
            },
            {
              text: "O que significa a sigla CPU em um computador?",
              timeLimit: 20,
              points: 1000,
              options: [
                { text: "Central Processing Unit", isCorrect: true, letter: "A" },
                { text: "Computer Personal Unit", isCorrect: false, letter: "B" },
                { text: "Central Power Unit", isCorrect: false, letter: "C" },
                { text: "Control Processing User", isCorrect: false, letter: "D" },
              ],
            },
            {
              text: "Qual destes é um sistema operacional?",
              timeLimit: 15,
              points: 1000,
              options: [
                { text: "Windows 11", isCorrect: true, letter: "A" },
                { text: "Google Chrome", isCorrect: false, letter: "B" },
                { text: "Microsoft Word", isCorrect: false, letter: "C" },
                { text: "Intel Core i7", isCorrect: false, letter: "D" },
              ],
            },
            {
              text: "Qual a função da memória RAM no computador?",
              timeLimit: 20,
              points: 1000,
              options: [
                { text: "Armazenar dados temporários de programas em execução", isCorrect: true, letter: "A" },
                { text: "Guardar fotos e vídeos permanentemente", isCorrect: false, letter: "B" },
                { text: "Resfriar o processador", isCorrect: false, letter: "C" },
                { text: "Gerar energia para a placa-mãe", isCorrect: false, letter: "D" },
              ],
            },
            {
              text: "Qual caractere é usado para separar usuário e domínio em um e-mail?",
              timeLimit: 15,
              points: 1000,
              options: [
                { text: "@ (Arroba)", isCorrect: true, letter: "A" },
                { text: "# (Haste)", isCorrect: false, letter: "B" },
                { text: "$ (Cifrão)", isCorrect: false, letter: "C" },
                { text: "& (E comercial)", isCorrect: false, letter: "D" },
              ],
            },
          ],
        },
        {
          title: "Hardware & Montagem de PC",
          description: "Perguntas de fixação sobre componentes internos de um computador.",
          category: "Hardware",
          questions: [
            {
              text: "Qual componente é responsável por fornecer energia elétrica a todas as peças do computador?",
              timeLimit: 20,
              points: 1000,
              options: [
                { text: "Fonte de Alimentação (PSU)", isCorrect: true, letter: "A" },
                { text: "Placa de Vídeo (GPU)", isCorrect: false, letter: "B" },
                { text: "Disco Rígido (HD)", isCorrect: false, letter: "C" },
                { text: "Placa de Som", isCorrect: false, letter: "D" },
              ],
            },
            {
              text: "Onde o processador deve ser instalado na placa-mãe?",
              timeLimit: 15,
              points: 1000,
              options: [
                { text: "No Soquete (Socket)", isCorrect: true, letter: "A" },
                { text: "No slot PCIe", isCorrect: false, letter: "B" },
                { text: "No slot de RAM", isCorrect: false, letter: "C" },
                { text: "Na porta SATA", isCorrect: false, letter: "D" },
              ],
            },
            {
              text: "Qual elemento é aplicado entre o processador e o cooler para melhorar a condução de calor?",
              timeLimit: 20,
              points: 1000,
              options: [
                { text: "Pasta Térmica", isCorrect: true, letter: "A" },
                { text: "Cola Quente", isCorrect: false, letter: "B" },
                { text: "Fita Isolante", isCorrect: false, letter: "C" },
                { text: "Óleo Lubrificante", isCorrect: false, letter: "D" },
              ],
            },
          ],
        },
      ];

      for (const tpl of defaultTemplates) {
        const quizRes = await pool.query(
          `INSERT INTO quiz_quizzes (title, description, category, is_template)
           VALUES ($1, $2, $3, TRUE) RETURNING id`,
          [tpl.title, tpl.description, tpl.category]
        );
        const quizId = quizRes.rows[0].id;

        let orderIdx = 0;
        for (const q of tpl.questions) {
          const qRes = await pool.query(
            `INSERT INTO quiz_questions (quiz_id, question_text, time_limit_seconds, points_multiplier, order_index)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [quizId, q.text, q.timeLimit, q.points, orderIdx++]
          );
          const questionId = qRes.rows[0].id;

          for (const opt of q.options) {
            await pool.query(
              `INSERT INTO quiz_options (question_id, option_text, is_correct, option_letter)
               VALUES ($1, $2, $3, $4)`,
              [questionId, opt.text, opt.isCorrect, opt.letter]
            );
          }
        }
      }
    } catch (err) {
      console.error("Erro ao inserir templates do Quiz Arena:", err);
    }
  };

  // --- Rotas da API ---

  // Listar Quizzes (Modelos + Criados pelo professor)
  app.get("/api/quiz/quizzes", requireAuth, async (req, res, next) => {
    try {
      await ensureDefaultTemplates();
      const result = await pool.query(
        `SELECT q.id, q.title, q.description, q.category, q.is_template, q.created_at,
                COUNT(DISTINCT qk.id)::int as question_count
         FROM quiz_quizzes q
         LEFT JOIN quiz_questions qk ON qk.quiz_id = q.id
         WHERE q.is_template = TRUE OR q.created_by_user_id = $1
         GROUP BY q.id
         ORDER BY q.is_template DESC, q.created_at DESC`,
        [req.user.id]
      );
      return res.json({ quizzes: result.rows });
    } catch (error) {
      return next(error);
    }
  });

  // Obter detalhes de um Quiz (com perguntas e opções)
  app.get("/api/quiz/quizzes/:id", requireAuth, async (req, res, next) => {
    try {
      const id = normalizeUuid(req.params.id, "quizId");
      const quizRes = await pool.query(
        `SELECT id, title, description, category, is_template, created_at FROM quiz_quizzes WHERE id = $1`,
        [id]
      );
      if (quizRes.rowCount === 0) {
        return res.status(404).json({ error: "Quiz não encontrado." });
      }

      const questionsRes = await pool.query(
        `SELECT id, question_text, time_limit_seconds, points_multiplier, order_index
         FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC`,
        [id]
      );

      const questions = [];
      for (const q of questionsRes.rows) {
        const optionsRes = await pool.query(
          `SELECT id, option_text, is_correct, option_letter
           FROM quiz_options WHERE question_id = $1 ORDER BY option_letter ASC`,
          [q.id]
        );
        questions.push({
          ...q,
          options: optionsRes.rows,
        });
      }

      return res.json({ quiz: quizRes.rows[0], questions });
    } catch (error) {
      return next(error);
    }
  });

  // Criar um novo Quiz personalizado (apenas professor)
  app.post("/api/quiz/quizzes", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "professor") {
        return res.status(403).json({ error: "Apenas professores podem criar novos quizzes." });
      }

      const { title, description, category, questions } = req.body;
      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Título do quiz é obrigatório." });
      }
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Adicione ao menos uma pergunta ao quiz." });
      }

      const quizRes = await pool.query(
        `INSERT INTO quiz_quizzes (title, description, category, is_template, created_by_user_id)
         VALUES ($1, $2, $3, FALSE, $4) RETURNING id`,
        [title.trim(), (description || "").trim(), (category || "Geral").trim(), req.user.id]
      );
      const quizId = quizRes.rows[0].id;

      let orderIdx = 0;
      for (const q of questions) {
        if (!q.text || !Array.isArray(q.options) || q.options.length < 2) {
          continue;
        }
        const qRes = await pool.query(
          `INSERT INTO quiz_questions (quiz_id, question_text, time_limit_seconds, points_multiplier, order_index)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [quizId, q.text.trim(), Number(q.timeLimitSeconds) || 20, Number(q.pointsMultiplier) || 1000, orderIdx++]
        );
        const questionId = qRes.rows[0].id;

        const letters = ["A", "B", "C", "D"];
        let letterIdx = 0;
        for (const opt of q.options) {
          const letter = letters[letterIdx++] || "A";
          await pool.query(
            `INSERT INTO quiz_options (question_id, option_text, is_correct, option_letter)
             VALUES ($1, $2, $3, $4)`,
            [questionId, (opt.text || "").trim(), Boolean(opt.isCorrect), letter]
          );
        }
      }

      return res.status(201).json({ id: quizId, message: "Quiz criado com sucesso!" });
    } catch (error) {
      return next(error);
    }
  });

  // Criar uma nova Sessão ao vivo na Turma (apenas professor)
  app.post("/api/quiz/sessions", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "professor") {
        return res.status(403).json({ error: "Apenas professores podem iniciar uma sala de quiz." });
      }
      const { quizId, turmaId } = req.body;
      const validQuizId = normalizeUuid(quizId, "quizId");
      const targetTurmaId = turmaId ? normalizeUuid(turmaId, "turmaId") : req.user.turmaId;

      if (!targetTurmaId) {
        return res.status(400).json({ error: "O professor deve selecionar uma turma para o quiz." });
      }

      // Buscar quiz e perguntas
      const quizRes = await pool.query(
        `SELECT id, title, description, category FROM quiz_quizzes WHERE id = $1`,
        [validQuizId]
      );
      if (quizRes.rowCount === 0) {
        return res.status(404).json({ error: "Quiz não encontrado." });
      }

      const questionsRes = await pool.query(
        `SELECT id, question_text, time_limit_seconds, points_multiplier, order_index
         FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC`,
        [validQuizId]
      );
      if (questionsRes.rowCount === 0) {
        return res.status(400).json({ error: "Este quiz não possui perguntas salvas." });
      }

      const questions = [];
      for (const q of questionsRes.rows) {
        const optionsRes = await pool.query(
          `SELECT id, option_text, is_correct, option_letter
           FROM quiz_options WHERE question_id = $1 ORDER BY option_letter ASC`,
          [q.id]
        );
        questions.push({
          ...q,
          options: optionsRes.rows,
        });
      }

      // Inserir registro de sessão no banco
      const sessionRes = await pool.query(
        `INSERT INTO quiz_sessions (quiz_id, turma_id, host_user_id, status, current_question_index)
         VALUES ($1, $2, $3, 'LOBBY', 0) RETURNING id, status, started_at`,
        [validQuizId, targetTurmaId, req.user.id]
      );
      const session = sessionRes.rows[0];

      // Instanciar em memória
      const live = {
        id: session.id,
        quiz: quizRes.rows[0],
        turmaId: targetTurmaId,
        hostUserId: req.user.id,
        hostName: req.user.displayName || req.user.username,
        status: "LOBBY",
        currentQuestionIndex: 0,
        questions,
        questionStartTime: null,
        responsesMap: new Map(), // key: `questionId:userId` -> response object
        connectedPlayers: new Map(), // key: `userId` -> { id, username, displayName }
        clients: new Set(),
      };
      liveSessions.set(session.id, live);

      // Notificar alunos da turma sobre nova sala de quiz
      sendUserNotification?.(targetTurmaId, {
        source: "quiz",
        title: "Arena de Quiz Iniciada!",
        body: `O professor iniciou a sala "${quizRes.rows[0].title}". Entre já!`,
        action: { type: "open-quiz", sessionId: session.id },
      });

      return res.status(201).json({ session: { id: session.id, quizTitle: quizRes.rows[0].title, status: "LOBBY" } });
    } catch (error) {
      return next(error);
    }
  });

  // Buscar sessão ativa para a turma do usuário
  app.get("/api/quiz/sessions/active", requireAuth, async (req, res, next) => {
    try {
      const userTurmaId = req.user.turmaId;
      for (const [, live] of liveSessions) {
        if (live.status !== "FINISHED" && (live.turmaId === userTurmaId || req.user.role === "professor")) {
          return res.json({
            activeSession: {
              id: live.id,
              quizTitle: live.quiz.title,
              status: live.status,
              turmaId: live.turmaId,
              hostName: live.hostName,
            },
          });
        }
      }
      return res.json({ activeSession: null });
    } catch (error) {
      return next(error);
    }
  });

  // Conexão SSE para streaming da partida
  app.get("/api/quiz/sessions/:id/stream", requireAuth, (req, res) => {
    try {
      const id = normalizeUuid(req.params.id, "sessionId");
      const live = liveSessions.get(id);

      if (!live) {
        return res.status(404).json({ error: "Sessão de quiz não encontrada ou encerrada." });
      }

      // Validação de isolamento por turma para alunos
      if (req.user.role !== "professor" && req.user.turmaId !== live.turmaId) {
        return res.status(403).json({ error: "Você não pertence à turma desta partida de Quiz." });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Adicionar jogador à lista de conectados
      live.connectedPlayers.set(req.user.id, {
        id: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName || req.user.username,
      });
      live.clients.add(res);

      req.on("close", () => {
        live.clients.delete(res);
      });

      // Sanitizar pergunta para não expor resposta correta durante QUESTION_ACTIVE ou LOBBY
      const currentQ = live.questions[live.currentQuestionIndex];
      const isRevealMode = live.status === "REVEAL_ANSWER" || live.status === "PODIUM_FINAL";
      const sanitizedQuestion = currentQ
        ? {
            id: currentQ.id,
            questionText: currentQ.question_text,
            timeLimitSeconds: currentQ.time_limit_seconds,
            orderIndex: currentQ.order_index,
            options: currentQ.options.map((opt) => ({
              id: opt.id,
              optionText: opt.option_text,
              optionLetter: opt.option_letter,
              ...(isRevealMode ? { isCorrect: opt.is_correct } : {}),
            })),
          }
        : null;

      const initialPayload = {
        type: "SYNC_STATE",
        sessionId: live.id,
        quizTitle: live.quiz.title,
        status: live.status,
        currentQuestionIndex: live.currentQuestionIndex,
        totalQuestions: live.questions.length,
        currentQuestion: sanitizedQuestion,
        questionStartTime: live.questionStartTime,
        players: Array.from(live.connectedPlayers.values()),
        leaderboard: getSessionLeaderboard(live),
      };

      res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

      // Notificar os demais clientes que um novo jogador se conectou
      broadcastSessionEvent(id, {
        type: "PLAYERS_UPDATE",
        players: Array.from(live.connectedPlayers.values()),
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Avançar pergunta ou fase (Apenas Host / Professor)
  app.post("/api/quiz/sessions/:id/advance", requireAuth, async (req, res, next) => {
    try {
      const id = normalizeUuid(req.params.id, "sessionId");
      const live = liveSessions.get(id);

      if (!live) {
        return res.status(404).json({ error: "Sessão não encontrada." });
      }
      if (live.hostUserId !== req.user.id) {
        return res.status(403).json({ error: "Apenas o host pode controlar a partida." });
      }

      const { action } = req.body; // 'START', 'NEXT_QUESTION', 'REVEAL_ANSWER', 'FINISH'

      if (action === "START" || action === "NEXT_QUESTION") {
        if (action === "NEXT_QUESTION") {
          live.currentQuestionIndex += 1;
        }
        if (live.currentQuestionIndex >= live.questions.length) {
          return res.status(400).json({ error: "Não há mais perguntas neste quiz." });
        }

        live.status = "QUESTION_ACTIVE";
        live.questionStartTime = Date.now();

        const currentQ = live.questions[live.currentQuestionIndex];
        const sanitizedQuestion = {
          id: currentQ.id,
          questionText: currentQ.question_text,
          timeLimitSeconds: currentQ.time_limit_seconds,
          orderIndex: currentQ.order_index,
          options: currentQ.options.map((opt) => ({
            id: opt.id,
            optionText: opt.option_text,
            optionLetter: opt.option_letter,
          })),
        };

        broadcastSessionEvent(id, {
          type: "QUESTION_START",
          currentQuestionIndex: live.currentQuestionIndex,
          totalQuestions: live.questions.length,
          question: sanitizedQuestion,
          questionStartTime: live.questionStartTime,
        });

        return res.json({ status: live.status, currentQuestionIndex: live.currentQuestionIndex });
      }

      if (action === "REVEAL_ANSWER") {
        live.status = "REVEAL_ANSWER";
        const currentQ = live.questions[live.currentQuestionIndex];

        // Estatísticas de opções escolhidas para o gráfico do professor
        const optionStats = {};
        for (const opt of currentQ.options) {
          optionStats[opt.id] = 0;
        }

        for (const [, resp] of live.responsesMap) {
          if (resp.questionId === currentQ.id && resp.selectedOptionId) {
            optionStats[resp.selectedOptionId] = (optionStats[resp.selectedOptionId] || 0) + 1;
          }
        }

        const fullOptionsWithCorrect = currentQ.options.map((opt) => ({
          id: opt.id,
          optionText: opt.option_text,
          optionLetter: opt.option_letter,
          isCorrect: opt.is_correct,
          count: optionStats[opt.id] || 0,
        }));

        broadcastSessionEvent(id, {
          type: "REVEAL_ANSWER",
          options: fullOptionsWithCorrect,
          leaderboard: getSessionLeaderboard(live),
        });

        return res.json({ status: live.status });
      }

      if (action === "FINISH") {
        live.status = "FINISHED";
        const finalLeaderboard = getSessionLeaderboard(live);

        // Persistir partida e atualizar rankings no banco
        await pool.query(
          `UPDATE quiz_sessions SET status = 'FINISHED', ended_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [id]
        );

        for (let i = 0; i < finalLeaderboard.length; i++) {
          const player = finalLeaderboard[i];
          const isFirstPlace = i === 0 ? 1 : 0;

          await pool.query(
            `INSERT INTO quiz_rankings (user_id, turma_id, total_points, quizzes_played, correct_answers_count, first_place_count)
             VALUES ($1, $2, $3, 1, $4, $5)
             ON CONFLICT (user_id, turma_id) DO UPDATE SET
               total_points = quiz_rankings.total_points + EXCLUDED.total_points,
               quizzes_played = quiz_rankings.quizzes_played + 1,
               correct_answers_count = quiz_rankings.correct_answers_count + EXCLUDED.correct_answers_count,
               first_place_count = quiz_rankings.first_place_count + EXCLUDED.first_place_count,
               updated_at = CURRENT_TIMESTAMP`,
            [player.userId, live.turmaId, player.totalPoints, player.correctCount, isFirstPlace]
          );
        }

        broadcastSessionEvent(id, {
          type: "PODIUM_FINAL",
          leaderboard: finalLeaderboard,
        });

        return res.json({ status: live.status, leaderboard: finalLeaderboard });
      }

      return res.status(400).json({ error: "Ação de transição inválida." });
    } catch (error) {
      return next(error);
    }
  });

  // Enviar resposta do aluno para a pergunta ativa
  app.post("/api/quiz/sessions/:id/answer", requireAuth, async (req, res, next) => {
    try {
      const id = normalizeUuid(req.params.id, "sessionId");
      const live = liveSessions.get(id);

      if (!live) {
        return res.status(404).json({ error: "Sessão não encontrada." });
      }

      if (req.user.role !== "professor" && req.user.turmaId !== live.turmaId) {
        return res.status(403).json({ error: "Você não pertence à turma desta partida." });
      }

      if (live.status !== "QUESTION_ACTIVE") {
        return res.status(400).json({ error: "A pergunta atual não está recebendo respostas." });
      }

      const { selectedOptionId } = req.body;
      const validOptionId = selectedOptionId ? normalizeUuid(selectedOptionId, "selectedOptionId") : null;
      const currentQ = live.questions[live.currentQuestionIndex];
      const key = `${currentQ.id}:${req.user.id}`;

      if (live.responsesMap.has(key)) {
        return res.status(409).json({ error: "Você já respondeu a esta pergunta." });
      }

      const responseTimeMs = live.questionStartTime
        ? Math.max(0, Date.now() - live.questionStartTime)
        : 0;

      const selectedOpt = currentQ.options.find((opt) => opt.id === validOptionId);
      const isCorrect = selectedOpt ? Boolean(selectedOpt.is_correct) : false;

      let pointsEarned = 0;
      if (isCorrect) {
        const timeLimitMs = (currentQ.time_limit_seconds || 20) * 1000;
        const timeFraction = Math.max(0, Math.min(1, responseTimeMs / timeLimitMs));
        const speedBonusFactor = 1 - timeFraction * 0.5; // Garante pelo menos 50% dos pontos se acertar
        pointsEarned = Math.round((currentQ.points_multiplier || 1000) * speedBonusFactor);
      }

      const responseData = {
        userId: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName || req.user.username,
        questionId: currentQ.id,
        selectedOptionId: validOptionId,
        responseTimeMs,
        isCorrect,
        pointsEarned,
      };

      live.responsesMap.set(key, responseData);

      // Inserir registro individual no banco
      await pool.query(
        `INSERT INTO quiz_responses (session_id, question_id, user_id, selected_option_id, response_time_ms, is_correct, points_earned)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id, question_id, user_id) DO NOTHING`,
        [id, currentQ.id, req.user.id, validOptionId, responseTimeMs, isCorrect, pointsEarned]
      );

      // Notificar o Host sobre novo envio de resposta (contador ao vivo)
      const currentQuestionResponsesCount = Array.from(live.responsesMap.values()).filter(
        (r) => r.questionId === currentQ.id
      ).length;

      broadcastSessionEvent(id, {
        type: "ANSWER_COUNT",
        count: currentQuestionResponsesCount,
        totalPlayers: live.connectedPlayers.size,
      });

      return res.json({
        isCorrect,
        pointsEarned,
        message: isCorrect ? "Resposta correta!" : "Resposta incorreta.",
      });
    } catch (error) {
      return next(error);
    }
  });

  // Obter Rankings (Global e Por Turma)
  app.get("/api/quiz/rankings", requireAuth, async (req, res, next) => {
    try {
      const { turmaId } = req.query;
      const rawTurmaId = turmaId || req.user.turmaId;
      const filterTurmaId = rawTurmaId ? normalizeUuid(rawTurmaId, "turmaId") : null;

      // Ranking da Turma
      let turmaRankings = [];
      if (filterTurmaId) {
        const turmaRes = await pool.query(
          `SELECT r.user_id, u.display_name, u.username, r.total_points, r.quizzes_played, r.first_place_count
           FROM quiz_rankings r
           JOIN users u ON u.id = r.user_id
           WHERE r.turma_id = $1
           ORDER BY r.total_points DESC, r.first_place_count DESC
           LIMIT 20`,
          [filterTurmaId]
        );
        turmaRankings = turmaRes.rows;
      }

      // Ranking Global
      const globalRes = await pool.query(
        `SELECT r.user_id, u.display_name, u.username, SUM(r.total_points)::int as total_points,
                SUM(r.quizzes_played)::int as quizzes_played, SUM(r.first_place_count)::int as first_place_count
         FROM quiz_rankings r
         JOIN users u ON u.id = r.user_id
         GROUP BY r.user_id, u.display_name, u.username
         ORDER BY total_points DESC, first_place_count DESC
         LIMIT 20`
      );

      return res.json({
        turmaRankings,
        globalRankings: globalRes.rows,
      });
    } catch (error) {
      return next(error);
    }
  });
};
