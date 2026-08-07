import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import "./quizArena.scss";

export function QuizArenaApp() {
  const app = useSelector((state) => state.apps.quiz);
  const person = useSelector((state) => state.setting.person) || {};

  const [activeTab, setActiveTab] = useState("lobby"); // 'lobby', 'ranking', 'create'
  const [quizzes, setQuizzes] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [rankings, setRankings] = useState({ turmaRankings: [], globalRankings: [] });
  const [rankingTab, setRankingTab] = useState("turma"); // 'turma' or 'global'
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [lastAnswerResult, setLastAnswerResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Formulário de criação de Quiz (para professores)
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizCategory, setNewQuizCategory] = useState("Informática");
  const [newQuizDesc, setNewQuizDesc] = useState("");
  const [newQuestions, setNewQuestions] = useState([
    {
      text: "",
      timeLimitSeconds: 20,
      pointsMultiplier: 1000,
      options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
    },
  ]);

  // Carregar lista de quizzes
  const loadQuizzes = useCallback(async () => {
    try {
      const data = await api.getQuizQuizzes();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      console.error("Erro ao carregar quizzes:", err);
    }
  }, []);

  // Verificar se há partida ativa
  const checkActiveSession = useCallback(async () => {
    try {
      const data = await api.getActiveQuizSession();
      if (data.activeSession) {
        setActiveSession(data.activeSession);
      } else {
        setActiveSession(null);
        setSessionState(null);
      }
    } catch (err) {
      console.error("Erro ao verificar sessão ativa:", err);
    }
  }, []);

  // Carregar rankings
  const loadRankings = useCallback(async () => {
    try {
      const data = await api.getQuizRankings(person.turmaId);
      setRankings({
        turmaRankings: data.turmaRankings || [],
        globalRankings: data.globalRankings || [],
      });
    } catch (err) {
      console.error("Erro ao carregar rankings:", err);
    }
  }, [person.turmaId]);

  useEffect(() => {
    if (!app || app.hide) return;
    loadQuizzes();
    checkActiveSession();
    loadRankings();
  }, [app, loadQuizzes, checkActiveSession, loadRankings]);

  // Gerenciamento da Conexão SSE (Ativa apenas quando a janela está visível)
  useEffect(() => {
    if (!app || app.hide || !activeSession) return;

    const eventSource = new EventSource(`/api/quiz/sessions/${activeSession.id}/stream`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "SYNC_STATE") {
          setSessionState(payload);
        } else if (payload.type === "QUESTION_START") {
          setSessionState((prev) => ({
            ...prev,
            status: "QUESTION_ACTIVE",
            currentQuestionIndex: payload.currentQuestionIndex,
            totalQuestions: payload.totalQuestions,
            currentQuestion: payload.question,
            questionStartTime: payload.questionStartTime,
          }));
          setSelectedOptionId(null);
          setLastAnswerResult(null);
        } else if (payload.type === "ANSWER_COUNT") {
          setSessionState((prev) => ({
            ...prev,
            answerCount: payload.count,
            totalPlayers: payload.totalPlayers,
          }));
        } else if (payload.type === "REVEAL_ANSWER") {
          setSessionState((prev) => ({
            ...prev,
            status: "REVEAL_ANSWER",
            revealedOptions: payload.options,
            leaderboard: payload.leaderboard,
          }));
        } else if (payload.type === "PODIUM_FINAL") {
          setSessionState((prev) => ({
            ...prev,
            status: "PODIUM_FINAL",
            leaderboard: payload.leaderboard,
          }));
          loadRankings();
        } else if (payload.type === "PLAYERS_UPDATE") {
          setSessionState((prev) => ({
            ...prev,
            players: payload.players,
          }));
        }
      } catch (err) {
        console.error("Erro ao processar evento SSE do Quiz:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Erro na conexão SSE do Quiz Arena:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [app, activeSession, loadRankings]);

  // Criar nova sala ao vivo
  const handleStartSession = async (quizId) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await api.createQuizSession({ quizId, turmaId: person.turmaId });
      setActiveSession(data.session);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao iniciar partida.");
    } finally {
      setLoading(false);
    }
  };

  // Avançar estado da partida (Host / Professor)
  const handleAdvance = async (action) => {
    if (!activeSession) return;
    try {
      await api.advanceQuizSession(activeSession.id, action);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao avançar partida.");
    }
  };

  // Enviar resposta (Aluno)
  const handleAnswerSubmit = async (optId) => {
    if (!activeSession || selectedOptionId) return;
    setSelectedOptionId(optId);
    try {
      const res = await api.submitQuizAnswer(activeSession.id, optId);
      setLastAnswerResult(res);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao enviar resposta.");
    }
  };

  // Salvar novo Quiz (Professor)
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      await api.createQuiz({
        title: newQuizTitle,
        category: newQuizCategory,
        description: newQuizDesc,
        questions: newQuestions,
      });
      setNewQuizTitle("");
      setNewQuizDesc("");
      setActiveTab("lobby");
      loadQuizzes();
    } catch (err) {
      setErrorMsg(err.message || "Erro ao criar quiz.");
    }
  };

  if (!app || app.hide) return null;

  const isProfessor = person.role === "professor";
  const isInActiveMatch = Boolean(activeSession && sessionState);

  return (
    <AppWindow appId="quiz" title="WindQuiz Arena - Game Show da Turma" icon="quiz">
      <div className="quizArenaApp">
        <header className="quizHeader">
          <div className="quizTitleGroup">
            <span className="quizBadge">Game Show</span>
            <h2>WindQuiz Arena</h2>
          </div>

          {!isInActiveMatch && (
            <nav className="quizNavTabs">
              <button
                className={activeTab === "lobby" ? "active" : ""}
                onClick={() => setActiveTab("lobby")}
              >
                Partidas & Quizzes
              </button>
              <button
                className={activeTab === "ranking" ? "active" : ""}
                onClick={() => setActiveTab("ranking")}
              >
                Rankings
              </button>
              {isProfessor && (
                <button
                  className={activeTab === "create" ? "active" : ""}
                  onClick={() => setActiveTab("create")}
                >
                  + Criar Quiz
                </button>
              )}
            </nav>
          )}
        </header>

        <div className="quizContentArea">
          {errorMsg && (
            <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.2)", border: "1px solid #ef4444", borderRadius: "0.5rem", color: "#f87171", marginBottom: "1rem" }}>
              {errorMsg}
            </div>
          )}

          {/* MODO PARTIDA EM TEMPO REAL */}
          {isInActiveMatch ? (
            sessionState.status === "PODIUM_FINAL" ? (
              <QuizPodiumView leaderboard={sessionState.leaderboard || []} onLeave={() => setActiveSession(null)} />
            ) : isProfessor ? (
              <TeacherHostView
                sessionState={sessionState}
                onAdvance={handleAdvance}
              />
            ) : (
              <StudentPlayerView
                sessionState={sessionState}
                selectedOptionId={selectedOptionId}
                lastAnswerResult={lastAnswerResult}
                onAnswer={handleAnswerSubmit}
              />
            )
          ) : (
            <>
              {/* TAB LOBBY */}
              {activeTab === "lobby" && (
                <div className="quizLobbyContainer">
                  <div className="bannerCard">
                    <div>
                      <h3>Arena de Perguntas ao Vivo</h3>
                      <p>Responda com precisão e velocidade para liderar o ranking da turma!</p>
                    </div>
                  </div>

                  {activeSession && (
                    <div className="activeSessionAlert">
                      <div>
                        <strong>Partida em andamento!</strong>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                          Organizada por {activeSession.hostName} ({activeSession.quizTitle})
                        </p>
                      </div>
                      <button className="btnJoin" onClick={checkActiveSession}>
                        Entrar na Sala
                      </button>
                    </div>
                  )}

                  <div className="sectionTitle">Quizzes Disponíveis</div>
                  <div className="quizGrid">
                    {quizzes.map((q) => (
                      <div key={q.id} className="quizCard">
                        <div>
                          <span className="cardCategory">{q.category}</span>
                          <h4>{q.title}</h4>
                          <p>{q.description || "Perguntas de fixação para a turma."}</p>
                        </div>
                        <div className="cardFooter">
                          <span className="qCount">{q.question_count || 5} Perguntas</span>
                          {isProfessor && (
                            <button
                              className="btnStart"
                              disabled={loading}
                              onClick={() => handleStartSession(q.id)}
                            >
                              Iniciar Arena
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB RANKINGS */}
              {activeTab === "ranking" && (
                <div className="rankingTableContainer">
                  <div className="rankingHeaderTabs">
                    <button
                      className={rankingTab === "turma" ? "active" : ""}
                      onClick={() => setRankingTab("turma")}
                    >
                      Ranking da Turma
                    </button>
                    <button
                      className={rankingTab === "global" ? "active" : ""}
                      onClick={() => setRankingTab("global")}
                    >
                      Ranking Global
                    </button>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Aluno</th>
                        <th>Pontos Totais</th>
                        <th>Partidas</th>
                        <th>1º Lugares</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rankingTab === "turma" ? rankings.turmaRankings : rankings.globalRankings).map(
                        (item, idx) => (
                          <tr key={item.user_id}>
                            <td className="posCell">{idx + 1}º</td>
                            <td className="nameCell">{item.display_name || item.username}</td>
                            <td className="pointsCell">{item.total_points || 0} pts</td>
                            <td>{item.quizzes_played || 0}</td>
                            <td>{item.first_place_count || 0} 🏆</td>
                          </tr>
                        )
                      )}
                      {(rankingTab === "turma" ? rankings.turmaRankings : rankings.globalRankings).length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                            Nenhum ranking registrado ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB CRIAR QUIZ (PROFESSOR) */}
              {activeTab === "create" && isProfessor && (
                <form onSubmit={handleCreateQuiz} style={{ maxWidth: "700px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <h3>Criar Novo Quiz</h3>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>Título do Quiz</label>
                    <input
                      type="text"
                      required
                      value={newQuizTitle}
                      onChange={(e) => setNewQuizTitle(e.target.value)}
                      placeholder="Ex: Desafio de Lógica e Hardware"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>Descrição</label>
                    <input
                      type="text"
                      value={newQuizDesc}
                      onChange={(e) => setNewQuizDesc(e.target.value)}
                      placeholder="Breve resumo para os alunos"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                    />
                  </div>
                  <button type="submit" className="btnStart" style={{ padding: "0.8rem", fontSize: "1rem" }}>
                    Salvar Quiz
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </AppWindow>
  );
}

// Visão do Professor (Telão do Game Show)
function TeacherHostView({ sessionState, onAdvance }) {
  const currentQ = sessionState.currentQuestion;
  const isQuestionActive = sessionState.status === "QUESTION_ACTIVE";
  const isReveal = sessionState.status === "REVEAL_ANSWER";

  return (
    <div className="hostScreenContainer">
      <div className="hostTopBar">
        <div className="counterBox">
          <span>Respostas recebidas:</span>
          <strong>{sessionState.answerCount || 0} / {sessionState.players?.length || 1}</strong>
        </div>

        <div>
          {sessionState.status === "LOBBY" && (
            <button className="btnAction" onClick={() => onAdvance("START")}>
              ▶ Iniciar Partida
            </button>
          )}
          {isQuestionActive && (
            <button className="btnAction btnSecondary" onClick={() => onAdvance("REVEAL_ANSWER")}>
              🔍 Revelar Resposta
            </button>
          )}
          {isReveal && (
            <button className="btnAction" onClick={() => onAdvance("NEXT_QUESTION")}>
              ➔ Próxima Pergunta
            </button>
          )}
          {isReveal && sessionState.currentQuestionIndex >= (sessionState.totalQuestions - 1) && (
            <button className="btnAction" onClick={() => onAdvance("FINISH")}>
              🏆 Ver Pódio Final
            </button>
          )}
        </div>
      </div>

      {currentQ && (
        <div className="questionBigCard">
          <div className="questionNumber">
            Pergunta {sessionState.currentQuestionIndex + 1} de {sessionState.totalQuestions}
          </div>
          <div className="questionText">{currentQ.questionText}</div>
        </div>
      )}

      <div className="hostOptionsGrid">
        {(isReveal ? sessionState.revealedOptions : currentQ?.options || []).map((opt, idx) => {
          const optClasses = ["optA", "optB", "optC", "optD"];
          const optClass = optClasses[idx] || "optA";
          const isCorrect = opt.isCorrect;

          return (
            <div key={opt.id} className={`hostOptionCard ${optClass} ${isCorrect ? "isCorrectOpt" : ""}`}>
              <div className="letterBadge">{opt.optionLetter || String.fromCharCode(65 + idx)}</div>
              <div>{opt.optionText}</div>
              {isReveal && <div className="statCount">{opt.count || 0} votos</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Visão do Aluno (Controle do Jogador)
function StudentPlayerView({ sessionState, selectedOptionId, lastAnswerResult, onAnswer }) {
  const currentQ = sessionState.currentQuestion;
  const isQuestionActive = sessionState.status === "QUESTION_ACTIVE";
  const shapes = ["▲", "◆", "●", "■"];
  const btnClasses = ["btnA", "btnB", "btnC", "btnD"];

  return (
    <div className="playerScreenContainer">
      <div className="playerHeader">
        <div className="statusMsg">
          {sessionState.status === "LOBBY" && "Aguardando o professor iniciar..."}
          {isQuestionActive && !selectedOptionId && "Selecione a resposta rápida!"}
          {isQuestionActive && selectedOptionId && "Resposta enviada! Aguardando resultado..."}
          {sessionState.status === "REVEAL_ANSWER" && "Resultado da rodada:"}
        </div>
      </div>

      {isQuestionActive && (
        <div className="playerButtonsGrid">
          {currentQ?.options.map((opt, idx) => (
            <button
              key={opt.id}
              className={`btnPlayerOpt ${btnClasses[idx]}`}
              disabled={Boolean(selectedOptionId)}
              onClick={() => onAnswer(opt.id)}
            >
              <span className="shapeSymbol">{shapes[idx]}</span>
              <span className="btnText">{opt.optionText}</span>
            </button>
          ))}
        </div>
      )}

      {lastAnswerResult && (
        <div className={`feedbackBox ${lastAnswerResult.isCorrect ? "correct" : "wrong"}`}>
          <h3>{lastAnswerResult.isCorrect ? "Resposta Correta! 🎉" : "Ops! Resposta Incorreta ❌"}</h3>
          <p>+{lastAnswerResult.pointsEarned} pontos nesta rodada</p>
        </div>
      )}
    </div>
  );
}

// Pódio Final
function QuizPodiumView({ leaderboard, onLeave }) {
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  return (
    <div className="podiumContainer">
      <h2>🏆 Pódio Final da Arena 🏆</h2>

      <div className="podiumStage">
        {second && (
          <div className="podiumStep second">
            <div className="playerAvatar">{second.displayName}</div>
            <div className="scoreBadge">{second.totalPoints} pts</div>
            <div className="pillar">2º</div>
          </div>
        )}
        {first && (
          <div className="podiumStep first">
            <div className="playerAvatar">👑 {first.displayName}</div>
            <div className="scoreBadge">{first.totalPoints} pts</div>
            <div className="pillar">1º</div>
          </div>
        )}
        {third && (
          <div className="podiumStep third">
            <div className="playerAvatar">{third.displayName}</div>
            <div className="scoreBadge">{third.totalPoints} pts</div>
            <div className="pillar">3º</div>
          </div>
        )}
      </div>

      <button className="btnAction" onClick={onLeave}>
        Sair da Sala
      </button>
    </div>
  );
}
