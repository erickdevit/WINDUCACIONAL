import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Icon } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
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
  const wnapp = useSelector((state) => state.apps.exam || {});
  const user = useSelector((state) => state.setting.person);
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFlow, setExamFlow] = useState("none"); // none, intro, mcq, practical, finished, receipt
  const [currentExam, setCurrentExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [finalSubmission, setFinalSubmission] = useState(null);
  const [practicalFinishSignal, setPracticalFinishSignal] = useState(0);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }

  const isProfessor = user.role === "professor";
  const pendingExams = exams.filter((exam) => exam.submissionStatus !== "completed");
  const completedExams = exams.filter((exam) => exam.submissionStatus === "completed");
  const publishedCount = exams.filter((exam) => exam.isPublished).length;
  const draftCount = Math.max(exams.length - publishedCount, 0);
  const timedCount = (isProfessor ? exams : pendingExams).filter(
    (exam) => Number(exam.timeLimit || 0) > 0
  ).length;

  useEffect(() => {
    if (!wnapp.hide) {
      loadInitialData();
    }
  }, [wnapp.hide]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const examsData = await api.getExams();
      setExams(examsData.exams || []);
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

  const navItems = isProfessor ? [
    { id: "dashboard", label: "Visão Geral", fafa: "faTableColumns" },
    { id: "exams", label: "Provas", fafa: "faClipboardList" },
    { id: "apply", label: "Aplicação", fafa: "faPaperPlane" },
    { id: "applications", label: "Aplicadas", fafa: "faClockRotateLeft" },
    { id: "results", label: "Resultados", fafa: "faListCheck" },
    { id: "analytics", label: "Análise", fafa: "faChartSimple" },
  ] : [
    { id: "dashboard", label: "Resumo", fafa: "faTableColumns" },
    { id: "available", label: "Disponíveis", fafa: "faClipboardList" },
    { id: "history", label: "Histórico", fafa: "faListCheck" },
  ];

  const currentNavItem = navItems.find((item) => item.id === activeTab);

  const handleStartExam = async (exam) => {
    if (exam.submissionStatus === "completed") {
      showAlert("Esta avaliação já foi concluída. Consulte o histórico para ver o comprovante.");
      return;
    }
    setLoading(true);
    try {
      const details = await api.getExamDetails(exam.id);
      setCurrentExam(details.exam);
      setQuestions(details.questions);
      setExamFlow("intro");
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = () => {
    showAlert("O tempo acabou! Sua prova será enviada automaticamente.");
    if (examFlow === "mcq") {
      setExamFlow("practical");
    } else if (examFlow === "practical") {
      setPracticalFinishSignal((value) => value + 1);
    }
  };

  const renderConfirmModal = () => {
    if (!confirmModal) return null;
    return (
      <div className="question-modal-backdrop" role="presentation">
        <div className="question-modal animate-scale-up" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
          <div className="question-modal-head">
            <h3>{confirmModal.title}</h3>
          </div>
          <div style={{ padding: 20 }}>
            <p style={{ marginBottom: 20, lineHeight: 1.6 }}>{confirmModal.message}</p>
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
          <p>
            {examFlow === 'mcq' ? 'Fase 1: Teoria' : 'Fase 2: Prática'}
          </p>
        </div>
      </div>
      <ExamTimer minutes={currentExam?.timeLimit} onTimeUp={handleTimeUp} />
    </div>
  );

  const renderSidebar = () => (
    <div className={`exam-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="exam-brand">
        <div className="exam-brand-icon">
          <Icon src="exam" width={24} />
        </div>
        <div className="nav-text">
          <strong>Avaliação</strong>
          <span>{isProfessor ? "Professor" : "Aluno"}</span>
        </div>
      </div>
      
      <div className="exam-nav">
        {navItems.map(item => (
          <button
            type="button"
            key={item.id}
            className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
          >
            {item.fafa ? <Icon fafa={item.fafa} width={16} /> : <Icon src={item.icon} width={18} />}
            <span className="nav-text">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="exam-sidebar-footer">
        <button type="button" className="nav-link" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <Icon fafa={sidebarCollapsed ? "faAngleRight" : "faAngleLeft"} width={14} />
          <span className="nav-text">Recolher</span>
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="exam-page animate-fade-in">
      <div className="exam-page-heading">
        <div>
          <p className="exam-kicker">Área do aluno</p>
          <h2>Olá, {user.displayName}</h2>
          <span>{pendingExams.length} avaliação{pendingExams.length === 1 ? "" : "ões"} pendente{pendingExams.length === 1 ? "" : "s"}.</span>
        </div>
      </div>

      <div className="exam-stat-grid">
        <div className="stat-card">
          <span className="stat-label">Pendentes</span>
          <span className="stat-value">{pendingExams.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Concluídas</span>
          <span className="stat-value">{completedExams.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Com tempo</span>
          <span className="stat-value">{timedCount}</span>
        </div>
      </div>

      <div className="exam-panel">
        <div className="exam-panel-header">
          <h3>Próximas avaliações</h3>
          <button type="button" className="btn-secondary" onClick={() => setActiveTab("available")}>Ver provas</button>
        </div>
        {pendingExams.slice(0, 4).map((exam) => (
          <button type="button" key={exam.id} className="exam-list-row" onClick={() => handleStartExam(exam)}>
            <span>
              <strong>{exam.title}</strong>
              <small>{exam.description || "Sem descrição."}</small>
            </span>
            <em>{exam.timeLimit > 0 ? `${exam.timeLimit} min` : "Sem limite"}</em>
          </button>
        ))}
        {pendingExams.length === 0 && <div className="exam-empty compact">Nenhuma avaliação pendente.</div>}
      </div>
    </div>
  );

  const renderTeacherDashboard = () => (
    <div className="exam-page animate-fade-in">
      <div className="exam-page-heading">
        <div>
          <p className="exam-kicker">Área do professor</p>
          <h2>Visão geral</h2>
          <span>{exams.length} prova{exams.length === 1 ? "" : "s"} no catálogo.</span>
        </div>
        <button type="button" className="btn-primary" onClick={() => setActiveTab("exams")}>
          <Icon fafa="faPlus" width={13} /> Nova prova
        </button>
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
          <span className="stat-value">{timedCount}</span>
        </div>
      </div>

      <div className="exam-panel">
        <div className="exam-panel-header">
          <h3>Provas recentes</h3>
          <button type="button" className="btn-secondary" onClick={() => setActiveTab("results")}>Resultados</button>
        </div>
        {exams.slice(0, 5).map((exam) => (
          <button type="button" key={exam.id} className="exam-list-row" onClick={() => setActiveTab("exams")}>
            <span>
              <strong>{exam.title}</strong>
              <small>{exam.isPublished ? "Publicada" : "Rascunho"} · {exam.timeLimit > 0 ? `${exam.timeLimit} min` : "Sem limite"}</small>
            </span>
            <em>{new Date(exam.createdAt).toLocaleDateString()}</em>
          </button>
        ))}
        {exams.length === 0 && <div className="exam-empty compact">Crie a primeira prova para começar.</div>}
      </div>
    </div>
  );

  const renderExamList = () => (
    <div className="exam-page animate-fade-in">
      <div className="exam-page-heading">
        <div>
          <p className="exam-kicker">Aluno</p>
          <h2>Provas disponíveis</h2>
          <span>Abra uma avaliação para iniciar teoria e prática.</span>
        </div>
      </div>
      <div className="exam-grid">
        {pendingExams.map(exam => (
          <div key={exam.id} className="exam-card">
            <div className="exam-card-top">
              <div className="exam-card-icon"><Icon src="exam" width={24} /></div>
              <span className="exam-pill">{exam.timeLimit > 0 ? `${exam.timeLimit} min` : "Sem limite"}</span>
            </div>
            <h3>{exam.title}</h3>
            <p>{exam.description || "Sem descrição."}</p>
            <button className="btn-primary" onClick={() => handleStartExam(exam)}>
              Iniciar Avaliação
            </button>
          </div>
        ))}
        {completedExams.length > 0 && (
          <>
            <div className="exam-grid-divider">
              <span>Concluídas ({completedExams.length})</span>
            </div>
            {completedExams.map(exam => (
              <div key={exam.id} className="exam-card completed">
                <div className="exam-card-top">
                  <div className="exam-card-icon"><Icon fafa="faCheck" width={18} /></div>
                  <span className="exam-pill">Concluída</span>
                </div>
                <h3>{exam.title}</h3>
                <p>{exam.description || "Sem descrição."}</p>
                <button
                  className="btn-secondary"
                  onClick={() => setActiveTab("history")}
                >
                  Ver no histórico
                </button>
              </div>
            ))}
          </>
        )}
        {pendingExams.length === 0 && completedExams.length === 0 && !loading && (
          <div className="exam-empty">
            Nenhuma prova disponível no momento.
          </div>
        )}
      </div>
    </div>
  );

  const submitCurrentExam = async (practicalSnapshot = {}, mcqAnswerSnapshot = mcqAnswers) => {
    setLoading(true);
    try {
      const mcqResults = questions
        .filter(q => q.type === 'mcq')
        .map(q => ({
          questionId: q.id,
          answerText: mcqAnswerSnapshot[q.id] || ""
        }));

      const res = await api.submitExam(currentExam.id, {
        status: 'completed',
        answers: mcqResults,
        practicalSnapshot
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
        .filter(q => q.type === 'mcq')
        .map(q => ({
          questionId: q.id,
          answerText: mcqAnswerSnapshot[q.id] || ""
        }));

      await api.submitExam(currentExam.id, {
        status: 'in_progress',
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
    if (confirmed) {
      getIsolatedState();
    }
  };

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Carregando...</p>
      </div>
    );

    switch (activeTab) {
      case "dashboard": return isProfessor ? renderTeacherDashboard() : renderDashboard();
      case "available": return renderExamList();
      case "exams": return <ExamManagement />;
      case "apply": return <ExamAssignment />;
      case "applications": return <ExamApplications />;
      case "results": return <ExamResults />;
      case "analytics": return <ExamAnalytics />;
      case "history": return <StudentHistory />;
      default: return <div className="text-center py-20 text-gray-400">Funcionalidade "{activeTab}" em desenvolvimento...</div>;
    }
  };

  if (examFlow === "practical") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
        {renderExamHeader()}
        <div className="flex-grow relative">
          <ExamContainer 
            initialState={currentExam?.containerInitialState}
            instructions={questions.filter(q => q.type === 'practical')}
            onFinish={finishPractical}
            finishSignal={practicalFinishSignal}
            onFinishClick={handleFinishPracticalClick}
          />
        </div>
        {renderConfirmModal()}
      </div>
    );
  }

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
          {examFlow === "none" && (
            <div className="exam-topbar">
              <div>
                <strong>{currentNavItem?.label}</strong>
                <span>{isProfessor ? "Gestão de avaliações" : "Avaliações do aluno"}</span>
              </div>
            </div>
          )}
          <div className="exam-content win11Scroll">
            {examFlow === "none" ? renderContent() : (
              <div className="exam-flow-content">
                {examFlow === "intro" && (
                   <div className="exam-intro animate-scale-up">
                   <div className="exam-intro-header">
                      <div className="exam-app-icon large"><Icon src="exam" width={32} invert /></div>
                      <span className="exam-pill">{currentExam?.timeLimit > 0 ? `${currentExam.timeLimit} minutos` : 'Sem limite'}</span>
                   </div>
                   <h2>{currentExam?.title}</h2>
                   <p>{currentExam?.description || "Sem descrição."}</p>
                   <div className="exam-rule-grid">
                     <div><strong>Teoria</strong><span>{questions.filter(q => q.type === "mcq").length} questão{questions.filter(q => q.type === "mcq").length === 1 ? "" : "ões"}</span></div>
                     <div><strong>Prática</strong><span>{questions.filter(q => q.type === "practical").length} tarefa{questions.filter(q => q.type === "practical").length === 1 ? "" : "s"}</span></div>
                     <div><strong>Retorno</strong><span>A prática encerra a avaliação</span></div>
                   </div>
                   <button 
                     onClick={() => {
                       if (questions.some(q => q.type === "mcq")) {
                         setExamFlow("mcq");
                       } else if (questions.some(q => q.type === "practical")) {
                         setExamFlow("practical");
                       } else {
                         submitCurrentExam();
                       }
                     }}
                     className="btn-primary exam-start-button"
                   >
                     Iniciar avaliação
                   </button>
                 </div>
                )}
                {examFlow === "mcq" && (
                  <div className="animate-fade-in">
                    {renderExamHeader()}
                    <MCQView questions={questions} onFinish={(ans) => {
                      setMcqAnswers(ans);
                      if (questions.some(q => q.type === "practical")) {
                        savePartialProgress(ans);
                        setExamFlow("practical");
                      } else {
                        submitCurrentExam({}, ans);
                      }
                    }} />
                  </div>
                )}
                {examFlow === "finished" && (
                  <div className="exam-finished animate-scale-up">
                    <div className="exam-app-icon success"><Icon fafa="faCheck" width={28} /></div>
                    <h2>Avaliação entregue</h2>
                    <p>As respostas foram corrigidas pelo servidor.</p>
                    <div className="exam-score-card">
                       <span>Nota final</span>
                       <strong>{finalSubmission?.totalScore}</strong>
                       <div>
                         <small>Teoria: {finalSubmission?.scoreMcq}</small>
                         <small>Prática: {finalSubmission?.scorePractical}</small>
                       </div>
                    </div>
                    <div className="exam-finished-actions">
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          setExamFlow("receipt");
                        }}
                      >
                        <Icon fafa="faFileLines" width={14} /> Ver comprovante
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={() => { setExamFlow("none"); loadInitialData(); }}
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
      </div>
      {renderConfirmModal()}
    </AppWindow>
  );
};
