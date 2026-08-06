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

export const BRUSH_TYPES = [
  { id: "brush", label: "Padrão" },
  { id: "pencil", label: "Lápis" },
  { id: "highlighter", label: "Marca-texto" },
  { id: "crayon", label: "Giz de cera" },
  { id: "spray", label: "Aerógrafo" },
];

export const BASIC_SHAPES = [
  { id: "line", label: "Linha" },
  { id: "rect", label: "Retângulo" },
  { id: "circle", label: "Círculo" },
  { id: "triangle", label: "Triângulo" },
  { id: "star", label: "Estrela" },
  { id: "arrow", label: "Seta" },
  { id: "heart", label: "Coração" },
];

const drawShapePath = (ctx, shape, x0, y0, x1, y1) => {
  ctx.beginPath();
  if (shape === "line") {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  } else if (shape === "rect") {
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  } else if (shape === "circle") {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (shape === "triangle") {
    const topX = (x0 + x1) / 2;
    const topY = Math.min(y0, y1);
    const leftX = Math.min(x0, x1);
    const rightX = Math.max(x0, x1);
    const botY = Math.max(y0, y1);
    ctx.moveTo(topX, topY);
    ctx.lineTo(rightX, botY);
    ctx.lineTo(leftX, botY);
    ctx.closePath();
    ctx.stroke();
  } else if (shape === "star") {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rOuter = Math.min(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2;
    const rInner = rOuter * 0.45;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (shape === "arrow") {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const headLen = 14;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(
      x1 - headLen * Math.cos(angle - Math.PI / 6),
      y1 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x1, y1);
    ctx.lineTo(
      x1 - headLen * Math.cos(angle + Math.PI / 6),
      y1 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  } else if (shape === "heart") {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const width = maxX - minX;
    const height = maxY - minY;
    ctx.moveTo(minX + width / 2, minY + height / 4);
    ctx.bezierCurveTo(
      minX + width / 2, minY,
      minX, minY,
      minX, minY + height / 2
    );
    ctx.bezierCurveTo(
      minX, minY + (height * 3) / 4,
      minX + width / 2, maxY,
      minX + width / 2, maxY
    );
    ctx.bezierCurveTo(
      minX + width / 2, maxY,
      maxX, minY + (height * 3) / 4,
      maxX, minY + height / 2
    );
    ctx.bezierCurveTo(
      maxX, minY,
      minX + width / 2, minY,
      minX + width / 2, minY + height / 4
    );
    ctx.stroke();
  }
};

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

  const w = bounds.width;
  const h = bounds.height;

  strokes.forEach((stroke) => {
    if (!Array.isArray(stroke.points) || stroke.points.length < 1) return;
    const tool = stroke.tool || "brush";
    const color = stroke.color || "#172033";
    const baseWidth = stroke.width || 5;

    context.save();

    if (tool === "eraser") {
      context.strokeStyle = backgroundColor;
      context.fillStyle = backgroundColor;
      context.lineWidth = Math.max(baseWidth * 2.5, 16);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      stroke.points.forEach((pt, i) => {
        const x = pt.x * w;
        const y = pt.y * h;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      context.restore();
      return;
    }

    if (tool === "text" || stroke.text) {
      const p0 = stroke.points[0];
      const x = p0.x * w;
      const y = p0.y * h;
      const fontSize = stroke.fontSize || Math.max(14, baseWidth * 3.5);
      context.fillStyle = color;
      context.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
      context.textBaseline = "top";
      context.fillText(stroke.text || "", x, y);
      context.restore();
      return;
    }

    if (tool === "shape" && stroke.shape) {
      const p0 = stroke.points[0];
      const p1 = stroke.points[stroke.points.length - 1] || p0;
      const x0 = p0.x * w;
      const y0 = p0.y * h;
      const x1 = p1.x * w;
      const y1 = p1.y * h;

      context.strokeStyle = color;
      context.lineWidth = baseWidth;
      context.fillStyle = color;
      drawShapePath(context, stroke.shape, x0, y0, x1, y1);
      context.restore();
      return;
    }

    context.strokeStyle = color;
    context.fillStyle = color;

    if (tool === "pencil") {
      context.lineWidth = Math.max(1, baseWidth * 0.7);
      context.lineCap = "butt";
      context.lineJoin = "miter";
      context.beginPath();
      stroke.points.forEach((pt, i) => {
        const x = pt.x * w;
        const y = pt.y * h;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    } else if (tool === "highlighter") {
      context.globalAlpha = 0.45;
      context.lineWidth = baseWidth * 2.5;
      context.lineCap = "square";
      context.lineJoin = "miter";
      context.beginPath();
      stroke.points.forEach((pt, i) => {
        const x = pt.x * w;
        const y = pt.y * h;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    } else if (tool === "crayon") {
      context.globalAlpha = 0.85;
      context.lineWidth = baseWidth * 1.3;
      context.lineCap = "round";
      context.beginPath();
      stroke.points.forEach((pt, i) => {
        const x = pt.x * w;
        const y = pt.y * h;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      stroke.points.forEach((pt) => {
        const x = pt.x * w;
        const y = pt.y * h;
        context.fillRect(x - baseWidth * 0.3, y - baseWidth * 0.3, baseWidth * 0.6, baseWidth * 0.6);
      });
    } else if (tool === "spray") {
      const radius = Math.max(8, baseWidth * 2.2);
      stroke.points.forEach((pt) => {
        const x = pt.x * w;
        const y = pt.y * h;
        for (let j = 0; j < 8; j++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * radius;
          const dotX = x + Math.cos(angle) * dist;
          const dotY = y + Math.sin(angle) * dist;
          context.fillRect(dotX, dotY, Math.max(1, baseWidth * 0.2), Math.max(1, baseWidth * 0.2));
        }
      });
    } else {
      context.lineWidth = baseWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      stroke.points.forEach((pt, i) => {
        const x = pt.x * w;
        const y = pt.y * h;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    }

    context.restore();
  });
};

export const COLOR_PALETTES = [
  {
    id: "classic",
    name: "Clássica",
    colors: [
      "#172033",
      "#6d28d9",
      "#2563eb",
      "#0891b2",
      "#059669",
      "#eab308",
      "#ea580c",
      "#dc2626",
    ],
  },
  {
    id: "nature",
    name: "Natureza",
    colors: [
      "#1b4332",
      "#2d6a4f",
      "#40916c",
      "#52b788",
      "#74c69d",
      "#b7e4c7",
      "#d8f3dc",
      "#854d0e",
    ],
  },
  {
    id: "neon",
    name: "Neon Gamer",
    colors: [
      "#00ffcc",
      "#0099ff",
      "#7928ca",
      "#ff0080",
      "#ff0000",
      "#ff9900",
      "#ffff00",
      "#00ff00",
    ],
  },
  {
    id: "pastel",
    name: "Tons Pastel",
    colors: [
      "#ffb7b2",
      "#ffdac1",
      "#e2f0cb",
      "#b5ead7",
      "#c7ceea",
      "#e0bbff",
      "#f3c4fb",
      "#4a5568",
    ],
  },
  {
    id: "mono",
    name: "Monocromática",
    colors: [
      "#0f172a",
      "#334155",
      "#475569",
      "#64748b",
      "#94a3b8",
      "#cbd5e1",
      "#e2e8f0",
      "#0284c7",
    ],
  },
];

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
  const [activePalette, setActivePalette] = useState("classic");
  const activeSwatches =
    COLOR_PALETTES.find((p) => p.id === activePalette)?.colors || DRAWING_COLORS;
  const [color, setColor] = useState(activeSwatches[0]);
  const [width, setWidth] = useState(5);
  const [modeTool, setModeTool] = useState("brush");
  const [brushType, setBrushType] = useState("brush");
  const [activeShape, setActiveShape] = useState("line");
  const [textInput, setTextInput] = useState("");
  const [showTextModal, setShowTextModal] = useState(false);
  const [pendingTextPos, setPendingTextPos] = useState(null);

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

    const point = readPoint(event);

    if (modeTool === "text") {
      setPendingTextPos(point);
      setShowTextModal(true);
      return;
    }

    if (modeTool === "shape") {
      activeStrokeRef.current = {
        tool: "shape",
        shape: activeShape,
        color,
        width,
        points: [point, { ...point }],
      };
      return;
    }

    activeStrokeRef.current = {
      tool: modeTool === "eraser" ? "eraser" : brushType,
      color: modeTool === "eraser" ? backgroundColor : color,
      width: modeTool === "eraser" ? Math.max(width * 2.4, 14) : width,
      points: [point],
    };
  };

  const handlePointerMove = (event) => {
    if (!activeStrokeRef.current) return;
    const point = readPoint(event);
    if (modeTool === "shape") {
      activeStrokeRef.current.points[1] = point;
    } else {
      activeStrokeRef.current.points.push(point);
    }
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

  const handleAddTextSubmit = (e) => {
    e?.preventDefault();
    if (!textInput.trim()) {
      setShowTextModal(false);
      return;
    }
    const pos = pendingTextPos || { x: 0.1, y: 0.1 };
    const stroke = {
      tool: "text",
      text: textInput.trim(),
      color,
      width,
      fontSize: Math.max(16, width * 3.5),
      points: [pos, pos],
    };
    setTextInput("");
    setShowTextModal(false);
    setPendingTextPos(null);
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
              className={modeTool === "brush" ? "active" : ""}
              aria-pressed={modeTool === "brush"}
              onClick={() => setModeTool("brush")}
            >
              Pincel
            </button>
            <button
              type="button"
              className={modeTool === "shape" ? "active" : ""}
              aria-pressed={modeTool === "shape"}
              onClick={() => setModeTool("shape")}
            >
              Formas
            </button>
            <button
              type="button"
              className={modeTool === "text" ? "active" : ""}
              aria-pressed={modeTool === "text"}
              onClick={() => {
                setModeTool("text");
                setShowTextModal(true);
              }}
            >
              Texto
            </button>
            <button
              type="button"
              className={modeTool === "eraser" ? "active" : ""}
              aria-pressed={modeTool === "eraser"}
              onClick={() => setModeTool("eraser")}
            >
              Borracha
            </button>
          </div>

          {modeTool === "brush" && (
            <div className="drawingSubToolGroup" aria-label="Estilo do pincel">
              {BRUSH_TYPES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={brushType === item.id ? "active" : ""}
                  onClick={() => setBrushType(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {modeTool === "shape" && (
            <div className="drawingSubToolGroup" aria-label="Forma básica">
              {BASIC_SHAPES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={activeShape === item.id ? "active" : ""}
                  onClick={() => setActiveShape(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="drawingPaletteContainer">
            <select
              className="drawingPaletteSelect"
              value={activePalette}
              onChange={(e) => {
                const nextId = e.target.value;
                setActivePalette(nextId);
                const pal = COLOR_PALETTES.find((p) => p.id === nextId);
                if (pal?.colors?.[0]) {
                  setColor(pal.colors[0]);
                  if (modeTool === "eraser") setModeTool("brush");
                }
              }}
              aria-label="Escolher paleta temática"
            >
              {COLOR_PALETTES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="drawingColorPalette" aria-label="Cores">
              {activeSwatches.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={color === item && modeTool !== "eraser" ? "active" : ""}
                  aria-label={`Usar a cor ${item}`}
                  aria-pressed={color === item && modeTool !== "eraser"}
                  style={{ "--drawing-swatch": item }}
                  onClick={() => {
                    setColor(item);
                    if (modeTool === "eraser") setModeTool("brush");
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
                  if (modeTool === "eraser") setModeTool("brush");
                }}
              />
            </label>
          </div>
        </div>

          <label className="drawingWidthControl">
            <span>Espessura</span>
            <input
              type="range"
              min="1"
              max="24"
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

        {showTextModal && !readonly && (
          <div className="drawingTextOverlay">
            <form className="drawingTextForm" onSubmit={handleAddTextSubmit}>
              <strong>Adicionar texto ao quadro</strong>
              <p>Clique no quadro onde deseja posicionar o texto ou digite abaixo:</p>
              <input
                type="text"
                autoFocus
                placeholder="Escreva seu texto aqui..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                maxLength={100}
              />
              <div className="drawingTextActions">
                <button
                  type="button"
                  className="drawingSecondaryButton"
                  onClick={() => setShowTextModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="drawingPrimaryButton">
                  Inserir texto
                </button>
              </div>
            </form>
          </div>
        )}

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
