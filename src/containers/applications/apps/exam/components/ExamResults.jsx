import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import { ExamReceipt } from "./ExamReceipt";
import { TurmaSelector } from "./TurmaSelector";
import { ResultsPrintStub } from "./ResultsPrintStub";

export const ExamResults = () => {
  const [submissions, setSubmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
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

  useEffect(() => {
    if (selectedExamId !== "all") {
      api.getExamSubmissions(selectedExamId, selectedTurmaId || undefined).then(data => {
        setSubmissions(data.submissions || []);
      });
    } else {
      setSubmissions([]);
    }
  }, [selectedExamId, selectedTurmaId]);

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)));
    }
  };

  if (selectedSubmission) {
    return (
      <ExamReceipt
        examId={selectedSubmission.examId}
        submissionId={selectedSubmission.id}
        onBack={() => setSelectedSubmission(null)}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="exam-section-head">
        <h2>Resultados</h2>
        <div className="exam-filters">
          <TurmaSelector value={selectedTurmaId} onChange={setSelectedTurmaId} />
          <select 
            className="turma-select"
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
          >
            <option value="all">Selecione uma prova...</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none" style={{ color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={submissions.length > 0 && selectedIds.size === submissions.length}
            onChange={toggleAll}
            className="w-4 h-4"
          />
          Selecionar todos
        </label>
        {selectedIds.size > 0 && (
          <ResultsPrintStub
            submissions={submissions.filter(s => selectedIds.has(s.id))}
            examTitle={selectedExam?.title || "Avaliação"}
            turmaName={submissions.find(s => s.turmaName)?.turmaName || ""}
          />
        )}
      </div>

      <div className="exam-panel exam-results-panel win11Scroll">
        <table className="application-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Aluno</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>MCQ</th>
              <th style={{ textAlign: "center" }}>Prática</th>
              <th style={{ textAlign: "center" }}>Total</th>
              <th style={{ textAlign: "right" }}>Data</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(sub => (
              <tr
                key={sub.id}
                className="cursor-pointer"
                onClick={() => setSelectedSubmission(sub)}
                title="Clique para ver o comprovante"
              >
                <td style={{ width: 32 }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(sub.id)}
                    onChange={() => toggleSelect(sub.id)}
                    className="w-4 h-4"
                  />
                </td>
                <td>
                  <strong>{sub.displayName}</strong>
                  <small>@{sub.username}</small>
                </td>
                <td>
                  <span className={`trace-pill ${sub.status}`}>
                    {sub.status === 'completed' ? 'Concluída' : 'Em andamento'}
                  </span>
                </td>
                <td style={{ textAlign: "center", fontWeight: 700 }}>{sub.scoreMcq}</td>
                <td style={{ textAlign: "center", fontWeight: 700 }}>{sub.scorePractical}</td>
                <td style={{ textAlign: "center", fontWeight: 900, color: "var(--accent)" }}>{sub.totalScore}</td>
                <td style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
                  {sub.completedAt ? new Date(sub.completedAt).toLocaleString() : '---'}
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="exam-empty compact">
                    {selectedExamId === 'all' ? 'Selecione uma prova para ver os resultados.' : 'Nenhuma submissão encontrada.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
