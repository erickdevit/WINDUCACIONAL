import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import "./quizArena.scss";

export function QuizArenaApp() {
  const wnapp = useSelector((state) => state.apps.quiz || {});

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action || "QUIZARENAAPP"}
      icon="quiz"
      name="WindQuiz Arena"
      className="quizArenaAppWindow"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <QuizArenaView visible={!wnapp.hide} />
    </AppWindow>
  );
}

function QuizArenaView({ visible }) {
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
  const [successMsg, setSuccessMsg] = useState("");

  // Formulário dinâmico de criação de Quiz (para professores)
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizCategory, setNewQuizCategory] = useState("Informática");
  const [newQuizDesc, setNewQuizDesc] = useState("");
  const [newQuestions, setNewQuestions] = useState([
    {
      text: "",
      timeLimitSeconds: 20,
      pointsMultiplier: 1000,
      correctOptionIndex: 0,
      options: ["", "", "", ""],
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
    if (!visible) return;
    loadQuizzes();
    checkActiveSession();
    loadRankings();
  }, [visible, loadQuizzes, checkActiveSession, loadRankings]);

  // Gerenciamento da Conexão SSE (Ativa apenas quando a janela está visível)
  useEffect(() => {
    if (!visible || !activeSession) return;

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
  }, [visible, activeSession, loadRankings]);

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

  // Funções de manipulação do construtor de quizzes
  const handleAddQuestion = () => {
    setNewQuestions((prev) => [
      ...prev,
      {
        text: "",
        timeLimitSeconds: 20,
        pointsMultiplier: 1000,
        correctOptionIndex: 0,
        options: ["", "", "", ""],
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    setNewQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx, text) => {
    setNewQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], text };
      return copy;
    });
  };

  const handleQuestionTimeChange = (idx, timeLimitSeconds) => {
    setNewQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], timeLimitSeconds: Number(timeLimitSeconds) };
      return copy;
    });
  };

  const handleOptionTextChange = (qIdx, optIdx, text) => {
    setNewQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...copy[qIdx].options];
      newOpts[optIdx] = text;
      copy[qIdx] = { ...copy[qIdx], options: newOpts };
      return copy;
    });
  };

  const handleCorrectOptionChange = (qIdx, optIdx) => {
    setNewQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], correctOptionIndex: optIdx };
      return copy;
    });
  };

  // Salvar novo Quiz (Professor)
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const formattedQuestions = newQuestions.map((q) => ({
      text: q.text,
      timeLimitSeconds: q.timeLimitSeconds,
      pointsMultiplier: q.pointsMultiplier,
      options: q.options.map((optText, idx) => ({
        text: optText,
        isCorrect: idx === q.correctOptionIndex,
      })),
    }));

    try {
      await api.createQuiz({
        title: newQuizTitle,
        category: newQuizCategory,
        description: newQuizDesc,
        questions: formattedQuestions,
      });
      setSuccessMsg("Quiz salvo com sucesso!");
      setNewQuizTitle("");
      setNewQuizDesc("");
      setNewQuestions([
        {
          text: "",
          timeLimitSeconds: 20,
          pointsMultiplier: 1000,
          correctOptionIndex: 0,
          options: ["", "", "", ""],
        },
      ]);
      setActiveTab("lobby");
      loadQuizzes();
    } catch (err) {
      setErrorMsg(err.message || "Erro ao criar quiz.");
    }
  };

  const isProfessor = person.role === "professor";
  const isInActiveMatch = Boolean(activeSession && sessionState);

  return (
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
        {successMsg && (
          <div style={{ padding: "0.75rem", background: "rgba(34,197,94,0.2)", border: "1px solid #22c55e", borderRadius: "0.5rem", color: "#4ade80", marginBottom: "1rem" }}>
            {successMsg}
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
              <form onSubmit={handleCreateQuiz} style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3>Criar Novo Quiz Personalizado</h3>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>Título do Quiz</label>
                    <input
                      type="text"
                      required
                      value={newQuizTitle}
                      onChange={(e) => setNewQuizTitle(e.target.value)}
                      placeholder="Ex: Desafio de Hardware & Redes"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>Categoria</label>
                    <select
                      value={newQuizCategory}
                      onChange={(e) => setNewQuizCategory(e.target.value)}
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid rgba(255,255,255,0.2)", background: "#1e293b", color: "#fff" }}
                    >
                      <option value="Informática">Informática</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Sistemas">Sistemas</option>
                      <option value="Geral">Geral</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>Descrição</label>
                  <input
                    type="text"
                    value={newQuizDesc}
                    onChange={(e) => setNewQuizDesc(e.target.value)}
                    placeholder="Resumo didático sobre o tema da atividade"
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                  />
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "0.5rem 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "1.1rem" }}>Perguntas ({newQuestions.length})</h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "0.4rem 0.8rem", borderRadius: "0.4rem", cursor: "pointer", fontWeight: 700 }}
                  >
                    + Adicionar Pergunta
                  </button>
                </div>

                {newQuestions.map((q, qIdx) => (
                  <div key={qIdx} style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "#a855f7" }}>Pergunta {qIdx + 1}</strong>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <label style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                          Tempo:
                          <select
                            value={q.timeLimitSeconds}
                            onChange={(e) => handleQuestionTimeChange(qIdx, e.target.value)}
                            style={{ marginLeft: "0.4rem", padding: "0.2rem 0.4rem", borderRadius: "0.3rem", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
                          >
                            <option value={10}>10 seg</option>
                            <option value={15}>15 seg</option>
                            <option value={20}>20 seg</option>
                            <option value={30}>30 seg</option>
                          </select>
                        </label>
                        {newQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "none", padding: "0.3rem 0.6rem", borderRadius: "0.3rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      required
                      value={q.text}
                      onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                      placeholder="Digite o enunciado da pergunta..."
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff" }}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      {["A", "B", "C", "D"].map((letter, optIdx) => (
                        <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "0.4rem" }}>
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correctOptionIndex === optIdx}
                            onChange={() => handleCorrectOptionChange(qIdx, optIdx)}
                            title="Marcar como alternativa correta"
                            style={{ cursor: "pointer" }}
                          />
                          <span style={{ fontWeight: 800, width: "20px", color: letter === "A" ? "#ef4444" : letter === "B" ? "#3b82f6" : letter === "C" ? "#eab308" : "#22c55e" }}>
                            {letter}
                          </span>
                          <input
                            type="text"
                            required
                            value={q.options[optIdx]}
                            onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                            placeholder={`Opção ${letter}`}
                            style={{ flex: 1, padding: "0.4rem", borderRadius: "0.3rem", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(15,23,42,0.6)", color: "#fff", fontSize: "0.9rem" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button type="submit" className="btnStart" style={{ padding: "0.85rem", fontSize: "1.05rem", marginTop: "1rem" }}>
                  Salvar e Disponibilizar Quiz
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
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
          {isReveal && sessionState.currentQuestionIndex < (sessionState.totalQuestions - 1) && (
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
