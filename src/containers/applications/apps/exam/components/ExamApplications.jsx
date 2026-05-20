import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";
import { TurmaSelector } from "./TurmaSelector";

const assignmentLabels = {
  created: "Criada",
  existing: "Já existia",
  skipped: "Ignorada",
};

const submissionLabels = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  removed: "Removida",
  retained: "Mantida",
  skipped: "Ignorada",
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("pt-BR") : "-";

const getSubmissionStatus = (item) => {
  if (item.removalStatus === "removed") return "removed";
  if (item.removalStatus === "retained" && item.assignmentStatus !== "created") return "retained";
  if (item.assignmentStatus === "skipped") return "skipped";
  return item.submissionStatus || "pending";
};

export const ExamApplications = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCancelled, setShowCancelled] = useState(true);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const loadData = async (turmaId) => {
    setLoading(true);
    try {
      const data = await api.getExamApplications(turmaId || undefined);
      setApplications(data.applications || []);
      setSelectedApplicationId("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(selectedTurmaId); }, [selectedTurmaId]);

  useEffect(() => {
    if (!selectedApplicationId && applications.length > 0) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  const visibleApplications = useMemo(() => {
    if (showCancelled) return applications;
    return applications.filter(a => !a.cancelledAt);
  }, [applications, showCancelled]);

  useEffect(() => {
    if (selectedApplicationId && !visibleApplications.find(a => a.id === selectedApplicationId)) {
      setSelectedApplicationId(visibleApplications[0]?.id || "");
    }
  }, [visibleApplications, selectedApplicationId]);

  const selectedApplication = visibleApplications.find(
    application => application.id === selectedApplicationId
  );

  const totals = useMemo(() => {
    const base = {
      requested: 0, created: 0, existing: 0, skipped: 0,
      removed: 0, retained: 0, completed: 0, inProgress: 0, pending: 0,
    };
    return applications.reduce((acc, application) => {
      acc.requested += application.totalRequested || 0;
      acc.created += application.totalCreated || 0;
      acc.existing += application.totalExisting || 0;
      acc.skipped += application.totalSkipped || 0;
      acc.removed += application.totalRemoved || 0;
      acc.retained += application.totalRetained || 0;
      application.items.forEach(item => {
        const status = getSubmissionStatus(item);
        if (status === "completed") acc.completed += 1;
        if (status === "in_progress") acc.inProgress += 1;
        if (status === "pending") acc.pending += 1;
      });
      return acc;
    }, base);
  }, [applications]);

  const visibleItems = useMemo(() => {
    const items = selectedApplication?.items || [];
    if (statusFilter === "all") return items;
    if (statusFilter === "skipped") return items.filter(item => item.assignmentStatus === "skipped");
    if (statusFilter === "removed") return items.filter(item => item.removalStatus === "removed");
    if (statusFilter === "retained") return items.filter(item => item.removalStatus === "retained");
    return items.filter(item => getSubmissionStatus(item) === statusFilter);
  }, [selectedApplication, statusFilter]);

  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      setConfirmModal({
        title, message,
        onConfirm: () => { setConfirmModal(null); resolve(true); },
        onCancel: () => { setConfirmModal(null); resolve(false); },
      });
    });
  };

  const handleRemoveApplication = async () => {
    if (!selectedApplication || selectedApplication.cancelledAt) return;
    const confirmed = await showConfirm(
      "Remover aplicação",
      "Apenas atribuições criadas nesta aplicação e ainda não iniciadas serão removidas. Provas já iniciadas, concluídas ou atribuições que já existiam serão mantidas."
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await api.deleteExamApplication(selectedApplication.id, {
        reason: "Aplicação removida pelo professor.",
      });
      await loadData(selectedTurmaId);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelledCount = applications.filter(a => a.cancelledAt).length;

  if (loading) {
    return <div className="exam-loader"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div><p>Carregando...</p></div>;
  }

  return (
    <div className="exam-applications animate-fade-in">
      <div className="exam-section-head">
        <h2>Aplicadas</h2>
        <div className="exam-filters">
          <TurmaSelector value={selectedTurmaId} onChange={setSelectedTurmaId} />
          <div className="flex gap-2 items-center">
          {cancelledCount > 0 && (
            <button
              type="button"
              className={`btn-secondary compact ${!showCancelled ? 'active' : ''}`}
              onClick={() => setShowCancelled(!showCancelled)}
              title={showCancelled ? "Ocultar removidas" : "Mostrar removidas"}
            >
              <Icon fafa={showCancelled ? "faEyeSlash" : "faEye"} width={12} />
              {showCancelled ? "Ocultar removidas" : "Mostrar removidas"} ({cancelledCount})
            </button>
          )}
          <button type="button" className="btn-secondary compact" onClick={() => loadData(selectedTurmaId)}>
            <Icon fafa="faRotateRight" width={12} />
          </button>
          </div>
        </div>
      </div>

      <div className="exam-stat-grid four">
        <div className="stat-card"><span className="stat-label">Solicitadas</span><span className="stat-value">{totals.requested}</span></div>
        <div className="stat-card"><span className="stat-label">Criadas</span><span className="stat-value">{totals.created}</span></div>
        <div className="stat-card"><span className="stat-label">Concluídas</span><span className="stat-value">{totals.completed}</span></div>
        <div className="stat-card"><span className="stat-label">Removidas</span><span className="stat-value">{totals.removed}</span></div>
      </div>

      <div className="application-layout">
        <div className="application-list exam-panel">
          <div className="exam-panel-header">
            <h3>Aplicações</h3>
          </div>
          <div className="application-list-scroll win11Scroll">
            {visibleApplications.map(application => (
              <button
                type="button"
                key={application.id}
                className={`application-row ${selectedApplicationId === application.id ? "active" : ""}`}
                onClick={() => setSelectedApplicationId(application.id)}
              >
                <strong>{formatDateTime(application.createdAt)}</strong>
                <span>{application.modeLabel}</span>
                <small>
                  {application.totalCreated} criada{application.totalCreated === 1 ? "" : "s"} · {application.totalExisting} existente{application.totalExisting === 1 ? "" : "s"}
                </small>
                {application.cancelledAt && (
                  <em>Removida em {formatDateTime(application.cancelledAt)}</em>
                )}
              </button>
            ))}
            {visibleApplications.length === 0 && (
              <div className="exam-empty compact">
                {showCancelled ? "Nenhuma aplicação registrada." : "Nenhuma aplicação ativa."}
              </div>
            )}
          </div>
        </div>

        <div className="application-detail exam-panel">
          <div className="application-detail-head">
            <div>
              <h3>{selectedApplication ? formatDateTime(selectedApplication.createdAt) : "Aplicação"}</h3>
              <span>
                {selectedApplication?.appliedBy?.displayName || "Professor"} · {selectedApplication?.modeLabel || "-"}
              </span>
              {selectedApplication?.cancelledAt && (
                <span>
                  Removida por {selectedApplication.cancelledBy?.displayName || "professor"} em {formatDateTime(selectedApplication.cancelledAt)}
                </span>
              )}
            </div>
            <div className="application-actions">
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="in_progress">Em andamento</option>
                <option value="completed">Concluídas</option>
                <option value="removed">Removidas</option>
                <option value="retained">Mantidas</option>
                <option value="skipped">Ignoradas</option>
              </select>
              <button
                type="button"
                className="btn-danger"
                disabled={!selectedApplication || selectedApplication.cancelledAt || actionLoading}
                onClick={handleRemoveApplication}
              >
                <Icon fafa="faTrash" width={12} /> Remover
              </button>
            </div>
          </div>

          <div className="application-table-wrap win11Scroll">
            <table className="application-table">
              <thead>
                <tr>
                  <th>Prova</th>
                  <th>Aluno</th>
                  <th>Atribuição</th>
                  <th>Submissão</th>
                  <th>Nota</th>
                  <th>Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map(item => {
                  const submissionStatus = getSubmissionStatus(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.examTitle || "Prova indisponível"}</strong>
                        <small>{item.turmaName || "Sem turma"}</small>
                      </td>
                      <td>
                        <strong>{item.displayName || "Aluno indisponível"}</strong>
                        <small>{item.username ? `@${item.username}` : "-"}</small>
                      </td>
                      <td>
                        <span className={`trace-pill ${item.assignmentStatus}`}>
                          {assignmentLabels[item.assignmentStatus] || item.assignmentStatus}
                        </span>
                        <small>{item.reason}</small>
                        {item.removalStatus !== "active" && (
                          <small>{item.removalReason}</small>
                        )}
                      </td>
                      <td>
                        <span className={`trace-pill ${submissionStatus}`}>
                          {submissionLabels[submissionStatus] || "Ignorada"}
                        </span>
                      </td>
                      <td className="font-bold text-blue-600">{item.totalScore}</td>
                      <td>{formatDateTime(item.completedAt)}</td>
                    </tr>
                  );
                })}
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="exam-empty compact">Nenhum registro neste filtro.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirmModal && (
        <div className="question-modal-backdrop" role="presentation">
          <div className="question-modal animate-scale-up" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
            <div className="question-modal-head">
              <h3>{confirmModal.title}</h3>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ marginBottom: 20, lineHeight: 1.6 }}>{confirmModal.message}</p>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn-secondary" onClick={confirmModal.onCancel}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={confirmModal.onConfirm}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
