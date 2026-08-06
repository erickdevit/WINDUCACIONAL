import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { drawStrokes, DrawingBoard, DrawingPreview } from "./DrawingBoard";
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

const IconProjector = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconPowerOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconPause = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
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

const ActivityThumbnail = ({ activity = {} }) => (
  <div
    className="drawingHistoryThumbnail"
    style={{ backgroundColor: activity.backgroundColor || "#ffffff" }}
  >
    {activity.winnerStrokes?.length ? (
      <DrawingPreview
        strokes={activity.winnerStrokes}
        backgroundColor={activity.backgroundColor || "#ffffff"}
        label={`Desenho vencedor de ${activity.winnerName || "Aluno"}`}
      />
    ) : (
      <div className="drawingHistoryPlaceholder">
        <span>{activity.mode === "chaos" ? "COLETIVO" : "ATIVIDADE"}</span>
        <strong>{(activity.topic || "D").charAt(0).toUpperCase()}</strong>
      </div>
    )}
  </div>
);

const StudentTile = ({ drawing = {}, active, backgroundColor, onClick }) => {
  const name = drawing.displayName || drawing.username || "Aluno";
  return (
    <button
      type="button"
      className={`drawingStudentTile ${active ? "active" : ""}`}
      data-started={Boolean(drawing.started)}
      onClick={onClick}
    >
      <div className="drawingStudentPreview" style={{ backgroundColor }}>
        {drawing.started && Array.isArray(drawing.strokes) ? (
          <DrawingPreview
            strokes={drawing.strokes}
            backgroundColor={backgroundColor}
            label={`Prévia de ${name}`}
          />
        ) : (
          <span>{name.charAt(0).toUpperCase()}</span>
        )}
        <i className="drawingStudentStatus" />
      </div>
      <span>
        <strong>{name}</strong>
        <small>{drawing.started ? `${drawing.strokeCount || 0} traços` : "Aguardando"}</small>
      </span>
    </button>
  );
};

const ResultModal = ({ result, fallbackDrawing, onSaveVirtualDisk, onDownloadPng, onClose }) => {
  if (!result) return null;
  const isWinner = result.type === "winner";
  const displayDrawing = result.drawing || fallbackDrawing;

  return (
    <div className="drawingResultOverlay" role="dialog" aria-label="Resultado do Desafio">
      <div className={`drawingResultModal ${isWinner ? "winner" : "encouragement"}`}>
        <header className="drawingResultHeader">
          <div className="drawingResultBadge">
            {isWinner ? "🏆 Campeão da Rodada!" : "💙 Sinto Muito - Não foi desta vez"}
          </div>
          <h2>
            {isWinner
              ? "Parabéns! Seu Desenho Venceu!"
              : "Sinto muito, não foi desta vez!"}
          </h2>
          <p>
            {isWinner
              ? "O professor escolheu sua criação como a grande vencedora do desafio! O desenho foi salvo na galeria de vencedores e no seu histórico."
              : `O professor escolheu a criação de ${result.winnerName || "um colega da turma"} como a vencedora desta rodada. Não desanime! Seu desenho ficou ótimo e você continua evoluindo.`}
          </p>
        </header>

        {displayDrawing?.strokes?.length > 0 && (
          <div className="drawingResultPreviewStage" style={{ backgroundColor: displayDrawing.backgroundColor || "#ffffff" }}>
            <DrawingPreview
              strokes={displayDrawing.strokes}
              backgroundColor={displayDrawing.backgroundColor || "#ffffff"}
              label="Sua criação"
            />
          </div>
        )}

        <footer className="drawingResultActions">
          {displayDrawing?.strokes?.length > 0 && (
            <>
              <button
                type="button"
                className="drawingSecondaryButton"
                onClick={() => onSaveVirtualDisk(displayDrawing, result.activityTopic)}
              >
                💾 Salvar no Computador
              </button>
              <button
                type="button"
                className="drawingSecondaryButton"
                onClick={() => onDownloadPng(displayDrawing, result.activityTopic)}
              >
                ⬇ Baixar PNG
              </button>
            </>
          )}
          <button type="button" className="drawingPrimaryButton" onClick={onClose}>
            Continuar
          </button>
        </footer>
      </div>
    </div>
  );
};

const PresentationModal = ({ drawings = [], activity, onClose, onChooseWinner, busy }) => {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  const activeDrawings = useMemo(
    () => drawings.filter((d) => d.started || (d.strokes && d.strokes.length > 0)),
    [drawings]
  );
  const currentDrawing = activeDrawings[index] || activeDrawings[0];

  const handleNext = useCallback(() => {
    if (!activeDrawings.length) return;
    setIndex((prev) => (prev + 1) % activeDrawings.length);
  }, [activeDrawings.length]);

  const handlePrev = useCallback(() => {
    if (!activeDrawings.length) return;
    setIndex((prev) => (prev - 1 + activeDrawings.length) % activeDrawings.length);
  }, [activeDrawings.length]);

  useEffect(() => {
    if (!autoplay) return undefined;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [autoplay, handleNext]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (!activeDrawings.length) return null;

  return (
    <div className="drawingPresentationOverlayFull" role="dialog" aria-label="Modo Apresentação">
      <div
        className="drawingPresentationWhiteboardCanvas"
        style={{ backgroundColor: activity?.backgroundColor || "#ffffff" }}
      >
        <header className="drawingPresentationFloatingTop">
          <div className="drawingPresentationMetaPills">
            <span className="drawingTurmaTag">{activity?.turmaName || "Turma"}</span>
            <div className="drawingTopicPill" title={activity?.topic}>
              <strong>{activity?.topic || "Desafio de Desenho"}</strong>
            </div>
            <span className="drawingPresentationIndex">
              {index + 1} de {activeDrawings.length}
            </span>
          </div>

          <div className="drawingPresentationActionPills">
            <button
              type="button"
              className={`drawingIconPillBtn ${autoplay ? "active" : ""}`}
              title={autoplay ? "Pausar Projeção" : "Apresentação Automática"}
              aria-label="Apresentação Automática"
              onClick={() => setAutoplay((prev) => !prev)}
            >
              {autoplay ? <IconPause /> : <IconPlay />}
            </button>
            <button
              type="button"
              className="drawingIconPillBtn danger"
              title="Fechar apresentação"
              aria-label="Fechar apresentação"
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>
        </header>

        <button
          type="button"
          className="drawingNavArrowFloating prev"
          onClick={handlePrev}
          aria-label="Desenho anterior"
        >
          ‹
        </button>

        <DrawingBoard
          strokes={currentDrawing?.strokes || []}
          backgroundColor={activity?.backgroundColor || "#ffffff"}
          readonly
        />

        <button
          type="button"
          className="drawingNavArrowFloating next"
          onClick={handleNext}
          aria-label="Próximo desenho"
        >
          ›
        </button>

        <footer className="drawingPresentationFloatingBottom">
          <div className="drawingPresentationAuthor">
            <strong>{currentDrawing?.displayName || "Aluno"}</strong>
            <small>{currentDrawing?.strokeCount || 0} traços realizados</small>
          </div>

          {activity?.mode === "individual" && !activity?.winnerId && currentDrawing?.started && onChooseWinner && (
            <button
              type="button"
              className="drawingTeacherWinnerPill"
              disabled={busy}
              onClick={() => {
                onChooseWinner(currentDrawing);
                onClose();
              }}
            >
              👑 Escolher {currentDrawing.displayName}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

const CreateActivity = ({ turmas, activities = [], draft, busy, onDraftChange, onCreate, onPreview }) => {
  useEffect(() => {
    if (turmas.length && (!draft.turmaId || !turmas.some((t) => t.id === draft.turmaId))) {
      const activeTurmaIds = new Set(activities.filter((a) => a.status === "active").map((a) => a.turmaId));
      const availableTurma = turmas.find((t) => !activeTurmaIds.has(t.id)) || turmas[0];
      if (availableTurma) {
        onDraftChange({ turmaId: availableTurma.id });
      }
    }
  }, [activities, draft.turmaId, onDraftChange, turmas]);

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
          <div className="drawingPreviewDots">
            <i className="red" />
            <i className="yellow" />
            <i className="green" />
            <span>Visão do Aluno</span>
          </div>
          <div className="drawingPreviewDevicePills">
            <span className="drawingTurmaTag">{preview.turmaName || "Turma selecionada"}</span>
            <ModeBadge mode={preview.mode || "individual"} />
            <div className="drawingTopicPill" title={preview.topic || "Tema"}>
              <strong>{preview.topic || "Desafio de Desenho"}</strong>
            </div>
          </div>
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
  viewingDashboard = true,
  onSetViewingDashboard,
  onSelectStudent,
  onSelectActivity,
  onClose,
  onChooseWinner,
  onCreate,
  busy,
}) => {
  const [showPresentation, setShowPresentation] = useState(false);
  const activeActivities = useMemo(
    () => activities.filter((item) => item.status === "active"),
    [activities]
  );

  const showGrid = activeActivities.length > 1 && (viewingDashboard || !activity);

  if (!activity && !activeActivities.length) {
    return (
      <EmptyState
        title="Nenhuma atividade está ao vivo"
        description="Inicie uma rodada para acompanhar a turma e receber os desenhos em tempo real."
        action={<button className="drawingPrimaryButton" onClick={onCreate}>Criar atividade</button>}
      />
    );
  }

  if (showGrid) {
    return (
      <div className="drawingActiveChallengesDashboard">
        <header className="drawingSectionHeading">
          <div>
            <span className="drawingEyebrow">Visão geral do professor</span>
            <h2>Desafios da Turma Ao Vivo ({activeActivities.length})</h2>
            <p>Selecione uma lição em andamento para abrir a lousa de monitoramento em tempo real e acompanhar os alunos.</p>
          </div>
          <button className="drawingPrimaryButton" onClick={onCreate}>Criar nova atividade</button>
        </header>

        <div className="drawingActiveChallengeGrid">
          {activeActivities.map((item) => (
            <article className="drawingActiveChallengeCard" key={item.id}>
              <div className="drawingActiveCardHeader">
                <span className="drawingLiveDot active" title="Ao vivo" aria-label="Ao vivo"><i /></span>
                <span className="drawingTurmaTag">{item.turmaName}</span>
                <ModeBadge mode={item.mode} />
              </div>
              <div className="drawingActiveCardBody">
                <h3>{item.topic}</h3>
                {item.instructions ? (
                  <p>{item.instructions}</p>
                ) : (
                  <p>{item.mode === "chaos" ? "Construção coletiva no mesmo quadro em tempo real." : "Desenhos individuais em mosaico."}</p>
                )}
              </div>
              <footer className="drawingActiveCardFooter">
                <span>{item.drawingCount || item.participantCount || 0} alunos participando</span>
                <button
                  type="button"
                  className="drawingPrimaryButton"
                  onClick={() => {
                    onSelectActivity(item.id);
                    onSetViewingDashboard?.(false);
                  }}
                >
                  Monitorar Atividade
                </button>
              </footer>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (!activity) {
    return <div className="drawingLoading"><i /> Carregando atividade…</div>;
  }

  const safeDrawings = Array.isArray(drawings) ? drawings : [];
  const selectedDrawing =
    activity.mode === "chaos"
      ? safeDrawings[0]
      : safeDrawings.find((item) => item.userId === selectedStudentId) || safeDrawings[0];
  const startedCount = safeDrawings.filter((item) => item.started).length;

  return (
    <div className="drawingLiveLayout">
      {showPresentation && (
        <PresentationModal
          drawings={drawings}
          activity={activity}
          onClose={() => setShowPresentation(false)}
          onChooseWinner={onChooseWinner}
          busy={busy}
        />
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
          <div className="drawingRosterProgress">
            <i style={{ width: `${drawings.length ? (startedCount / drawings.length) * 100 : 0}%` }} />
          </div>
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

      <main className="drawingTeacherStageShell drawingPanel">
        <header className="drawingTeacherFloatingHeader">
          <div className="drawingTeacherMetaPills">
            <span className={`drawingLiveDot ${activity.status}`} title={activity.status === "active" ? "Ao vivo" : "Encerrada"} aria-label={activity.status === "active" ? "Ao vivo" : "Encerrada"}>
              <i />
            </span>
            <span className="drawingTurmaTag">{activity.turmaName}</span>
            <ModeBadge mode={activity.mode} />
            <div className="drawingTopicPill" title={activity.topic}>
              <strong>{activity.topic}</strong>
            </div>
          </div>

          <div className="drawingTeacherActionPills">
            {activity.mode === "chaos" && activity.status === "active" && onClearChaos && (
              <button
                type="button"
                className="drawingIconPillBtn"
                title="Limpar quadro coletivo"
                aria-label="Limpar quadro coletivo"
                disabled={busy}
                onClick={onClearChaos}
              >
                🗑
              </button>
            )}
            {activity.mode === "individual" && startedCount > 0 && (
              <button
                type="button"
                className="drawingIconPillBtn"
                title="Projetar Trabalhos"
                aria-label="Projetar Trabalhos"
                onClick={() => setShowPresentation(true)}
              >
                <IconProjector />
              </button>
            )}
            {activity.status === "active" && (
              <button
                type="button"
                className="drawingIconPillBtn danger"
                title="Encerrar rodada"
                aria-label="Encerrar rodada"
                disabled={busy}
                onClick={onClose}
              >
                <IconPowerOff />
              </button>
            )}
          </div>
        </header>

        <div className="drawingTeacherCanvasStage">
          <DrawingBoard
            strokes={selectedDrawing?.strokes || []}
            backgroundColor={activity.backgroundColor}
            readonly
          />

          <div className="drawingTeacherStudentBadge">
            <strong>{activity.mode === "chaos" ? "Quadro Coletivo" : selectedDrawing?.displayName || "Aluno"}</strong>
            {selectedDrawing?.started && <small>{selectedDrawing.strokeCount} traços</small>}
          </div>

          {activity.mode === "individual" && !activity.winnerId && selectedDrawing?.started && (
            <button
              type="button"
              className="drawingTeacherWinnerPill"
              disabled={busy}
              onClick={() => onChooseWinner(selectedDrawing)}
            >
              👑 Escolher {selectedDrawing?.displayName || "Aluno"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

const HistoryView = ({ activities, turmas, onOpen, onRepeat }) => {
  const [selectedTurmaTab, setSelectedTurmaTab] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const closedActivities = useMemo(
    () => activities.filter((item) => item.status === "closed"),
    [activities]
  );

  const filteredHistory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return closedActivities.filter(
      (item) =>
        (!selectedTurmaTab || item.turmaId === selectedTurmaTab) &&
        (!modeFilter || item.mode === modeFilter) &&
        (!term || (item.topic || "").toLowerCase().includes(term))
    );
  }, [closedActivities, selectedTurmaTab, modeFilter, searchTerm]);

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
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por tema…"
              aria-label="Buscar tema no histórico"
            />
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

const StudentView = ({ activity, drawing, busy, onCommit, resultModal, onDismissResultModal }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("board");
  const [myDrawings, setMyDrawings] = useState([]);
  const [loadingMyDrawings, setLoadingMyDrawings] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const loadMyDrawings = useCallback(async () => {
    setLoadingMyDrawings(true);
    try {
      const res = await api.getMyDrawings();
      setMyDrawings(res.drawings || []);
    } catch (e) {
    } finally {
      setLoadingMyDrawings(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "myDrawings") {
      loadMyDrawings();
    }
  }, [activeTab, loadMyDrawings]);

  const handleSaveVirtualDisk = (item, topic) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    drawStrokes(canvas, item.strokes, item.backgroundColor || "#ffffff");
    const dataUrl = canvas.toDataURL("image/png");
    const topicSlug = (topic || item.topic || "desenho").replace(/\s+/g, "_").toLowerCase();
    const fileName = `desenho_${topicSlug}.png`;

    dispatch({
      type: "FILEDIALOG_OPEN",
      payload: {
        mode: "save",
        fileName,
        caller: "drawing",
        startDir: "%pictures%",
        content: dataUrl,
        ext: "png",
      },
    });
  };

  const handleDownloadPng = (item, topic) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    drawStrokes(canvas, item.strokes, item.backgroundColor || "#ffffff");
    const dataUrl = canvas.toDataURL("image/png");
    const topicSlug = (topic || item.topic || "desenho").replace(/\s+/g, "_").toLowerCase();

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `desenho_${topicSlug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="drawingStudentViewFull">
      <ResultModal
        result={resultModal}
        fallbackDrawing={drawing}
        onSaveVirtualDisk={handleSaveVirtualDisk}
        onDownloadPng={handleDownloadPng}
        onClose={onDismissResultModal}
      />

      <header className="drawingStudentFloatingHeader">
        <div className="drawingStudentHeaderInfo">
          {activity?.topic ? (
            <div className="drawingTopicPill" title={activity.topic}>
              <strong>{activity.topic}</strong>
            </div>
          ) : (
            <div className="drawingTopicPill">
              <strong>Desafio de Desenho</strong>
            </div>
          )}
        </div>

        <div className="drawingStudentHeaderTabs">
          <button
            type="button"
            className={`drawingSeparatePillBtn ${activeTab === "board" ? "active" : ""}`}
            onClick={() => setActiveTab("board")}
          >
            Lousa Atual
          </button>
          <button
            type="button"
            className={`drawingSeparatePillBtn ${activeTab === "myDrawings" ? "active" : ""}`}
            onClick={() => setActiveTab("myDrawings")}
          >
            Meus Desenhos
          </button>
          {activity?.instructions && activeTab === "board" && (
            <button
              type="button"
              className="drawingSeparatePillBtn instructions"
              onClick={() => setShowInstructionsModal((prev) => !prev)}
            >
              <span>Orientações</span>
            </button>
          )}
        </div>
      </header>

      {showInstructionsModal && activity?.instructions && activeTab === "board" && (
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

      {activeTab === "board" ? (
        <div className="drawingStudentCanvasContainer">
          {activity && activity.status === "active" ? (
            <DrawingBoard
              strokes={drawing?.strokes || []}
              backgroundColor={activity.backgroundColor}
              collaborative={activity.mode === "chaos"}
              readonly={activity.status !== "active"}
              busy={busy}
              onCommit={onCommit}
            />
          ) : (
            <div className="drawingStudentWaiting">
              <EmptyState
                title="Aguardando um desafio"
                description="Quando o professor iniciar uma atividade para a sua turma, o tema e o quadro aparecerão automaticamente aqui."
              />
            </div>
          )}
        </div>
      ) : (
        <div className="drawingStudentMyDrawingsPanel win11Scroll">
          <div className="drawingStudentMyDrawingsHeader">
            <h2>Galeria de Produções Pessoais</h2>
            <p>Escolha qual desenho deseja salvar no seu disco virtual (`C:\Users\...`) ou baixar no seu dispositivo.</p>
          </div>

          {loadingMyDrawings ? (
            <div className="drawingLoadingInPlace"><i /> Carregando seus desenhos…</div>
          ) : myDrawings.length ? (
            <div className="drawingStudentMyDrawingsGrid">
              {myDrawings.map((item, idx) => (
                <article key={idx} className="drawingStudentDrawingCard">
                  <div className="drawingStudentCardPreview" style={{ backgroundColor: item.backgroundColor }}>
                    <DrawingPreview strokes={item.strokes} backgroundColor={item.backgroundColor} label={item.topic} />
                    {item.isWinner && <span className="drawingWinnerRibbon"><i /> Desenho Vencedor</span>}
                  </div>
                  <div className="drawingStudentCardBody">
                    <h3>{item.topic}</h3>
                    <p>{item.turmaName} · {item.strokeCount} traços</p>
                    <time>{formatDate(item.updatedAt)}</time>
                  </div>
                  <footer className="drawingStudentCardActions">
                    <button type="button" className="drawingSecondaryButton" onClick={() => handleSaveVirtualDisk(item, item.topic)}>
                      💾 Salvar no Computador
                    </button>
                    <button type="button" className="drawingPrimaryButton" onClick={() => handleDownloadPng(item, item.topic)}>
                      ⬇ Baixar PNG
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Você ainda não tem desenhos salvos"
              description="Participe dos desafios propostos pelo professor para formar sua galeria pessoal de criações."
            />
          )}
        </div>
      )}
    </div>
  );
};

export const DrawingApp = () => {
  const wnapp = useSelector((state) => state.apps.drawing);
  const user = useSelector((state) => state.setting.person) || {};
  const isProfessor = user?.role === "professor";
  const [view, setView] = useState("live");
  const [viewingDashboard, setViewingDashboard] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activity, setActivity] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [resultModal, setResultModal] = useState(null);
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
  const drawingRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

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
      setActivity((prev) => {
        if (result.activity?.id !== prev?.id) {
          setDrawing(result.drawing);
        }
        return result.activity;
      });
      if (!result.activity) {
        setDrawing(result.drawing || null);
      } else if (result.drawing && !busy) {
        setDrawing(result.drawing);
      }

      if (result.lastResult) {
        const dismissedKey = `dismissed_result_${result.lastResult.activityId}`;
        if (!sessionStorage.getItem(dismissedKey)) {
          const isWinner = String(result.lastResult.winnerId) === String(user?.id);
          setResultModal({
            activityId: result.lastResult.activityId,
            type: isWinner ? "winner" : "encouragement",
            winnerName: result.lastResult.winnerName,
            drawing: result.drawing || drawingRef.current,
            activityTopic: result.lastResult.topic || "desenho",
          });
        }
      }
      setError("");
    } catch {
      // Do not pollute user error state during background polling
    }
  }, [busy, user?.id]);

  useEffect(() => {
    if (wnapp?.hide) return;
    if (isProfessor) loadProfessor();
    else loadStudent();
  }, [isProfessor, loadProfessor, loadStudent, wnapp?.hide]);

  useEffect(() => {
    if (isProfessor || wnapp?.hide) return undefined;
    const timer = setInterval(() => {
      loadStudent();
    }, 2500);
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
              if (activity?.mode === "chaos") return [nextDrawing];
              return (current || []).map((item) =>
                item.userId === event.userId ? nextDrawing : item
              );
            });
          } else if (activity?.mode === "chaos" || String(event.userId) === String(user?.id)) {
            setDrawing(nextDrawing);
          }
        }
        if (event.type === "closed") {
          setActivity((current) => current && { ...current, status: "closed" });
          setTimeout(() => {
            loadStudent();
          }, 800);
        }
        if (event.type === "winner") {
          const isWinner = String(event.winnerId) === String(user?.id);
          setResultModal({
            activityId: activity.id,
            type: isWinner ? "winner" : "encouragement",
            winnerName: event.winnerName,
            drawing: drawingRef.current,
            activityTopic: activityRef.current?.topic || "desenho",
          });
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
  }, [activity?.id, activity?.mode, activity?.status, isProfessor, user?.id, loadStudent, wnapp?.hide]);

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
      setViewingDashboard(false);
      await loadProfessor();
      await inspectActivity(result.activity.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClearChaos = async () => {
    if (!activity || !window.confirm("Limpar todo o quadro coletivo para a turma?")) return;
    setBusy(true);
    try {
      await api.saveDrawingStrokes(activity.id, { action: "clear", strokes: [] });
      await inspectActivity(activity.id);
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

  const activeCount = (activities || []).filter((item) => item?.status === "active").length;
  const historyCount = (activities || []).filter((item) => item?.status === "closed").length;
  const previewSource = useMemo(() => {
    if ((draft?.topic || "").trim()) {
      return {
        ...draft,
        turmaName:
          (turmas || []).find((item) => item.id === draft?.turmaId)?.nome || "",
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
        {isProfessor && (
          <header className="drawingAppHeader">
            <div className="drawingBrand">
              <span className="drawingBrandMark" aria-hidden="true"><i /></span>
              <div>
                <strong>Desenho da Turma</strong>
                <small>Estúdio do professor</small>
              </div>
            </div>
            <nav className="drawingMainNav" aria-label="Seções do aplicativo">
              <button className={view === "live" ? "active" : ""} onClick={() => { setView("live"); setViewingDashboard(true); }}><i className="live" />Painel{activeCount > 0 && <b>{activeCount}</b>}</button>
              <button className={view === "create" ? "active" : ""} onClick={() => setView("create")}>Nova atividade</button>
              <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>Prévia</button>
              <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>Histórico<b>{historyCount}</b></button>
            </nav>
            <div className="drawingHeaderActions">
              {activeCount > 0 && (
                <button
                  type="button"
                  className={`drawingTopBarBackBtn ${!viewingDashboard ? "highlight" : ""}`}
                  onClick={() => {
                    setView("live");
                    setViewingDashboard(true);
                  }}
                  title="Ver todos os desafios da turma"
                >
                  ← Todos os Desafios ({activeCount})
                </button>
              )}
              <div className="drawingHeaderUser">
                <span>{(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}</span>
                <div><strong>{user?.displayName || user?.username || "Usuário"}</strong><small>Professor</small></div>
              </div>
            </div>
          </header>
        )}

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
                  viewingDashboard={viewingDashboard}
                  onSetViewingDashboard={setViewingDashboard}
                  onSelectStudent={setSelectedStudentId}
                  onSelectActivity={(id) => {
                    inspectActivity(id);
                    setViewingDashboard(false);
                  }}
                  onClose={handleClose}
                  onClearChaos={handleClearChaos}
                  onChooseWinner={handleChooseWinner}
                  onCreate={() => setView("create")}
                  busy={busy}
                />
              )}
              {view === "create" && (
                <CreateActivity
                  turmas={turmas}
                  activities={activities}
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
              resultModal={resultModal}
              onDismissResultModal={() => {
                if (resultModal?.activityId) {
                  sessionStorage.setItem(`dismissed_result_${resultModal.activityId}`, "true");
                }
                setResultModal(null);
                loadStudent();
              }}
            />
          )}
          {loading && <div className="drawingLoading"><i /> Atualizando dados…</div>}
        </div>
      </div>
    </AppWindow>
  );
};
