import React from "react";

export const ResultsPrintStub = ({ submissions, examTitle, turmaName }) => {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = submissions
      .map(
        (s) => `
      <div class="stub">
        <div class="stub-top">
          <div class="stub-student">${s.displayName || "—"}</div>
          <div class="stub-score">${s.totalScore}</div>
        </div>
        <div class="stub-info">
          <div class="stub-info-item">
            <label>Prova</label>
            <span>${examTitle}</span>
          </div>
          <div class="stub-info-item">
            <label>Professor</label>
            <span>${s.appliedByName || "—"}</span>
          </div>
          <div class="stub-info-item">
            <label>Turma</label>
            <span>${s.turmaName || turmaName || "—"}</span>
          </div>
          <div class="stub-info-item">
            <label>Data</label>
            <span>${
              s.completedAt
                ? new Date(s.completedAt).toLocaleString("pt-BR")
                : "—"
            }</span>
          </div>
        </div>
      </div>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Resultados - ${examTitle}</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1d2733; font-size: 12px; padding: 24px; }
          .print-header { text-align: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #1769aa; }
          .print-header h1 { font-size: 16px; color: #1769aa; font-weight: 800; }
          .print-header p { font-size: 11px; color: #637083; margin-top: 4px; }
          .stub-list { display: flex; flex-direction: column; gap: 12px; }
          .stub { border: 1px solid #d9e1ea; border-radius: 8px; padding: 14px 18px; break-inside: avoid; }
          .stub-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #edf1f5; }
          .stub-student { font-size: 15px; font-weight: 800; color: #1d2733; }
          .stub-score { font-size: 24px; font-weight: 900; color: #1769aa; }
          .stub-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
          .stub-info-item { }
          .stub-info-item label { display: block; font-size: 9px; color: #637083; text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; margin-bottom: 2px; }
          .stub-info-item span { font-size: 12px; font-weight: 700; color: #1d2733; }
          @media print { body { padding: 12px; } .stub-list { gap: 10px; } .stub { padding: 12px 14px; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${examTitle}</h1>
          <p>${turmaName || "Todas as turmas"} &middot; ${
      submissions.length
    } aluno${submissions.length === 1 ? "" : "s"}</p>
        </div>
        <div class="stub-list">${rows}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (submissions.length === 0) return null;

  return (
    <button className="btn-primary" onClick={handlePrint}>
      Imprimir talões ({submissions.length})
    </button>
  );
};
