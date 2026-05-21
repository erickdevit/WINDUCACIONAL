import React from "react";

export const ResultsPrintStub = ({ submissions, examTitle, turmaName }) => {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = submissions
      .map(
        (s) => `
      <div class="stub">
        <div class="stub-head">
          <strong>${s.displayName || "—"}</strong>
          <span class="stub-score">${s.totalScore}</span>
        </div>
        <div class="stub-meta">
          <span>T: ${s.scoreMcq}</span>
          <span>P: ${s.scorePractical}</span>
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
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1d2733; font-size: 11px; padding: 20px; }
          .print-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1769aa; }
          .print-header h1 { font-size: 16px; color: #1769aa; font-weight: 800; }
          .print-header p { font-size: 11px; color: #637083; margin-top: 4px; }
          .stub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
          .stub { border: 1px solid #d9e1ea; border-radius: 6px; padding: 10px 12px; break-inside: avoid; }
          .stub-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
          .stub-head strong { font-size: 12px; font-weight: 700; color: #1d2733; }
          .stub-score { font-size: 18px; font-weight: 900; color: #1769aa; }
          .stub-meta { display: flex; gap: 10px; font-size: 10px; color: #637083; }
          .stub-meta span { font-weight: 700; }
          @media print { body { padding: 10px; } .stub-grid { gap: 8px; } .stub { padding: 8px 10px; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${examTitle}</h1>
          <p>${turmaName || "Todas as turmas"} &middot; ${submissions.length} aluno${submissions.length === 1 ? "" : "s"}</p>
        </div>
        <div class="stub-grid">${rows}</div>
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
