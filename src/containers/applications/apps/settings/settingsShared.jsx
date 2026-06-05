import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../../utils/general";

export const ACCOUNT_OVERVIEW = "overview";
export const ACCOUNT_OTHER_USERS = "other-users";
export const ACCOUNT_TURMAS = "turmas";

export const normalizeSearchText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const getEmptyCreateForm = (role = "aluno") => ({
  username: "",
  displayName: "",
  password: "",
  role,
  studentType: "normal",
  turmaId: "",
});

export const emptyEditForm = {
  id: "",
  username: "",
  displayName: "",
  password: "",
  role: "aluno",
  studentType: "normal",
  turmaId: "",
  active: true,
};

export const studentTypeOptions = [
  {
    value: "normal",
    title: "Normal",
    description: "Fluxo padrão para alunos regulares.",
  },
  {
    value: "kids",
    title: "Kids",
    description: "Identifica alunos do grupo infantil.",
  },
  {
    value: "reposicao",
    title: "Reposição",
    description: "Turma especial para reposição de aulas.",
  },
];

export const defaultScheduleDays = [1, 2, 3, 4, 5];

export const weekDayOptions = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export const normalizeScheduleDays = (days) =>
  Array.isArray(days) && days.length > 0
    ? [...new Set(days.map(Number))].sort((a, b) => a - b)
    : defaultScheduleDays;

export const getScheduleSummary = (turma) => {
  const days = normalizeScheduleDays(turma.scheduleDays);
  const labels = weekDayOptions
    .filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(", ");
  return `${labels} · ${turma.scheduleStartTime || "00:00"} às ${
    turma.scheduleEndTime || "23:59"
  }`;
};

export const generateLocalTurmaCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

export const getEmptyTurmaForm = () => ({
  nome: "",
  code: generateLocalTurmaCode(),
  studentType: "normal",
  scheduleDays: defaultScheduleDays,
  scheduleStartTime: "00:00",
  scheduleEndTime: "23:59",
  descricao: "",
});

export const AppLikeDialog = ({
  title,
  icon = "settings",
  onClose,
  children,
  actions,
  defaultWidth = 654,
  defaultHeight = 620,
}) => {
  const layerRef = useRef(null);
  const [dialog, setDialog] = useState({
    top: 36,
    left: 36,
    width: defaultWidth,
    height: defaultHeight,
    maximized: false,
    minimized: false,
    restore: null,
  });

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const width = Math.min(defaultWidth, Math.max(360, layer.clientWidth - 24));
    const height = Math.min(
      defaultHeight,
      Math.max(420, layer.clientHeight - 24)
    );
    setDialog((state) => ({
      ...state,
      width,
      height,
      left: Math.max(12, Math.round((layer.clientWidth - width) / 2)),
      top: Math.max(12, Math.round((layer.clientHeight - height) / 2)),
    }));
  }, [defaultHeight, defaultWidth]);

  const startDrag = (event) => {
    if (dialog.maximized) return;
    event.preventDefault();
    const layer = layerRef.current;
    if (!layer) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...dialog };

    const move = (moveEvent) => {
      const nextLeft = start.left + moveEvent.clientX - startX;
      const nextTop = start.top + moveEvent.clientY - startY;
      setDialog((state) => ({ ...state, left: nextLeft, top: nextTop }));
    };

    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const startResize = (event, direction) => {
    if (dialog.maximized) return;
    event.preventDefault();
    event.stopPropagation();
    const layer = layerRef.current;
    if (!layer) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...dialog };
    const minWidth = 360;
    const minHeight = 360;

    const move = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let nextTop = start.top;
      let nextLeft = start.left;
      let nextWidth = start.width;
      let nextHeight = start.height;

      if (direction.includes("e")) {
        nextWidth = Math.max(start.width + deltaX, minWidth);
      }
      if (direction.includes("s")) {
        nextHeight = Math.max(start.height + deltaY, minHeight);
      }
      if (direction.includes("w")) {
        const maxDelta = start.width - minWidth;
        const limitedDelta = Math.min(deltaX, maxDelta);
        nextLeft = start.left + limitedDelta;
        nextWidth = start.width - limitedDelta;
      }
      if (direction.includes("n")) {
        const maxDelta = start.height - minHeight;
        const limitedDelta = Math.min(deltaY, maxDelta);
        nextTop = start.top + limitedDelta;
        nextHeight = start.height - limitedDelta;
      }

      setDialog((state) => ({
        ...state,
        top: nextTop,
        left: nextLeft,
        width: nextWidth,
        height: nextHeight,
      }));
    };

    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const toggleMaximize = () => {
    const layer = layerRef.current;
    if (!layer) return;
    setDialog((state) => {
      if (state.maximized && state.restore) {
        return {
          ...state.restore,
          maximized: false,
          minimized: false,
          restore: null,
        };
      }
      return {
        top: 8,
        left: 8,
        width: Math.max(360, layer.clientWidth - 16),
        height: Math.max(360, layer.clientHeight - 16),
        maximized: true,
        minimized: false,
        restore: {
          ...state,
          maximized: false,
          minimized: false,
          restore: null,
        },
      };
    });
  };

  const minimize = () => {
    setDialog((state) => ({ ...state, minimized: true }));
  };

  const restoreMinimized = () => {
    setDialog((state) => ({ ...state, minimized: false }));
  };

  const dialogStyle = dialog.minimized
    ? {}
    : {
        top: dialog.top,
        left: dialog.left,
        width: dialog.width,
        height: dialog.height,
      };

  return (
    <div className="appDialogLayer" ref={layerRef}>
      {dialog.minimized ? (
        <div className="appDialogMinimized dpShad">
          <Icon src={icon} width={16} />
          <span>{title}</span>
          <button type="button" onClick={restoreMinimized}>
            Restaurar
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar janela">
            <Icon fafa="faXmark" width={11} />
          </button>
        </div>
      ) : (
        <div
          className={`appDialogWindow dpShad ${
            dialog.maximized ? "maximized" : ""
          }`}
          style={dialogStyle}
        >
          <div className="appDialogTitleBar" onMouseDown={startDrag}>
            <div className="appDialogTitle">
              <Icon src={icon} width={14} />
              <span>{title}</span>
            </div>
            <div
              className="appDialogControls"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={minimize}
                aria-label="Minimizar janela"
              >
                <Icon src="minimize" ui width={12} />
              </button>
              <button
                type="button"
                onClick={toggleMaximize}
                aria-label="Redimensionar janela"
              >
                <Icon
                  src={dialog.maximized ? "maximize" : "maxmin"}
                  ui
                  width={12}
                />
              </button>
              <button
                type="button"
                className="closeBtn"
                onClick={onClose}
                aria-label="Fechar janela"
              >
                <Icon src="close" ui width={14} />
              </button>
            </div>
          </div>
          <div className="appDialogContent">{children}</div>
          {actions ? <div className="appDialogActions">{actions}</div> : null}
          {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((direction) => (
            <div
              key={direction}
              className={`appDialogResize appDialogResize-${direction}`}
              onMouseDown={(event) => startResize(event, direction)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
