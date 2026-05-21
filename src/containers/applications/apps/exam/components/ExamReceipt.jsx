import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { api } from "../../../../../lib/api";
import { Icon } from "../../../../../utils/general";
import { ActivityTimeline } from "./ActivityTimeline";

export const ExamReceipt = ({ examId, submissionId, onBack }) => {
  const user = useSelector((state) => state.setting.person);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const receiptRef = useRef(null);

  useEffect(() => {
    loadDetails();
  }, [examId, submissionId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const result = await api.getSubmissionDetails(examId, submissionId);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Comprovante de Avaliação</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1d2733; padding: 32px; font-size: 12px; line-height: 1.6; }
          .receipt-header { border-bottom: 2px solid #1769aa; padding-bottom: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
          .receipt-header h1 { font-size: 20px; color: #1769aa; font-weight: 800; margin: 0; letter-spacing: -0.01em; }
          .receipt-header p { font-size: 11px; color: #637083; margin: 2px 0 0; }
          .receipt-info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .receipt-info-item { padding: 12px 14px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; background: #fafbfc; }
          .receipt-info-item:nth-child(3n) { border-right: 0; }
          .receipt-info-item:nth-last-child(-n+3) { border-bottom: 0; }
          .receipt-info-item label { display: block; font-size: 9px; color: #637083; text-transform: uppercase; font-weight: 800; margin-bottom: 3px; letter-spacing: 0.04em; }
          .receipt-info-item span { font-weight: 700; font-size: 13px; color: #1d2733; }
          .receipt-scores { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; margin-bottom: 28px; text-align: center; border: 1px solid #d9e1ea; border-radius: 8px; overflow: hidden; }
          .receipt-scores.no-practical { grid-template-columns: 1fr 1fr; }
          .receipt-scores > div { padding: 16px 12px; }
          .receipt-scores > div:not(:last-child) { border-right: 1px solid #e2e8f0; }
          .receipt-scores label { display: block; font-size: 10px; color: #637083; text-transform: uppercase; font-weight: 800; margin-bottom: 5px; letter-spacing: 0.03em; }
          .receipt-scores .score-value { font-size: 24px; font-weight: 700; color: #1d2733; }
          .receipt-scores .score-total { font-size: 30px; font-weight: 900; color: #1769aa; }
          .receipt-section-title { font-size: 13px; font-weight: 800; color: #1d2733; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          th { background: #f6f8fa; text-align: left; padding: 9px 12px; font-size: 9px; text-transform: uppercase; color: #637083; font-weight: 800; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          tr:last-child td { border-bottom: 0; }
          .correct { color: #16794c; font-weight: 800; }
          .incorrect { color: #b42318; font-weight: 800; }
          .receipt-footer { border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 4px; text-align: center; font-size: 10px; color: #637083; }
          .validation-detail { font-size: 11px; color: #637083; margin-top: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (loading) {
    return (
      <div className="exam-loader">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p>Carregando comprovante...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="exam-empty">
        Não foi possível carregar os detalhes da submissão.
      </div>
    );
  }

  const { submission, answers, practicalSnapshot } = data;
  const isProfessor = user.role === "professor";
  const mcqAnswers = answers.filter((a) => a.type === "mcq");
  const practicalAnswers = answers.filter((a) => a.type === "practical");
  const trackedActions = practicalSnapshot?.actions || [];

  const getOptionLabel = (options, letterAnswer) => {
    if (!letterAnswer || !Array.isArray(options)) return "—";
    const index = letterAnswer.charCodeAt(0) - 97;
    return options[index] != null ? `${letterAnswer}) ${options[index]}` : letterAnswer;
  };

  const getValidationLabel = (rule) => {
    if (!rule) return "";
    if (rule.type === "ACTION_PERFORMED") return `Ação: ${rule.name || "—"}`;
    if (rule.type === "FILE_CONTAINS") return `Arquivo: ${rule.path || "—"} contém "${rule.content || "—"}"`;
    return rule.type;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="icon-button" title="Voltar">
            <Icon fafa="faArrowLeft" width={16} />
          </button>
          <h2 style={{ fontSize: 20 }}>Comprovante</h2>
        </div>
        <div className="flex gap-2 items-center">
          {isProfessor && trackedActions.length > 0 && (
            <button
              className={`btn-secondary compact ${showTimeline ? 'active' : ''}`}
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <Icon fafa="faTimeline" width={13} />
              {showTimeline ? "Ocultar atividade" : "Ver atividade"}
            </button>
          )}
          <button className="btn-primary" onClick={handlePrint}>
            <Icon fafa="faPrint" width={14} /> Imprimir
          </button>
        </div>
      </div>

      {showTimeline && (
        <div className="exam-panel" style={{ marginBottom: 16, padding: 16 }}>
          <h3 className="exam-card-title" style={{ marginBottom: 12 }}>
            <Icon fafa="faTimeline" width={14} /> Atividade do aluno
          </h3>
          <ActivityTimeline actions={trackedActions} />
        </div>
      )}

      <div ref={receiptRef} className="receipt-printable">
        <div className="receipt-header">
          <div>
            <h1>Comprovante de Avaliação</h1>
            <p>Simulador Educacional</p>
          </div>
          <p>
            {submission.completedAt
              ? new Date(submission.completedAt).toLocaleString("pt-BR")
              : "Não finalizada"}
          </p>
        </div>

        <div className="receipt-info-grid">
          <div className="receipt-info-item">
            <label>Avaliação</label>
            <span>{submission.examTitle || "—"}</span>
          </div>
          <div className="receipt-info-item">
            <label>Aluno</label>
            <span>{submission.displayName || "—"}</span>
          </div>
          <div className="receipt-info-item">
            <label>Turma</label>
            <span>{submission.turmaName || "Sem turma"}</span>
          </div>
          <div className="receipt-info-item">
            <label>Professor</label>
            <span>{submission.appliedByName || "—"}</span>
          </div>
          <div className="receipt-info-item">
            <label>Tempo da prova</label>
            <span>
              {submission.examTimeLimit > 0
                ? `${submission.examTimeLimit} minutos`
                : "Sem limite"}
            </span>
          </div>
        </div>

        <div className={`receipt-scores ${practicalAnswers.length === 0 ? 'no-practical' : ''}`}>
          <div>
            <label>Nota Teoria</label>
            <div className="score-value">{submission.scoreMcq}</div>
          </div>
          {practicalAnswers.length > 0 && (
            <div>
              <label>Nota Prática</label>
              <div className="score-value">{submission.scorePractical}</div>
            </div>
          )}
          <div>
            <label>Total Final</label>
            <div className="score-value score-total">{submission.totalScore}</div>
          </div>
        </div>

        {mcqAnswers.length > 0 && (
          <>
            <h3 className="receipt-section-title">
              Questões Teóricas ({mcqAnswers.length})
            </h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Enunciado</th>
                  <th>Resposta</th>
                  {isProfessor && <th>Gabarito</th>}
                  <th style={{ width: 60, textAlign: "center" }}>Acerto</th>
                  <th style={{ width: 60, textAlign: "center" }}>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {mcqAnswers.map((a, i) => (
                  <tr key={a.questionId}>
                    <td>{i + 1}</td>
                    <td>{a.text}</td>
                    <td>{getOptionLabel(a.options, a.answerText)}</td>
                    {isProfessor && (
                      <td>{getOptionLabel(a.options, a.correctAnswer)}</td>
                    )}
                    <td
                      className={a.isCorrect ? "correct" : "incorrect"}
                      style={{ textAlign: "center" }}
                    >
                      {a.isCorrect ? "Sim" : "Não"}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      {a.pointsAwarded}/{a.pointsTotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {practicalAnswers.length > 0 && (
          <>
            <h3 className="receipt-section-title">
              Tarefas Práticas ({practicalAnswers.length})
            </h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Instrução</th>
                  {isProfessor && <th>Validação</th>}
                  <th style={{ width: 60, textAlign: "center" }}>Acerto</th>
                  <th style={{ width: 60, textAlign: "center" }}>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {practicalAnswers.map((a, i) => (
                  <tr key={a.questionId}>
                    <td>{i + 1}</td>
                    <td>{a.text}</td>
                    {isProfessor && (
                      <td>
                        {a.validationRules?.map((rule, ri) => (
                          <div key={ri} className="validation-detail">
                            {getValidationLabel(rule)}
                          </div>
                        )) || "—"}
                      </td>
                    )}
                    <td
                      className={a.isCorrect ? "correct" : "incorrect"}
                      style={{ textAlign: "center" }}
                    >
                      {a.isCorrect ? "Sim" : "Não"}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      {a.pointsAwarded}/{a.pointsTotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="receipt-footer">
          <p>
            Este documento é um comprovante de avaliação gerado automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
};
