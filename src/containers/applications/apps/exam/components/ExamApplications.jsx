import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";

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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getExamApplications();
      setApplications(data.applications || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedApplicationId && applications.length > 0) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication = applications.find(
    application => application.id === selectedApplicationId
  );

  const totals = useMemo(() => {
    const base = {
      requested: 0,
      created: 0,
      existing: 0,
      skipped: 0,
      removed: 0,
      retained: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
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
    if (statusFilter === "skipped") {
      return items.filter(item => item.assignmentStatus === "skipped");
    }
    if (statusFilter === "removed") {
      return items.filter(item => item.removalStatus === "removed");
    }
    if (statusFilter === "retained") {
      return items.filter(item => item.removalStatus === "retained");
    }
    return items.filter(item => getSubmissionStatus(item) === statusFilter);
  }, [selectedApplication, statusFilter]);

  const handleRemoveApplication = async () => {
    if (!selectedApplication || selectedApplication.cancelledAt) return;
    const confirmed = confirm(
      "Remover esta aplicação?\n\nApenas atribuições criadas nesta aplicação e ainda não iniciadas serão removidas. Provas já iniciadas, concluídas ou atribuições que já existiam serão mantidas com registro de auditoria."
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await api.deleteExamApplication(selectedApplication.id, {
        reason: "Aplicação removida pelo professor.",
      });
      await loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-gray-400 font-bold">Carregando aplicações...</div>;
  }

  return (
    <div className="exam-applications animate-fade-in">
      <div className="exam-section-head">
        <div>
          <h2>Provas aplicadas</h2>
          <span>Rastreabilidade por aplicação, aluno e submissão.</span>
        </div>
        <button type="button" className="btn-secondary" onClick={loadData}>
          <Icon fafa="faRotateRight" width={13} /> Atualizar
        </button>
      </div>

      <div className="exam-stat-grid four">
        <div className="stat-card">
          <span className="stat-label">Solicitadas</span>
          <span className="stat-value">{totals.requested}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Criadas</span>
          <span className="stat-value">{totals.created}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Concluídas</span>
          <span className="stat-value">{totals.completed}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Removidas</span>
          <span className="stat-value">{totals.removed}</span>
        </div>
      </div>

      <div className="application-layout">
        <div className="application-list exam-panel">
          <div className="exam-panel-header">
            <h3>Aplicações</h3>
          </div>
          <div className="application-list-scroll win11Scroll">
            {applications.map(application => (
              <button
                type="button"
                key={application.id}
                className={`application-row ${selectedApplicationId === application.id ? "active" : ""}`}
                onClick={() => setSelectedApplicationId(application.id)}
              >
                <strong>{formatDateTime(application.createdAt)}</strong>
                <span>{application.modeLabel}</span>
                <small>
                  {application.totalCreated} criada{application.totalCreated === 1 ? "" : "s"} · {application.totalExisting} existente{application.totalExisting === 1 ? "" : "s"} · {application.totalSkipped} ignorada{application.totalSkipped === 1 ? "" : "s"}
                </small>
                {application.cancelledAt && (
                  <em>Removida em {formatDateTime(application.cancelledAt)}</em>
                )}
              </button>
            ))}
            {applications.length === 0 && (
              <div className="exam-empty compact">Nenhuma aplicação registrada.</div>
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
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
              >
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
    </div>
  );
};
