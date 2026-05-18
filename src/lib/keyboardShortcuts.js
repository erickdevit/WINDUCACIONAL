const normalizeKey = (key = "") => String(key).toLowerCase();

export const getTopClosableApp = (apps = {}) => {
  return (
    Object.entries(apps)
      .filter(
        ([key, value]) =>
          key !== "hz" && value && value.action && !value.hide && value.z >= 0
      )
      .sort(([, a], [, b]) => (b.z || 0) - (a.z || 0))[0]?.[1] || null
  );
};

export const getGlobalShortcutAction = (event, context = {}) => {
  const key = normalizeKey(event.key);
  const { apps = {}, fileDialogOpen = false } = context;

  if (event.altKey && !event.ctrlKey && !event.metaKey && key === "f4") {
    if (fileDialogOpen) return { type: "FILEDIALOG_CLOSE" };
    const activeApp = getTopClosableApp(apps);
    return activeApp ? { type: activeApp.action, payload: "close" } : null;
  }

  if (event.ctrlKey && event.shiftKey && !event.altKey && key === "escape") {
    return { type: "TASKMANAGER" };
  }

  if (!event.metaKey || event.altKey) return null;

  switch (key) {
    case "a":
      return { type: "BANDTOGG" };
    case "d":
      return { type: "DESKTOGG" };
    case "e":
      return { type: "EXPLORER" };
    case "i":
      return { type: "SETTINGS" };
    case "n":
      return { type: "CALNTOGG" };
    case "r":
      return { type: "TERMINAL" };
    case "s":
      return { type: "STARTSRC" };
    case "w":
      return { type: "WIDGTOGG" };
    default:
      return null;
  }
};
