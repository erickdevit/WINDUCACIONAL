import React, { useRef, useEffect, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfViewer = ({ url, title, onBack }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNumPages(0);

    const loadPdf = async () => {
      try {
        const pdf = await getDocument(url).promise;
        if (cancelled) return;

        setNumPages(pdf.numPages);
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = "";

        const scale = 1.5;
        const pages = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) break;
          pages.push(pdf.getPage(i));
        }

        const loadedPages = await Promise.all(pages);
        if (cancelled) return;

        for (const [index, page] of loadedPages.entries()) {
          if (cancelled) break;

          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.className = "pdf-viewer-page";
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.setAttribute(
            "aria-label",
            `Página ${index + 1} de ${pdf.numPages}`
          );

          container.appendChild(canvas);
          const context = canvas.getContext("2d");
          await page.render({ canvasContext: context, viewport }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Erro ao carregar PDF");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      className="pdf-viewer"
      role="region"
      aria-label={title || "Leitor de PDF"}
    >
      {loading ? (
        <div className="pdf-viewer-status">Carregando PDF...</div>
      ) : null}
      {error ? (
        <div className="pdf-viewer-status pdf-viewer-error">
          <span>Erro ao carregar PDF. Tente novamente.</span>
        </div>
      ) : null}
      <div className="pdf-viewer-pages win11Scroll" ref={containerRef} />
      {!loading && !error && numPages > 0 ? (
        <div className="pdf-viewer-footer">
          <span>
            {numPages} página{numPages !== 1 ? "s" : ""}
          </span>
          {onBack ? (
            <button
              className="pdf-viewer-mobile-back"
              type="button"
              onClick={onBack}
              aria-label="Voltar para apostilas"
              title="Voltar para apostilas"
            >
              Voltar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default PdfViewer;
