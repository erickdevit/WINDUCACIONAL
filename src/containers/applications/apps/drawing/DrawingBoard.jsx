import React, { useCallback, useEffect, useRef, useState } from "react";

export const DRAWING_COLORS = [
  "#172033",
  "#6d28d9",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#eab308",
  "#ea580c",
  "#dc2626",
];

export const drawStrokes = (canvas, strokes = [], backgroundColor = "#ffffff") => {
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(bounds.width * scale));
  canvas.height = Math.max(1, Math.round(bounds.height * scale));

  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, bounds.width, bounds.height);
  context.lineCap = "round";
  context.lineJoin = "round";

  strokes.forEach((stroke) => {
    if (!Array.isArray(stroke.points) || stroke.points.length < 2) return;
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * bounds.width;
      const y = point.y * bounds.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  });
};

export const DrawingPreview = ({
  strokes = [],
  backgroundColor = "#ffffff",
  label = "Prévia do desenho",
}) => {
  const canvasRef = useRef(null);
  const repaint = useCallback(
    () => drawStrokes(canvasRef.current, strokes, backgroundColor),
    [backgroundColor, strokes]
  );

  useEffect(() => {
    repaint();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", repaint);
      return () => window.removeEventListener("resize", repaint);
    }
    const observer = new ResizeObserver(repaint);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [repaint]);

  return <canvas ref={canvasRef} aria-label={label} />;
};

export const DrawingBoard = ({
  strokes = [],
  backgroundColor = "#ffffff",
  readonly = false,
  collaborative = false,
  busy = false,
  onCommit,
}) => {
  const canvasRef = useRef(null);
  const activeStrokeRef = useRef(null);
  const [color, setColor] = useState(DRAWING_COLORS[0]);
  const [width, setWidth] = useState(5);
  const [tool, setTool] = useState("brush");

  const repaint = useCallback(
    (previewStroke) => {
      drawStrokes(
        canvasRef.current,
        previewStroke ? [...strokes, previewStroke] : strokes,
        backgroundColor
      );
    },
    [backgroundColor, strokes]
  );

  useEffect(() => {
    repaint();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", repaint);
      return () => window.removeEventListener("resize", repaint);
    }
    const observer = new ResizeObserver(repaint);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [repaint]);

  const readPoint = (event) => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const handlePointerDown = (event) => {
    if (readonly || busy) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStrokeRef.current = {
      color: tool === "eraser" ? backgroundColor : color,
      width: tool === "eraser" ? Math.max(width * 2.4, 12) : width,
      points: [readPoint(event)],
    };
  };

  const handlePointerMove = (event) => {
    if (!activeStrokeRef.current) return;
    activeStrokeRef.current.points.push(readPoint(event));
    repaint(activeStrokeRef.current);
  };

  const finishStroke = () => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    if (stroke.points.length === 1) {
      stroke.points.push({ ...stroke.points[0] });
    }
    activeStrokeRef.current = null;
    const nextStrokes = [...strokes, stroke];
    repaint(stroke);
    onCommit?.({ action: "append", stroke, nextStrokes });
  };

  const handleUndo = () => {
    if (!strokes.length || collaborative) return;
    onCommit?.({ action: "replace", strokes: strokes.slice(0, -1) });
  };

  const handleClear = () => {
    if (!strokes.length || collaborative) return;
    onCommit?.({ action: "clear", strokes: [] });
  };

  return (
    <div className="drawingCanvasShell" data-readonly={readonly}>
      {!readonly && (
        <div className="drawingToolbar" aria-label="Ferramentas de desenho">
          <div className="drawingToolGroup" aria-label="Tipo de ferramenta">
            <button
              type="button"
              className={tool === "brush" ? "active" : ""}
              aria-pressed={tool === "brush"}
              onClick={() => setTool("brush")}
            >
              Pincel
            </button>
            <button
              type="button"
              className={tool === "eraser" ? "active" : ""}
              aria-pressed={tool === "eraser"}
              onClick={() => setTool("eraser")}
            >
              Borracha
            </button>
          </div>

          <div className="drawingColorPalette" aria-label="Cores">
            {DRAWING_COLORS.map((item) => (
              <button
                type="button"
                key={item}
                className={color === item && tool === "brush" ? "active" : ""}
                aria-label={`Usar a cor ${item}`}
                aria-pressed={color === item && tool === "brush"}
                style={{ "--drawing-swatch": item }}
                onClick={() => {
                  setColor(item);
                  setTool("brush");
                }}
              />
            ))}
            <label className="drawingCustomColor" title="Escolher outra cor">
              <span>+</span>
              <input
                type="color"
                aria-label="Escolher outra cor"
                value={color}
                onChange={(event) => {
                  setColor(event.target.value);
                  setTool("brush");
                }}
              />
            </label>
          </div>

          <label className="drawingWidthControl">
            <span>Espessura</span>
            <input
              type="range"
              min="1"
              max="18"
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
          </label>

          {!collaborative && (
            <div className="drawingHistoryActions">
              <button
                type="button"
                disabled={!strokes.length || busy}
                onClick={handleUndo}
              >
                Desfazer
              </button>
              <button
                type="button"
                className="danger"
                disabled={!strokes.length || busy}
                onClick={handleClear}
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="drawingCanvasStage">
        <canvas
          ref={canvasRef}
          className="drawingCanvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label={readonly ? "Visualização do desenho" : "Quadro de desenho"}
        />
        {readonly && !strokes.length && (
          <div className="drawingCanvasPlaceholder">
            <span />
            <strong>Nenhum traço ainda</strong>
            <p>O desenho aparecerá aqui em tempo real.</p>
          </div>
        )}
      </div>

      {!readonly && (
        <div className="drawingCanvasFooter">
          <span className={`drawingSaveIndicator ${busy ? "saving" : ""}`}>
            <i /> {busy ? "Sincronizando…" : "Desenho sincronizado"}
          </span>
          <span>{strokes.length} traço{strokes.length === 1 ? "" : "s"}</span>
        </div>
      )}
    </div>
  );
};
