export const modifierKeys = new Set(["Control", "Shift", "Alt", "Meta", "OS"]);

export const keyLabels = {
  " ": "Espaço",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Control: "Ctrl",
  Escape: "Esc",
  Meta: "Windows",
  OS: "Windows",
  PrintScreen: "PrtSc",
};

export const normalizeKeyLabel = (key = "") => {
  if (keyLabels[key]) return keyLabels[key];
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  return key;
};

export const comboToText = (combo) => combo.join(" + ");

export const captureComboFromEvent = (event) => {
  if (modifierKeys.has(event.key)) return null;

  const combo = [];
  if (event.metaKey) combo.push("Windows");
  if (event.ctrlKey) combo.push("Ctrl");
  if (event.altKey) combo.push("Alt");
  if (event.shiftKey) combo.push("Shift");

  const key = normalizeKeyLabel(event.key);
  if (key && !combo.includes(key)) combo.push(key);

  return combo;
};

export const isSameCombo = (received, expected) =>
  comboToText(received || []) === comboToText(expected || []);
