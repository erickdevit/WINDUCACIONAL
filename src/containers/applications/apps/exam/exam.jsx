import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { normalizeName } from "../../../../lib/ui";
import { MCQView } from "./MCQView";
import { ExamContainer } from "./ExamContainer";
import { ExamManagement } from "./components/ExamManagement";
import { StudentHistory } from "./components/StudentHistory";
import { ExamResults } from "./components/ExamResults";
import { ExamAnalytics } from "./components/ExamAnalytics";
import { ExamAssignment } from "./components/ExamAssignment";
import { ExamApplications } from "./components/ExamApplications";
import { ExamTimer } from "./components/ExamTimer";
import { ExamReceipt } from "./components/ExamReceipt";
import "./exam.scss";

export const ExamApp = () => {
  const dispatch = useDispatch();
  const wnapp = useSelector((state) => state.apps.exam || {});
  const user = useSelector((state) => state.setting.person);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFlow, setExamFlow] = useState("none");
  const [currentExam, setCurrentExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const mcqAnswersRef = useRef({});
  const [finalSubmission, setFinalSubmission] = useState(null);
  const [practicalFinishSignal, setPracticalFinishSignal] = useState(0);
  const [confirmModal, setConfirmModal] = useState(null);
  const [studentStartName, setStudentStartName] = useState("");
  const [savingStudentName, setSavingStudentName] = useState(false);

  const isStaff = user.role !== "aluno";
  const currentUserDisplayName =
    user.name || user.displayName || user.username || "Usuário";
  const pendingExams = exams.filter((e) => e.submissionStatus !== "completed");
  const completedExams = exams.filter(
    (e) => e.submissionStatus === "completed"
  );
  const publishedCount = exams.filter((e) => e.isPublished).length;
  const draftCount = Math.max(exams.length - publishedCount, 0);

  useEffect(() => {
    if (!wnapp.hide) loadInitialData();
  }, [wnapp.hide, user.id, user.role]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const data = await api.getExams();
      setExams(data.exams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message) => {
    setConfirmModal({
      title: "Aviso",
      message,
      onConfirm: () => setConfirmModal(null),
      confirmOnly: true,
    });
  };

  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      setConfirmModal({
        title,
        message,
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        },
      });
    });
  };

  const professorNavItems = [
    { id: "dashboard", label: "Visão Geral", fafa: "faTableColumns" },
    { id: "exams", label: "Provas", fafa: "faClipboardList" },
    { id: "apply", label: "Aplicação", fafa: "faPaperPlane" },
    { id: "applications", label: "Aplicadas", fafa: "faClockRotateLeft" },
    { id: "results", label: "Resultados", fafa: "faListCheck" },
    { id: "analytics", label: "Análise", fafa: "faChartSimple" },
  ];
  
  const navItems = isStaff
    ? user.role === "professor" 
      ? professorNavItems
      : professorNavItems.filter((item) => ["dashboard", "applications", "results", "analytics"].includes(item.id))
    : [
        { id: "dashboard", label: "Resumo", fafa: "faTableColumns" },
        {
          id: "available",
          label: "Disponíveis",
          fafa: "faClipboardList",
          badge: pendingExams.length,
        },
        {
          id: "completed",
          label: "Concluídas",
          fafa: "faCircleCheck",
          badge: completedExams.length,
        },
        { id: "history", label: "Histórico", fafa: "faListCheck" },
      ];

  const handleStartExam = async (exam) => {
    if (exam.submissionStatus === "completed") {
      showAlert("Esta avaliação já foi concluída.");
      return;
    }
    setLoading(true);
    try {
      const details = await api.getExamDetails(exam.id);
      setCurrentExam(details.exam);
      setQuestions(details.questions);
      setStudentStartName(normalizeName(currentUserDisplayName).trim());
      setExamFlow("intro");
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = () => {
    showAlert("O tempo acabou! Sua prova será enviada automaticamente.");
    if (examFlow === "mcq") setExamFlow("practical");
    else if (examFlow === "practical") setPracticalFinishSignal((v) => v + 1);
  };

  const renderConfirmModal = () => {
    if (!confirmModal) return null;
    return (
      <div className="question-modal-backdrop" role="presentation">
        <div
          className="question-modal animate-scale-up"
          role="dialog"
          aria-modal="true"
          style={{ maxWidth: 420 }}
        >
          <div className="question-modal-head">
            <h3>{confirmModal.title}</h3>
          </div>
          <div style={{ padding: 20 }}>
            <p style={{ marginBottom: 20, lineHeight: 1.6 }}>
              {confirmModal.message}
            </p>
            <div className="flex gap-2 justify-end">
              {!confirmModal.confirmOnly && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={confirmModal.onCancel}
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmOnly ? "OK" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExamHeader = () => (
    <div className="exam-flow-header animate-fade-in">
      <div className="exam-title-block">
        <div className="exam-app-icon">
          <Icon src="exam" width={20} invert />
        </div>
        <div>
          <h3>{currentExam?.title}</h3>
          <p>{examFlow === "mcq" ? "Fase 1: Teoria" : "Fase 2: Prática"}</p>
        </div>
      </div>
      <ExamTimer minutes={currentExam?.timeLimit} onTimeUp={handleTimeUp} />
    </div>
  );

  const renderSidebar = () => (
    <div className={`exam-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      <div className="exam-brand">
        <div className="exam-brand-icon">
          <Icon src="exam" width={24} />
        </div>
        <div className="nav-text">
          <strong>Avaliação</strong>
          <span>{isStaff ? "Equipe" : "Aluno"}</span>
        </div>
      </div>

      <div className="exam-nav">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`nav-link ${activeTab === item.id ? "active" : ""}`}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
          >
            <Icon fafa={item.fafa} width={16} />
            <span className="nav-text">{item.label}</span>
            {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
          </button>
        ))}
      </div>

      <div className="exam-sidebar-footer">
        <button
          type="button"
          className="nav-link"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Icon
            fafa={sidebarCollapsed ? "faAngleRight" : "faAngleLeft"}
            width={14}
          />
          <span className="nav-text">Recolher</span>
        </button>
      </div>
    </div>
  );

  const renderMobileNav = () => (
    <nav 
      className="exam-mobile-nav exam-mobile-only" 
      style={{ "--exam-mobile-nav-count": navItems.length }}
    >
      {navItems.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`nav-link ${activeTab === item.id ? "active" : ""}`}
          onClick={() => setActiveTab(item.id)}
        >
          <Icon fafa={item.fafa} width={16} />
          <span className="nav-text">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  const renderDashboard = () => (
    <div className="exam-page animate-fade-in">
      <div className="exam-page-heading">
        <h2>Olá, {currentUserDisplayName}</h2>
      </div>

      <div className="exam-stat-grid">
        <button
          type="button"
          className="stat-card clickable"
          onClick={() => setActiveTab("available")}
        >
          <span className="stat-label">Pendentes</span>
          <span className="stat-value">{pendingExams.length}</span>
        </button>
        <button
          type="button"
          className="stat-card clickable"
          onClick={() => setActiveTab("completed")}
        >
          <span className="stat-label">Concluídas</span>
          <span className="stat-value">{completedExams.length}</span>
        </button>
        <button
          type="button"
          className="stat-card clickable"
          onClick={() => setActiveTab("history")}
        >
          <span className="stat-label">Histórico</span>
          <span className="stat-value">
            <Icon fafa="faArrowRight" width={14} />
          </span>
        </button>
      </div>

      {pendingExams.length > 0 && (
        <div className="exam-panel">
          <div className="exam-panel-header">
            <h3>Próximas avaliações</h3>
          </div>
          {pendingExams.slice(0, 5).map((exam) => (
            <button
              type="button"
              key={exam.id}
              className="exam-list-row"
              onClick={() => handleStartExam(exam)}
            >
              <span>
                <strong>{exam.title}</strong>
              </span>
              <em>
                {exam.timeLimit > 0 ? `${exam.timeLimit} min` : "Sem limite"}
              </em>
            </button>
          ))}
        </div>
      )}

      {pendingExams.length === 0 && (
        <div className="exam-empty">Nenhuma avaliação pendente.</div>
      )}
    </div>
  );

  const renderTeacherDashboard = () => (
    <div className="exam-page animate-fade-in">
      <div className="exam-page-heading">
        <h2>Visão geral</h2>
        {user.role === "professor" ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setActiveTab("exams")}
          >
            <Icon fafa="faPlus" width={13} /> Nova prova
          </button>
        ) : null}
      </div>

      <div className="exam-stat-grid four">
        <div className="stat-card">
          <span className="stat-label">Criadas</span>
          <span className="stat-value">{exams.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Publicadas</span>
          <span className="stat-value">{publishedCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rascunhos</span>
          <span className="stat-value">{draftCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Com tempo</span>
          <span className="stat-value">
            {exams.filter((e) => Number(e.timeLimit || 0) > 0).length}
          </span>
        </div>
      </div>

      <div className="exam-panel">
        <div className="exam-panel-header">
          <h3>Provas recentes</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab("results")}
          >
            Resultados
          </button>
        </div>
        {exams.slice(0, 5).map((exam) => (
          <button
            type="button"
            key={exam.id}
            className={`exam-list-row ${user.role !== "professor" ? "pointer-events-none" : ""}`}
            onClick={() => user.role === "professor" && setActiveTab("exams")}
          >
            <span>
              <strong>{exam.title}</strong>
              <small>
                {exam.isPublished ? "Publicada" : "Rascunho"} ·{" "}
                {exam.timeLimit > 0 ? `${exam.timeLimit} min` : "Sem limite"}
              </small>
            </span>
            <em>{new Date(exam.createdAt).toLocaleDateString()}</em>
          </button>
        ))}
        {exams.length === 0 && (
          <div className="exam-empty compact">
            Crie a primeira prova para começar.
          </div>
        )}
      </div>
    </div>
  );

  const renderAvailableExams = () => (
    <div className="exam-page animate-fade-in">
      <div className="exam-page-heading">
        <h2>Provas disponíveis</h2>
      </div>
      <div className="exam-grid">
        {pendingExams.map((exam) => (
          <div key={exam.id} className="exam-card">
            <div className="exam-card-top">
              <div className="exam-card-icon">
                <Icon src="exam" width={24} />
              </div>
              <span className="exam-pill">
                {exam.timeLimit > 0 ? `${exam.timeLimit} min` : "Sem limite"}
              </span>
            </div>
            <h3>{exam.title}</h3>
            <button
              className="btn-primary mt-auto"
              onClick={() => handleStartExam(exam)}
            >
              Iniciar Avaliação
            </button>
          </div>
        ))}
        {pendingExams.length === 0 && !loading && (
          <div className="exam-empty">Nenhuma prova pendente no momento.</div>
        )}
      </div>
    </div>
  );

  const renderCompletedExams = () => (
    <div className="exam-page animate-fade-in">
      <div className="exam-page-heading">
        <h2>Concluídas</h2>
      </div>
      <div className="exam-grid">
        {completedExams.map((exam) => (
          <div key={exam.id} className="exam-card completed">
            <div className="exam-card-top">
              <div className="exam-card-icon">
                <Icon fafa="faCheck" width={18} />
              </div>
              <span className="exam-pill">Concluída</span>
            </div>
            <h3>{exam.title}</h3>
            <button
              className="btn-secondary mt-auto"
              onClick={() => setActiveTab("history")}
            >
              Ver comprovante
            </button>
          </div>
        ))}
        {completedExams.length === 0 && !loading && (
          <div className="exam-empty">Nenhuma prova concluída ainda.</div>
        )}
      </div>
    </div>
  );

  const submitCurrentExam = async (
    practicalSnapshot = {},
    mcqAnswerSnapshot
  ) => {
    const snapshot = mcqAnswerSnapshot || mcqAnswersRef.current;
    setLoading(true);
    try {
      const mcqResults = questions
        .filter((q) => q.type === "mcq")
        .map((q) => ({ questionId: q.id, answerText: snapshot[q.id] || "" }));

      const res = await api.submitExam(currentExam.id, {
        status: "completed",
        answers: mcqResults,
        practicalSnapshot,
      });

      setFinalSubmission(res.submission);
      setExamFlow("finished");
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePartialProgress = async (mcqAnswerSnapshot) => {
    try {
      const mcqResults = questions
        .filter((q) => q.type === "mcq")
        .map((q) => ({
          questionId: q.id,
          answerText: mcqAnswerSnapshot[q.id] || "",
        }));
      await api.submitExam(currentExam.id, {
        status: "in_progress",
        answers: mcqResults,
      });
    } catch (err) {
      console.error("Erro ao salvar progresso parcial:", err);
    }
  };

  const finishPractical = async (isolatedState) => {
    await submitCurrentExam({
      files: isolatedState.files.data.toJSON(),
      actions: isolatedState.examTracker.actions || [],
    });
  };

  const handleFinishPracticalClick = async (getIsolatedState) => {
    const confirmed = await showConfirm(
      "Finalizar avaliação",
      "Tem certeza de que deseja finalizar a prova? Após a entrega, não será possível alterar as respostas."
    );
    if (confirmed) getIsolatedState();
  };

  const beginCurrentExam = async () => {
    const normalizedName = normalizeName(studentStartName).trim();
    if (
      !isStaff &&
      normalizedName.split(/\s+/).filter(Boolean).length < 2
    ) {
      showAlert("Informe seu nome completo antes de iniciar a avaliação.");
      return;
    }

    setSavingStudentName(true);
    try {
      if (
        !isStaff &&
        normalizedName !== normalizeName(currentUserDisplayName).trim()
      ) {
        const result = await api.updateMyDisplayName(normalizedName);
        dispatch({ type: "SESSIONUSER", payload: result.user });
        setStudentStartName(result.user.displayName);
      }

      if (mcqCount > 0) setExamFlow("mcq");
      else if (practicalCount > 0) setExamFlow("practical");
      else submitCurrentExam();
    } catch (error) {
      showAlert(error.message);
    } finally {
      setSavingStudentName(false);
    }
  };

  const renderContent = () => {
    if (loading)
      return (
        <div className="exam-loader">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p>Carregando...</p>
        </div>
      );

    switch (activeTab) {
      case "dashboard":
        return isStaff ? renderTeacherDashboard() : renderDashboard();
      case "available":
        return renderAvailableExams();
      case "completed":
        return renderCompletedExams();
      case "exams":
        return <ExamManagement />;
      case "apply":
        return <ExamAssignment />;
      case "applications":
        return <ExamApplications />;
      case "results":
        return <ExamResults />;
      case "analytics":
        return <ExamAnalytics />;
      case "history":
        return <StudentHistory />;
      default:
        return null;
    }
  };

  if (examFlow === "practical") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
        {renderExamHeader()}
        <div className="flex-grow relative">
          <ExamContainer
            initialState={currentExam?.containerInitialState}
            instructions={questions.filter((q) => q.type === "practical")}
            onFinish={finishPractical}
            finishSignal={practicalFinishSignal}
            onFinishClick={handleFinishPracticalClick}
          />
        </div>
        {renderConfirmModal()}
      </div>
    );
  }

  const mcqCount = questions.filter((q) => q.type === "mcq").length;
  const practicalCount = questions.filter((q) => q.type === "practical").length;

  return (
    <AppWindow
      wnapp={wnapp}
      app="EXAMAPP"
      icon="exam"
      name="Avaliação"
      className="examApp"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="exam-layout">
        {examFlow === "none" && renderSidebar()}
        <div className="exam-main">
          <div className="exam-content win11Scroll">
            {examFlow === "none" ? (
              renderContent()
            ) : (
              <div className="exam-flow-content">
                {examFlow === "intro" && (
                  <div className="exam-intro animate-scale-up">
                    <div className="exam-intro-header">
                      <div className="exam-app-icon large">
                        <Icon src="exam" width={32} invert />
                      </div>
                      <span className="exam-pill">
                        {currentExam?.timeLimit > 0
                          ? `${currentExam.timeLimit} min`
                          : "Sem limite"}
                      </span>
                    </div>
                    <h2>{currentExam?.title}</h2>
                    {!isStaff && (
                      <label className="exam-name-confirmation">
                        <span>Nome completo do aluno</span>
                        <input
                          value={studentStartName}
                          onChange={(event) =>
                            setStudentStartName(
                              normalizeName(event.target.value)
                            )
                          }
                          autoComplete="name"
                          required
                        />
                      </label>
                    )}
                    <div className="exam-rule-grid">
                      <div>
                        <strong>Teoria</strong>
                        <span>
                          {mcqCount} questão{mcqCount === 1 ? "" : "ões"}
                        </span>
                      </div>
                      <div>
                        <strong>Prática</strong>
                        <span>
                          {practicalCount} tarefa
                          {practicalCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div>
                        <strong>Entrega</strong>
                        <span>A prática encerra a avaliação</span>
                      </div>
                    </div>
                    <button
                      onClick={beginCurrentExam}
                      disabled={savingStudentName}
                      className="btn-primary exam-start-button"
                    >
                      {savingStudentName
                        ? "Preparando..."
                        : "Iniciar avaliação"}
                    </button>
                  </div>
                )}
                {examFlow === "mcq" && (
                  <div className="animate-fade-in">
                    {renderExamHeader()}
                    <MCQView
                      questions={questions}
                      onFinish={(ans) => {
                        mcqAnswersRef.current = ans;
                        setMcqAnswers(ans);
                        if (practicalCount > 0) {
                          savePartialProgress(ans);
                          setExamFlow("practical");
                        } else submitCurrentExam({}, ans);
                      }}
                    />
                  </div>
                )}
                {examFlow === "finished" && (
                  <div className="exam-finished animate-scale-up">
                    <div className="exam-app-icon success">
                      <Icon fafa="faCheck" width={28} />
                    </div>
                    <h2>Avaliação entregue</h2>
                    <div className="exam-score-card">
                      <span>Nota final</span>
                      <strong>{finalSubmission?.totalScore}</strong>
                      <div>
                        <small>Teoria: {finalSubmission?.scoreMcq}</small>
                        <small>
                          Prática: {finalSubmission?.scorePractical}
                        </small>
                      </div>
                    </div>
                    <div className="exam-finished-actions">
                      <button
                        className="btn-primary"
                        onClick={() => setExamFlow("receipt")}
                      >
                        <Icon fafa="faFileLines" width={14} /> Ver comprovante
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setExamFlow("none");
                          loadInitialData();
                        }}
                      >
                        Voltar ao início
                      </button>
                    </div>
                  </div>
                )}
                {examFlow === "receipt" && finalSubmission && (
                  <ExamReceipt
                    examId={finalSubmission.examId}
                    submissionId={finalSubmission.id}
                    onBack={() => setExamFlow("finished")}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        {examFlow === "none" && renderMobileNav()}
      </div>
      {renderConfirmModal()}
    </AppWindow>
  );
};
