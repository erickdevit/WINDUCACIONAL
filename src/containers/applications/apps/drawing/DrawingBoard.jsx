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

export const BRUSH_TYPES = [
  { id: "brush", label: "Padrão", title: "Pincel Padrão" },
  { id: "pen", label: "Caneta", title: "Caneta Nanquim" },
  { id: "oil", label: "Tinta a Óleo", title: "Tinta a Óleo" },
  { id: "pencil", label: "Lápis", title: "Lápis Grafite" },
  { id: "highlighter", label: "Marca-texto", title: "Marca-texto" },
  { id: "crayon", label: "Giz de cera", title: "Giz de Cera" },
  { id: "spray", label: "Aerógrafo", title: "Aerógrafo / Spray" },
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

// --- High Quality SVG Icons ---
const IconBrush = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11.5L16.5 13C15 14.5 12 18 9 18C7.5 18 6 17.5 5 16.5C4 15.5 3.5 14 3.5 12.5C3.5 9.5 7 6.5 8.5 5L10 3.5L18 11.5Z" />
    <path d="M14 7.5L16.5 10" />
  </svg>
);

const IconPen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.5 7.5" />
    <circle cx="11" cy="11" r="1" fill="currentColor" />
  </svg>
);

const IconOil = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 11l-8-8-8 8a6 6 0 0 0 11.3 3" />
    <path d="M16 14a3 3 0 0 1 6 0c0 2.5-3 5-3 5s-3-2.5-3-5z" fill="currentColor" />
  </svg>
);

const IconPencil = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const IconHighlighter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l-6 6v4h4l6-6m-4-4l6-6 4 4-6 6m-4-4l4 4" />
  </svg>
);

const IconCrayon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l-7 7v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-7-7z" />
    <path d="M5 9h14" />
    <path d="M9 22V9" />
  </svg>
);

const IconSpray = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 10v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10" />
    <path d="M9 7h6v3H9z" />
    <path d="M12 4V7" />
    <circle cx="18" cy="4" r="1.5" fill="currentColor" />
    <circle cx="20" cy="7" r="1.5" fill="currentColor" />
    <circle cx="16" cy="2" r="1.5" fill="currentColor" />
  </svg>
);

const IconShapes = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <circle cx="17.5" cy="7.5" r="4" />
    <polygon points="12,21 6,12 18,12" />
  </svg>
);

const IconEraser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16C2 15 2 13 3 12L13 2C14 1 16 1 17 2L21 6C22 7 22 9 21 10L11 20" />
    <path d="M18 12L11 5" />
  </svg>
);

const IconUndo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const IconTrash = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconPalette = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.74 1.7-1.67 0-.43-.17-.83-.46-1.14-.29-.31-.46-.71-.46-1.17 0-.93.74-1.67 1.67-1.67H16c3.3 0 6-2.7 6-6 0-4.97-4.03-9-9-9z" />
  </svg>
);

const IconShapeLine = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="4" y1="20" x2="20" y2="4" />
  </svg>
);

const IconShapeRect = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const IconShapeCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const IconShapeTriangle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 4 20 19 4 19" />
  </svg>
);

const IconShapeStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconShapeArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconShapeHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ActiveBrushIcon = ({ brushType }) => {
  switch (brushType) {
    case "pen": return <IconPen />;
    case "oil": return <IconOil />;
    case "pencil": return <IconPencil />;
    case "highlighter": return <IconHighlighter />;
    case "crayon": return <IconCrayon />;
    case "spray": return <IconSpray />;
    case "brush":
    default: return <IconBrush />;
  }
};

const ActiveShapeIcon = ({ shape }) => {
  switch (shape) {
    case "line": return <IconShapeLine />;
    case "rect": return <IconShapeRect />;
    case "circle": return <IconShapeCircle />;
    case "triangle": return <IconShapeTriangle />;
    case "star": return <IconShapeStar />;
    case "arrow": return <IconShapeArrow />;
    case "heart": return <IconShapeHeart />;
    default: return <IconShapes />;
  }
};

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
  const width = bounds.width || canvas.width || 800;
  const height = bounds.height || canvas.height || 600;
  const scale = (bounds.width && bounds.height) ? (window.devicePixelRatio || 1) : 1;

  if (bounds.width && bounds.height) {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
  }

  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  const w = width;
  const h = height;

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

    if (tool === "pen") {
      context.lineWidth = Math.max(1.5, baseWidth * 0.85);
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
    } else if (tool === "oil") {
      context.globalAlpha = 0.88;
      context.lineWidth = baseWidth * 1.6;
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
      context.lineWidth = baseWidth * 0.7;
      context.globalAlpha = 0.4;
      context.stroke();
    } else if (tool === "pencil") {
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
  const [flyoutOpen, setFlyoutOpen] = useState(null); // "brush" | "shape" | null

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
    if (!canvasRef.current) return { x: 0, y: 0 };
    const bounds = canvasRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const handlePointerDown = (event) => {
    if (readonly || busy) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setFlyoutOpen(null);

    const point = readPoint(event);

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
        <>
          {/* Vertical Floating Tool Dock (Left Side) */}
          <div className="drawingFloatingDock" aria-label="Ferramentas de desenho">
            <div className="drawingDockGroup">
              <div className="drawingDockItemWithFlyout">
                <button
                  type="button"
                  className={`drawingDockBtn ${modeTool === "brush" ? "active" : ""}`}
                  title="Pincel"
                  aria-label="Pincel"
                  aria-pressed={modeTool === "brush"}
                  onClick={() => {
                    if (modeTool === "brush") {
                      setFlyoutOpen((prev) => (prev === "brush" ? null : "brush"));
                    } else {
                      setModeTool("brush");
                      setFlyoutOpen(null);
                    }
                  }}
                >
                  <ActiveBrushIcon brushType={brushType} />
                </button>

                {flyoutOpen === "brush" && (
                  <div className="drawingDockFlyout">
                    {BRUSH_TYPES.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`drawingFlyoutItem ${brushType === item.id ? "active" : ""}`}
                        title={item.title || item.label}
                        onClick={() => {
                          setBrushType(item.id);
                          setModeTool("brush");
                          setFlyoutOpen(null);
                        }}
                      >
                        <ActiveBrushIcon brushType={item.id} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="drawingDockItemWithFlyout">
                <button
                  type="button"
                  className={`drawingDockBtn ${modeTool === "shape" ? "active" : ""}`}
                  title="Formas básicas"
                  aria-label="Formas básicas"
                  aria-pressed={modeTool === "shape"}
                  onClick={() => {
                    if (modeTool === "shape") {
                      setFlyoutOpen((prev) => (prev === "shape" ? null : "shape"));
                    } else {
                      setModeTool("shape");
                      setFlyoutOpen("shape");
                    }
                  }}
                >
                  <ActiveShapeIcon shape={activeShape} />
                </button>

                {flyoutOpen === "shape" && (
                  <div className="drawingDockFlyout drawingShapesFlyout">
                    {BASIC_SHAPES.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`drawingFlyoutItem ${activeShape === item.id ? "active" : ""}`}
                        onClick={() => {
                          setActiveShape(item.id);
                          setModeTool("shape");
                          setFlyoutOpen(null);
                        }}
                      >
                        <ActiveShapeIcon shape={item.id} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={`drawingDockBtn ${modeTool === "eraser" ? "active" : ""}`}
                title="Borracha"
                aria-label="Borracha"
                aria-pressed={modeTool === "eraser"}
                onClick={() => {
                  setModeTool("eraser");
                  setFlyoutOpen(null);
                }}
              >
                <IconEraser />
              </button>
            </div>

            <div className="drawingDockDivider" />

            <div className="drawingWidthControlDock" title="Espessura">
              <span
                className="drawingWidthDotPreview"
                style={{ width: Math.max(4, width * 0.8), height: Math.max(4, width * 0.8) }}
              />
              <input
                type="range"
                min="1"
                max="24"
                value={width}
                title="Espessura"
                aria-label="Espessura"
                onChange={(event) => setWidth(Number(event.target.value))}
              />
            </div>

            {!collaborative && (
              <>
                <div className="drawingDockDivider" />
                <div className="drawingDockActions">
                  <button
                    type="button"
                    className="drawingDockBtn"
                    title="Desfazer"
                    aria-label="Desfazer"
                    disabled={!strokes.length || busy}
                    onClick={handleUndo}
                  >
                    <IconUndo />
                  </button>
                  <button
                    type="button"
                    className="drawingDockBtn danger"
                    title="Limpar Quadro"
                    aria-label="Limpar"
                    disabled={!strokes.length || busy}
                    onClick={handleClear}
                  >
                    <IconTrash />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Horizontal Color Bar & Palette Selector (Bottom Edge) */}
          <div className="drawingBottomColorBar" aria-label="Cores e Paletas">
            <div className="drawingPalettePillSelector" title="Paleta Temática">
              <IconPalette />
              <select
                className="drawingPaletteSelectInline"
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
            </div>

            <div className="drawingColorSwatchesRow" aria-label="Cores">
              {activeSwatches.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`drawingSwatchCircle ${color === item && modeTool !== "eraser" ? "active" : ""}`}
                  aria-label={`Usar a cor ${item}`}
                  title={item}
                  style={{ "--drawing-swatch": item }}
                  onClick={() => {
                    setColor(item);
                    if (modeTool === "eraser") setModeTool("brush");
                  }}
                />
              ))}
              <label className="drawingCustomColorCircle" title="Escolher outra cor">
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
        </>
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
        <div className="drawingCanvasFooterFloating">
          <span className={`drawingSaveIndicator ${busy ? "saving" : ""}`}>
            <i /> {busy ? "Sincronizando…" : "Desenho sincronizado"}
          </span>
          <span>{strokes.length} traço{strokes.length === 1 ? "" : "s"}</span>
        </div>
      )}
    </div>
  );
};
