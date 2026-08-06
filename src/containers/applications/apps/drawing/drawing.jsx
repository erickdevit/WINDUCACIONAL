import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { DrawingBoard, DrawingPreview } from "./DrawingBoard";
import "./drawing.scss";

const BACKGROUND_COLORS = ["#ffffff", "#fffaf0", "#f1f7ff", "#f3fbf7"];

const formatDate = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const ModeBadge = ({ mode }) => (
  <span className={`drawingModeBadge ${mode}`}>
    {mode === "chaos" ? "Caos coletivo" : "Desenhos individuais"}
  </span>
);

const EmptyState = ({ title, description, action }) => (
  <div className="drawingEmptyState">
    <span className="drawingEmptyArtwork" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
    <strong>{title}</strong>
    <p>{description}</p>
    {action}
  </div>
);

const ActivityThumbnail = ({ activity }) => (
  <div
    className="drawingHistoryThumbnail"
    style={{ backgroundColor: activity.backgroundColor }}
  >
    {activity.winnerStrokes?.length ? (
      <DrawingPreview
        strokes={activity.winnerStrokes}
        backgroundColor={activity.backgroundColor}
        label={`Desenho vencedor de ${activity.winnerName}`}
      />
    ) : (
      <div className="drawingHistoryPlaceholder">
        <span>{activity.mode === "chaos" ? "COLETIVO" : "ATIVIDADE"}</span>
        <strong>{activity.topic.charAt(0).toUpperCase()}</strong>
      </div>
    )}
  </div>
);

const StudentTile = ({ drawing, active, backgroundColor, onClick }) => (
  <button
    type="button"
    className={`drawingStudentTile ${active ? "active" : ""}`}
    data-started={drawing.started}
    onClick={onClick}
  >
    <div className="drawingStudentPreview" style={{ backgroundColor }}>
      {drawing.started ? (
        <DrawingPreview
          strokes={drawing.strokes}
          backgroundColor={backgroundColor}
          label={`Prévia de ${drawing.displayName}`}
        />
      ) : (
        <span>{drawing.displayName.charAt(0).toUpperCase()}</span>
      )}
      <i className="drawingStudentStatus" />
    </div>
    <span>
      <strong>{drawing.displayName}</strong>
      <small>{drawing.started ? `${drawing.strokeCount} traços` : "Aguardando"}</small>
    </span>
  </button>
);

const CreateActivity = ({ turmas, draft, busy, onDraftChange, onCreate, onPreview }) => {
  const handleSubmit = (event) => {
    event.preventDefault();
    onCreate(draft);
  };

  return (
    <div className="drawingCreateLayout">
      <section className="drawingPanel drawingCreatePanel">
        <div className="drawingSectionHeading">
          <div>
            <span className="drawingEyebrow">Configuração</span>
            <h2>Prepare a próxima rodada</h2>
            <p>Defina a turma, apresente o desafio e escolha como a sala participará.</p>
          </div>
          <span className="drawingStepBadge">1 atividade por turma</span>
        </div>

        {!turmas.length && (
          <div className="drawingNoClassNotice" role="status">
            <i />
            <span>
              <strong>Crie uma turma antes de começar.</strong>
              <small>As turmas ativas são carregadas das Configurações e definem exatamente quais alunos receberão o desafio.</small>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="drawingFormGrid">
            <label>
              <span>Turma participante</span>
              <select
                required
                value={draft.turmaId}
                onChange={(event) => onDraftChange({ turmaId: event.target.value })}
              >
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>{turma.nome}</option>
                ))}
              </select>
              <small>A atividade ficará visível somente para alunos desta turma.</small>
            </label>
            <label>
              <span>Palavra ou tema</span>
              <input
                required
                maxLength="120"
                value={draft.topic}
                onChange={(event) => onDraftChange({ topic: event.target.value })}
                placeholder="Ex.: cidade do futuro"
              />
              <small>{draft.topic.length}/120 caracteres</small>
            </label>
          </div>

          <label className="drawingInstructionsField">
            <span>Orientações para a turma <em>opcional</em></span>
            <textarea
              maxLength="500"
              rows="3"
              value={draft.instructions}
              onChange={(event) => onDraftChange({ instructions: event.target.value })}
              placeholder="Inclua detalhes, regras ou elementos que devem aparecer no desenho."
            />
          </label>

          <fieldset className="drawingModePicker">
            <legend>Como os alunos vão desenhar?</legend>
            <label className={draft.mode === "individual" ? "active" : ""}>
              <input
                type="radio"
                name="drawing-mode"
                value="individual"
                checked={draft.mode === "individual"}
                onChange={() => onDraftChange({ mode: "individual" })}
              />
              <span className="drawingModeIcon individual" aria-hidden="true"><i /><i /><i /></span>
              <span>
                <strong>Cada um no seu quadro</strong>
                <small>Acompanhe todos em mosaico e escolha um vencedor ao final.</small>
              </span>
              <b>Individual</b>
            </label>
            <label className={draft.mode === "chaos" ? "active" : ""}>
              <input
                type="radio"
                name="drawing-mode"
                value="chaos"
                checked={draft.mode === "chaos"}
                onChange={() => onDraftChange({ mode: "chaos" })}
              />
              <span className="drawingModeIcon chaos" aria-hidden="true"><i /><i /><i /></span>
              <span>
                <strong>Todos no mesmo quadro</strong>
                <small>Os traços chegam juntos, em tempo real, sem sobrescrever colegas.</small>
              </span>
              <b>Caos</b>
            </label>
          </fieldset>

          <fieldset className="drawingBackgroundPicker">
            <legend>Cor do quadro</legend>
            <div>
              {BACKGROUND_COLORS.map((color) => (
                <label key={color} className={draft.backgroundColor === color ? "active" : ""}>
                  <input
                    type="radio"
                    name="drawing-background"
                    value={color}
                    checked={draft.backgroundColor === color}
                    onChange={() => onDraftChange({ backgroundColor: color })}
                  />
                  <i style={{ backgroundColor: color }} />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="drawingCreateActions">
            <p><i /> Uma nova rodada encerra a atividade ativa da turma escolhida.</p>
            <div>
              <button type="button" className="drawingSecondaryButton" onClick={onPreview}>Abrir prévia</button>
              <button className="drawingPrimaryButton" disabled={busy || !draft.turmaId}>
                {busy ? "Criando atividade…" : "Iniciar atividade"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

const PreviewView = ({ preview, onEdit }) => {
  if (!preview) {
    return (
      <EmptyState
        title="Nenhuma atividade para visualizar"
        description="Preencha a configuração de uma nova atividade ou abra uma atividade existente para gerar a visão do aluno."
        action={<button className="drawingPrimaryButton" onClick={onEdit}>Configurar atividade</button>}
      />
    );
  }

  return (
    <div className="drawingPreviewView">
      <header className="drawingPreviewViewHeader">
        <div>
          <span className="drawingEyebrow">Visualização do professor</span>
          <h2>Prévia da tela do aluno</h2>
          <p>Confira o tema, as orientações e o quadro antes de iniciar a atividade.</p>
        </div>
        <button className="drawingSecondaryButton" onClick={onEdit}>Editar configuração</button>
      </header>

      <div className="drawingPreviewDevice">
        <div className="drawingPreviewDeviceBar">
          <i /><i /><i />
          <span>Visão do aluno · {preview.turmaName || "Turma selecionada"}</span>
        </div>
        <StudentView
          activity={{ ...preview, status: "active" }}
          drawing={{ strokes: [], strokeCount: 0, started: false }}
          busy={false}
          onCommit={() => {}}
        />
      </div>
    </div>
  );
};

const ProfessorLiveView = ({
  activity,
  activities = [],
  drawings,
  selectedStudentId,
  onSelectStudent,
  onSelectActivity,
  onClose,
  onChooseWinner,
  onCreate,
  busy,
}) => {
  const activeActivities = useMemo(
    () => activities.filter((item) => item.status === "active"),
    [activities]
  );

  if (!activity) {
    return (
      <EmptyState
        title="Nenhuma atividade está ao vivo"
        description="Inicie uma rodada para acompanhar a turma e receber os desenhos em tempo real."
        action={<button className="drawingPrimaryButton" onClick={onCreate}>Criar atividade</button>}
      />
    );
  }

  const selectedDrawing =
    activity.mode === "chaos"
      ? drawings[0]
      : drawings.find((item) => item.userId === selectedStudentId) || drawings[0];
  const startedCount = drawings.filter((item) => item.started).length;

  return (
    <div className="drawingLiveLayout">
      {activeActivities.length > 1 && (
        <div className="drawingMultiTurmasSelector" aria-label="Atividades ao vivo por turma">
          <span>Desafios ao vivo ({activeActivities.length}):</span>
          <div className="drawingMultiTurmasChips">
            {activeActivities.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`drawingTurmaChip ${item.id === activity.id ? "active" : ""}`}
                onClick={() => onSelectActivity(item.id)}
              >
                <i className="drawingLiveDotIndicator" />
                <strong>{item.turmaName}</strong>
                <small>{item.topic}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {activity.mode === "individual" && (
        <aside className="drawingRosterPanel drawingPanel">
          <div className="drawingRosterHeading">
            <div>
              <span className="drawingEyebrow">Mosaico da turma</span>
              <h2>Alunos</h2>
            </div>
            <strong>{startedCount}/{drawings.length}</strong>
          </div>
          <div className="drawingRosterProgress"><i style={{ width: `${drawings.length ? (startedCount / drawings.length) * 100 : 0}%` }} /></div>
          <div className="drawingStudentTiles win11Scroll">
            {drawings.map((drawing) => (
              <StudentTile
                key={drawing.userId}
                drawing={drawing}
                active={drawing.userId === selectedDrawing?.userId}
                backgroundColor={activity.backgroundColor}
                onClick={() => onSelectStudent(drawing.userId)}
              />
            ))}
          </div>
        </aside>
      )}

      <main className="drawingLiveMain">
        <section className="drawingLiveHero drawingPanel">
          <div>
            <div className="drawingLiveMeta">
              <span className={`drawingLiveDot ${activity.status}`}><i /> {activity.status === "active" ? "Ao vivo" : "Encerrada"}</span>
              <ModeBadge mode={activity.mode} />
              <span>{activity.turmaName}</span>
            </div>
            <h2>{activity.topic}</h2>
            {activity.instructions && <p>{activity.instructions}</p>}
          </div>
          <div className="drawingLiveActions">
            {activity.status === "active" && <button className="drawingSecondaryButton" onClick={onClose} disabled={busy}>Encerrar rodada</button>}
          </div>
        </section>

        <section className="drawingMonitorPanel drawingPanel">
          <div className="drawingMonitorHeading">
            <div>
              <span className="drawingEyebrow">Monitoramento em tempo real</span>
              <h3>{activity.mode === "chaos" ? "Quadro coletivo" : selectedDrawing?.displayName || "Selecione um aluno"}</h3>
            </div>
            {selectedDrawing?.started && <span className="drawingUpdatedBadge"><i /> Atualizado agora</span>}
          </div>
          <DrawingBoard
            strokes={selectedDrawing?.strokes || []}
            backgroundColor={activity.backgroundColor}
            readonly
          />
          {activity.mode === "individual" && !activity.winnerId && (
            <div className="drawingWinnerBar">
              <div>
                <strong>Pronto para decidir?</strong>
                <span>O vencedor ficará salvo no histórico da turma.</span>
              </div>
              <button
                className="drawingWinnerButton"
                disabled={!selectedDrawing?.started || busy}
                onClick={() => onChooseWinner(selectedDrawing)}
              >
                Escolher {selectedDrawing?.displayName || "vencedor"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const HistoryView = ({ activities, turmas, onOpen, onRepeat }) => {
  const [selectedTurmaTab, setSelectedTurmaTab] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  const closedActivities = useMemo(
    () => activities.filter((item) => item.status === "closed"),
    [activities]
  );

  const filteredHistory = useMemo(() => {
    return closedActivities.filter(
      (item) =>
        (!selectedTurmaTab || item.turmaId === selectedTurmaTab) &&
        (!modeFilter || item.mode === modeFilter)
    );
  }, [closedActivities, selectedTurmaTab, modeFilter]);

  const winnerCount = filteredHistory.filter((item) => item.winnerId).length;
  const participantTotal = filteredHistory.reduce((sum, item) => sum + item.drawingCount, 0);

  const groupedByTurma = useMemo(() => {
    const map = new Map();
    filteredHistory.forEach((item) => {
      const key = item.turmaId || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          turmaId: item.turmaId,
          turmaName: item.turmaName || "Turma",
          items: [],
        });
      }
      map.get(key).items.push(item);
    });
    return Array.from(map.values());
  }, [filteredHistory]);

  return (
    <div className="drawingHistoryView">
      <section className="drawingHistorySummary">
        <article>
          <span>Atividades concluídas</span>
          <strong>{filteredHistory.length}</strong>
          <small>no filtro atual</small>
        </article>
        <article>
          <span>Vencedores escolhidos</span>
          <strong>{winnerCount}</strong>
          <small>galeria individual</small>
        </article>
        <article>
          <span>Desenhos recebidos</span>
          <strong>{participantTotal}</strong>
          <small>participações registradas</small>
        </article>
      </section>

      <section className="drawingPanel drawingHistoryPanel">
        <div className="drawingHistoryHeader">
          <div>
            <span className="drawingEyebrow">Memória das turmas</span>
            <h2>Histórico de atividades e vencedores</h2>
            <p>Revisite desafios anteriores organizados por turma, abra os desenhos ou repita uma proposta.</p>
          </div>
          <div className="drawingHistoryFilters">
            <select
              value={selectedTurmaTab}
              onChange={(event) => setSelectedTurmaTab(event.target.value)}
              aria-label="Filtrar histórico por turma"
            >
              <option value="">Todas as turmas</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value)}
              aria-label="Filtrar histórico por modo"
            >
              <option value="">Todos os modos</option>
              <option value="individual">Individual</option>
              <option value="chaos">Caos coletivo</option>
            </select>
          </div>
        </div>

        <div className="drawingHistoryTurmaTabs" aria-label="Divisão por turma">
          <button
            type="button"
            className={selectedTurmaTab === "" ? "active" : ""}
            onClick={() => setSelectedTurmaTab("")}
          >
            Todas as turmas <b>{closedActivities.length}</b>
          </button>
          {turmas.map((turma) => {
            const count = closedActivities.filter((item) => item.turmaId === turma.id).length;
            if (count === 0) return null;
            return (
              <button
                type="button"
                key={turma.id}
                className={selectedTurmaTab === turma.id ? "active" : ""}
                onClick={() => setSelectedTurmaTab(turma.id)}
              >
                {turma.nome} <b>{count}</b>
              </button>
            );
          })}
        </div>

        {groupedByTurma.length ? (
          <div className="drawingHistoryTurmaGroups">
            {groupedByTurma.map((group) => (
              <div className="drawingHistoryTurmaGroupSection" key={group.turmaId}>
                <div className="drawingHistoryGroupHeader">
                  <span className="drawingTurmaGroupBadge">{group.turmaName}</span>
                  <small>
                    {group.items.length} atividade{group.items.length === 1 ? "" : "s"} encerrada{group.items.length === 1 ? "" : "s"}
                  </small>
                </div>
                <div className="drawingHistoryGrid">
                  {group.items.map((item) => (
                    <article className="drawingHistoryCard" key={item.id}>
                      <ActivityThumbnail activity={item} />
                      <div className="drawingHistoryCardBody">
                        <div>
                          <ModeBadge mode={item.mode} />
                          <time>{formatDate(item.closedAt || item.createdAt)}</time>
                        </div>
                        <h3>{item.topic}</h3>
                        <p>
                          {item.turmaName} · {item.drawingCount} desenho
                          {item.drawingCount === 1 ? "" : "s"}
                        </p>
                        {item.winnerName ? (
                          <strong className="drawingWinnerName">
                            <i /> Vencedor: {item.winnerName}
                          </strong>
                        ) : (
                          <span className="drawingNoWinner">
                            {item.mode === "chaos" ? "Criação coletiva" : "Sem vencedor escolhido"}
                          </span>
                        )}
                      </div>
                      <footer>
                        <button onClick={() => onOpen(item.id)}>Ver atividade</button>
                        <button onClick={() => onRepeat(item)}>Repetir</button>
                      </footer>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum resultado neste filtro"
            description="As atividades encerradas aparecerão aqui divididas por turma com seus desenhos e vencedores."
          />
        )}
      </section>
    </div>
  );
};

const StudentView = ({ activity, drawing, busy, onCommit }) => {
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  if (!activity) {
    return (
      <div className="drawingStudentWaiting">
        <EmptyState
          title="Aguardando um desafio"
          description="Quando o professor iniciar uma atividade para a sua turma, o tema e o quadro aparecerão automaticamente aqui."
        />
      </div>
    );
  }

  const isClosed = activity.status !== "active";

  return (
    <div className="drawingStudentViewFull">
      <header className="drawingStudentFloatingHeader">
        <div className="drawingStudentHeaderInfo">
          <span className={`drawingLiveDot ${isClosed ? "closed" : "active"}`}>
            <i /> {isClosed ? "Encerrada" : "Ao vivo"}
          </span>
          <ModeBadge mode={activity.mode} />
          <span className="drawingTurmaTag">{activity.turmaName}</span>
          <strong className="drawingTopicTitle">{activity.topic}</strong>
        </div>

        {activity.instructions && (
          <button
            type="button"
            className="drawingInstructionsToggleBtn"
            onClick={() => setShowInstructionsModal((prev) => !prev)}
          >
            <span>Orientações</span>
          </button>
        )}
      </header>

      {showInstructionsModal && activity.instructions && (
        <div className="drawingFloatingInstructionsModal">
          <div>
            <strong>Orientações do Professor</strong>
            <p>{activity.instructions}</p>
            <button
              type="button"
              className="drawingSecondaryButton"
              onClick={() => setShowInstructionsModal(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="drawingStudentCanvasContainer">
        <DrawingBoard
          strokes={drawing?.strokes || []}
          backgroundColor={activity.backgroundColor}
          collaborative={activity.mode === "chaos"}
          readonly={isClosed}
          busy={busy}
          onCommit={onCommit}
        />
      </div>
    </div>
  );
};

export const DrawingApp = () => {
  const wnapp = useSelector((state) => state.apps.drawing);
  const user = useSelector((state) => state.setting.person);
  const isProfessor = user.role === "professor";
  const [view, setView] = useState("live");
  const [turmas, setTurmas] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activity, setActivity] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [draft, setDraft] = useState({
    turmaId: "",
    topic: "",
    instructions: "",
    mode: "individual",
    backgroundColor: "#ffffff",
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activityRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [view]);

  const inspectActivity = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.getDrawingActivity(id);
      setActivity(result.activity);
      setSelectedActivityId(id);
      setDrawings(result.drawings || []);
      setSelectedStudentId((current) =>
        result.drawings?.some((item) => item.userId === current)
          ? current
          : result.drawings?.find((item) => item.started)?.userId ||
            result.drawings?.[0]?.userId ||
            ""
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfessor = useCallback(async () => {
    setError("");
    try {
      const [turmasResult, activitiesResult] = await Promise.all([
        api.getTurmas(),
        api.getDrawingActivities(),
      ]);
      const nextActivities = activitiesResult.activities || [];
      setTurmas(turmasResult.turmas || []);
      setDraft((current) => ({
        ...current,
        turmaId: current.turmaId || turmasResult.turmas?.[0]?.id || "",
      }));
      setActivities(nextActivities);

      const activeList = nextActivities.filter((item) => item.status === "active");
      const targetId =
        selectedActivityId && nextActivities.some((item) => item.id === selectedActivityId)
          ? selectedActivityId
          : activeList[0]?.id || nextActivities[0]?.id;

      if (targetId) {
        await inspectActivity(targetId);
      } else {
        setActivity(null);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [inspectActivity, selectedActivityId]);

  const loadStudent = useCallback(async () => {
    try {
      const result = await api.getDrawingActive();
      setActivity(result.activity);
      setDrawing(result.drawing);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    if (wnapp?.hide) return;
    if (isProfessor) loadProfessor();
    else loadStudent();
  }, [isProfessor, loadProfessor, loadStudent, wnapp?.hide]);

  useEffect(() => {
    if (isProfessor || wnapp?.hide) return undefined;
    const timer = setInterval(() => {
      if (activityRef.current?.status !== "active") loadStudent();
    }, 4000);
    return () => clearInterval(timer);
  }, [isProfessor, loadStudent, wnapp?.hide]);

  useEffect(() => {
    if (wnapp?.hide || !activity?.id || activity.status !== "active") {
      return undefined;
    }
    const subscription = api.subscribeDrawing(activity.id, {
      onEvent: (event) => {
        if (event.type === "strokes") {
          const nextDrawing = {
            userId: event.userId,
            displayName: event.displayName,
            strokes: event.strokes || [],
            strokeCount: event.strokes?.length || 0,
            updatedAt: event.updatedAt,
            started: true,
          };
          if (isProfessor) {
            setDrawings((current) => {
              if (activity.mode === "chaos") return [nextDrawing];
              return current.map((item) =>
                item.userId === event.userId ? nextDrawing : item
              );
            });
          } else {
            setDrawing(nextDrawing);
          }
        }
        if (event.type === "closed") {
          setActivity((current) => current && { ...current, status: "closed" });
        }
        if (event.type === "winner") {
          setActivity((current) => current && {
            ...current,
            status: "closed",
            winnerId: event.winnerId,
            winnerName: event.winnerName,
          });
        }
      },
      onError: () => {},
    });
    return () => subscription.close();
  }, [activity?.id, activity?.mode, activity?.status, isProfessor, wnapp?.hide]);

  const handleCreate = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const result = await api.createDrawingActivity(payload);
      setDraft((current) => ({
        ...current,
        topic: "",
        instructions: "",
      }));
      setView("live");
      await loadProfessor();
      await inspectActivity(result.activity.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!activity || !window.confirm("Encerrar esta atividade para toda a turma?")) return;
    setBusy(true);
    try {
      await api.closeDrawingActivity(activity.id);
      await loadProfessor();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleChooseWinner = async (selectedDrawing) => {
    if (!activity || !selectedDrawing?.userId) return;
    if (!window.confirm(`Escolher ${selectedDrawing.displayName} como vencedor?`)) return;
    setBusy(true);
    try {
      await api.chooseDrawingWinner(activity.id, selectedDrawing.userId);
      await loadProfessor();
      setView("history");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleStudentCommit = async (operation) => {
    if (!activity) return;
    const previous = drawing;
    const optimisticStrokes =
      operation.action === "append"
        ? operation.nextStrokes
        : operation.strokes || [];
    setDrawing((current) => ({
      ...(current || {}),
      strokes: optimisticStrokes,
      strokeCount: optimisticStrokes.length,
      started: true,
    }));
    setBusy(true);
    try {
      const payload =
        activity.mode === "chaos"
          ? { action: "append", stroke: operation.stroke }
          : operation.action === "clear"
          ? { action: "replace", strokes: [] }
          : { action: "replace", strokes: optimisticStrokes };
      const result = await api.saveDrawingStrokes(activity.id, payload);
      setDrawing((current) => ({
        ...(current || {}),
        strokes: result.strokes || optimisticStrokes,
        strokeCount: (result.strokes || optimisticStrokes).length,
        started: true,
      }));
      setError("");
    } catch (requestError) {
      setDrawing(previous);
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = activities.filter((item) => item.status === "active").length;
  const historyCount = activities.filter((item) => item.status === "closed").length;
  const previewSource = useMemo(() => {
    if (draft.topic.trim()) {
      return {
        ...draft,
        turmaName:
          turmas.find((item) => item.id === draft.turmaId)?.nome || "",
      };
    }
    return activity;
  }, [activity, draft, turmas]);

  if (!wnapp) return null;

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Desenho da Turma"
      className="drawingApp lightWindow"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="drawingWorkspace">
        <header className="drawingAppHeader">
          <div className="drawingBrand">
            <span className="drawingBrandMark" aria-hidden="true"><i /></span>
            <div>
              <strong>Desenho da Turma</strong>
              <small>{isProfessor ? "Estúdio do professor" : "Atividade criativa"}</small>
            </div>
          </div>
          {isProfessor && (
            <nav className="drawingMainNav" aria-label="Seções do aplicativo">
              <button className={view === "live" ? "active" : ""} onClick={() => setView("live")}><i className="live" />Painel{activeCount > 0 && <b>{activeCount}</b>}</button>
              <button className={view === "create" ? "active" : ""} onClick={() => setView("create")}>Nova atividade</button>
              <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>Prévia</button>
              <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>Histórico<b>{historyCount}</b></button>
            </nav>
          )}
          <div className="drawingHeaderUser">
            <span>{(user.displayName || user.username || "U").charAt(0).toUpperCase()}</span>
            <div><strong>{user.displayName || user.username}</strong><small>{isProfessor ? "Professor" : "Aluno"}</small></div>
          </div>
        </header>

        {error && <div className="drawingAlert" role="alert"><strong>Não foi possível concluir a ação.</strong><span>{error}</span><button onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}

        <div ref={contentRef} className={`drawingContent win11Scroll ${!isProfessor ? "drawingStudentContent" : ""}`} aria-busy={loading}>
          {isProfessor ? (
            <>
              {view === "live" && (
                <ProfessorLiveView
                  activity={activity}
                  activities={activities}
                  drawings={drawings}
                  selectedStudentId={selectedStudentId}
                  onSelectStudent={setSelectedStudentId}
                  onSelectActivity={inspectActivity}
                  onClose={handleClose}
                  onChooseWinner={handleChooseWinner}
                  onCreate={() => setView("create")}
                  busy={busy}
                />
              )}
              {view === "create" && (
                <CreateActivity
                  turmas={turmas}
                  draft={draft}
                  busy={busy}
                  onDraftChange={(change) => setDraft((current) => ({ ...current, ...change }))}
                  onCreate={handleCreate}
                  onPreview={() => setView("preview")}
                />
              )}
              {view === "preview" && (
                <PreviewView
                  preview={previewSource}
                  onEdit={() => setView("create")}
                />
              )}
              {view === "history" && (
                <HistoryView
                  activities={activities}
                  turmas={turmas}
                  onOpen={async (id) => { await inspectActivity(id); setView("live"); }}
                  onRepeat={(item) => {
                    setDraft({
                      turmaId: item.turmaId,
                      topic: item.topic,
                      instructions: item.instructions || "",
                      mode: item.mode,
                      backgroundColor: item.backgroundColor,
                    });
                    setView("create");
                  }}
                />
              )}
            </>
          ) : (
            <StudentView
              activity={activity}
              drawing={drawing}
              busy={busy}
              onCommit={handleStudentCommit}
            />
          )}
          {loading && <div className="drawingLoading"><i /> Atualizando dados…</div>}
        </div>
      </div>
    </AppWindow>
  );
};
