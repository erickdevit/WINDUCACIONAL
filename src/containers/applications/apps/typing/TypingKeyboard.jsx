import React, { useMemo } from "react";
import "./TypingKeyboard.scss";

const COLORS = {
  "left-pinky": "#E74C3C",
  "left-ring": "#E67E22",
  "left-middle": "#F1C40F",
  "left-index": "#2ECC71",
  "right-index": "#3498DB",
  "right-middle": "#9B59B6",
  "right-ring": "#1ABC9C",
  "right-pinky": "#E84393",
  thumb: "#6B7280",
};

const KEYS_DATA = [
  [
    { id: "acute", label: '"', sub: "'", finger: "left-pinky", w: 1, base: "'", shifted: '"' },
    { id: "n1", label: "!", sub: "1", finger: "left-pinky", w: 1, base: "1", shifted: "!" },
    { id: "n2", label: "@", sub: "2", finger: "left-ring", w: 1, base: "2", shifted: "@" },
    { id: "n3", label: "#", sub: "3", finger: "left-middle", w: 1, base: "3", shifted: "#" },
    { id: "n4", label: "$", sub: "4", finger: "left-index", w: 1, base: "4", shifted: "$" },
    { id: "n5", label: "%", sub: "5", finger: "left-index", w: 1, base: "5", shifted: "%" },
    { id: "n6", label: "¨", sub: "6", finger: "right-index", w: 1, base: "6", shifted: "¨" },
    { id: "n7", label: "&", sub: "7", finger: "right-index", w: 1, base: "7", shifted: "&" },
    { id: "n8", label: "*", sub: "8", finger: "right-middle", w: 1, base: "8", shifted: "*" },
    { id: "n9", label: "(", sub: "9", finger: "right-ring", w: 1, base: "9", shifted: "(" },
    { id: "n0", label: ")", sub: "0", finger: "right-pinky", w: 1, base: "0", shifted: ")" },
    { id: "minus", label: "_", sub: "-", finger: "right-pinky", w: 1, base: "-", shifted: "_" },
    { id: "equal", label: "+", sub: "=", finger: "right-pinky", w: 1, base: "=", shifted: "+" },
    { id: "backspace", label: "⌫", sub: null, finger: "right-pinky", w: 2, base: null, shifted: null },
  ],
  [
    { id: "tab", label: "Tab", sub: null, finger: "left-pinky", w: 1.5, base: "\t", shifted: null },
    { id: "q", label: "Q", sub: "q", finger: "left-pinky", w: 1, base: "q", shifted: "Q" },
    { id: "w", label: "W", sub: "w", finger: "left-ring", w: 1, base: "w", shifted: "W" },
    { id: "e", label: "E", sub: "e", finger: "left-middle", w: 1, base: "e", shifted: "E" },
    { id: "r", label: "R", sub: "r", finger: "left-index", w: 1, base: "r", shifted: "R" },
    { id: "t", label: "T", sub: "t", finger: "left-index", w: 1, base: "t", shifted: "T" },
    { id: "y", label: "Y", sub: "y", finger: "right-index", w: 1, base: "y", shifted: "Y" },
    { id: "u", label: "U", sub: "u", finger: "right-index", w: 1, base: "u", shifted: "U" },
    { id: "i", label: "I", sub: "i", finger: "right-middle", w: 1, base: "i", shifted: "I" },
    { id: "o", label: "O", sub: "o", finger: "right-ring", w: 1, base: "o", shifted: "O" },
    { id: "p", label: "P", sub: "p", finger: "right-pinky", w: 1, base: "p", shifted: "P" },
    { id: "dead1", label: "´", sub: "`", finger: "right-pinky", w: 1, base: "´", shifted: "`" },
    { id: "lbracket", label: "{", sub: "[", finger: "right-pinky", w: 1, base: "[", shifted: "{" },
    { id: "rbracket", label: "}", sub: "]", finger: "right-pinky", w: 1, base: "]", shifted: "}" },
  ],
  [
    { id: "caps", label: "Caps", sub: null, finger: "left-pinky", w: 1.75, base: null, shifted: null },
    { id: "a", label: "A", sub: "a", finger: "left-pinky", w: 1, base: "a", shifted: "A" },
    { id: "s", label: "S", sub: "s", finger: "left-ring", w: 1, base: "s", shifted: "S" },
    { id: "d", label: "D", sub: "d", finger: "left-middle", w: 1, base: "d", shifted: "D" },
    { id: "f", label: "F", sub: "f", finger: "left-index", w: 1, base: "f", shifted: "F" },
    { id: "g", label: "G", sub: "g", finger: "left-index", w: 1, base: "g", shifted: "G" },
    { id: "h", label: "H", sub: "h", finger: "right-index", w: 1, base: "h", shifted: "H" },
    { id: "j", label: "J", sub: "j", finger: "right-index", w: 1, base: "j", shifted: "J" },
    { id: "k", label: "K", sub: "k", finger: "right-middle", w: 1, base: "k", shifted: "K" },
    { id: "l", label: "L", sub: "l", finger: "right-ring", w: 1, base: "l", shifted: "L" },
    { id: "cc", label: "Ç", sub: "ç", finger: "right-pinky", w: 1, base: "ç", shifted: "Ç" },
    { id: "dead2", label: "~", sub: "^", finger: "right-pinky", w: 1, base: "~", shifted: "^" },
    { id: "enter", label: "Enter", sub: null, finger: "right-pinky", w: 2.25, base: "\n", shifted: null },
  ],
  [
    { id: "lshift", label: "Shift", sub: null, finger: "left-pinky", w: 2.25, base: null, shifted: null },
    { id: "z", label: "Z", sub: "z", finger: "left-pinky", w: 1, base: "z", shifted: "Z" },
    { id: "x", label: "X", sub: "x", finger: "left-ring", w: 1, base: "x", shifted: "X" },
    { id: "c", label: "C", sub: "c", finger: "left-middle", w: 1, base: "c", shifted: "C" },
    { id: "v", label: "V", sub: "v", finger: "left-index", w: 1, base: "v", shifted: "V" },
    { id: "b", label: "B", sub: "b", finger: "left-index", w: 1, base: "b", shifted: "B" },
    { id: "n", label: "N", sub: "n", finger: "right-index", w: 1, base: "n", shifted: "N" },
    { id: "m", label: "M", sub: "m", finger: "right-index", w: 1, base: "m", shifted: "M" },
    { id: "comma", label: "<", sub: ",", finger: "right-middle", w: 1, base: ",", shifted: "<" },
    { id: "dot", label: ">", sub: ".", finger: "right-ring", w: 1, base: ".", shifted: ">" },
    { id: "semicolon", label: ":", sub: ";", finger: "right-pinky", w: 1, base: ";", shifted: ":" },
    { id: "slash", label: "?", sub: "/", finger: "right-pinky", w: 1, base: "/", shifted: "?" },
    { id: "rshift", label: "Shift", sub: null, finger: "right-pinky", w: 2.75, base: null, shifted: null },
  ],
  [
    { id: "lctrl", label: "Ctrl", sub: null, finger: "left-pinky", w: 1.25, base: null, shifted: null },
    { id: "lwin", label: "Win", sub: null, finger: "left-pinky", w: 1.25, base: null, shifted: null },
    { id: "lalt", label: "Alt", sub: null, finger: "left-pinky", w: 1.25, base: null, shifted: null },
    { id: "space", label: "", sub: null, finger: "thumb", w: 6.25, base: " ", shifted: null },
    { id: "ralt", label: "AltGr", sub: null, finger: "right-pinky", w: 1.25, base: null, shifted: null },
    { id: "rwin", label: "Win", sub: null, finger: "right-pinky", w: 1.25, base: null, shifted: null },
    { id: "menu", label: "Menu", sub: null, finger: "right-pinky", w: 1.25, base: null, shifted: null },
    { id: "rctrl", label: "Ctrl", sub: null, finger: "right-pinky", w: 1.25, base: null, shifted: null },
  ],
];

const CHAR_TO_KEY = {};
const SHIFT_CHARS = new Set();

KEYS_DATA.forEach((row) => {
  row.forEach((key) => {
    if (key.base != null) {
      CHAR_TO_KEY[key.base] = key;
    }
    if (key.shifted != null) {
      CHAR_TO_KEY[key.shifted] = key;
      SHIFT_CHARS.add(key.shifted);
    }
  });
});

const COMBINING_TO_DEAD_KEY = {
  "\u0301": "´",
  "\u0300": "`",
  "\u0302": "^",
  "\u0303": "~",
  "\u0308": "¨",
};

const ACCENT_MAP = {};
const accentEntries = [
  { dead: "´", combining: "\u0301", chars: "áéíóúý" },
  { dead: "`", combining: "\u0300", chars: "àèìòùỳ" },
  { dead: "^", combining: "\u0302", chars: "âêîôûŷ" },
  { dead: "~", combining: "\u0303", chars: "ãẽĩõũỹ" },
  { dead: "¨", combining: "\u0308", chars: "äëïöüÿ" },
];
accentEntries.forEach(({ dead, combining, chars }) => {
  for (const ch of chars) {
    ACCENT_MAP[ch] = { dead, combining, base: ch.normalize("NFD")[0] };
  }
});

const DIRECT_ACCENTED = new Set(["ç", "Ç"]);

const isCharShifted = (ch) => ch !== ch.toLowerCase() || SHIFT_CHARS.has(ch);

const findHighlightedKeys = (nextChar, pendingCombining) => {
  if (!nextChar) return { keyIds: new Set(), needsShift: false };

  if (DIRECT_ACCENTED.has(nextChar)) {
    const key = CHAR_TO_KEY[nextChar];
    if (!key) return { keyIds: new Set(), needsShift: false };
    return { keyIds: new Set([key.id]), needsShift: isCharShifted(nextChar) };
  }

  const nfd = nextChar.normalize("NFD");
  const base = nfd[0];
  const combining = nfd[1];

  if (combining && combining !== nextChar) {
    if (pendingCombining) {
      const markDead = COMBINING_TO_DEAD_KEY[pendingCombining];
      if (markDead && ACCENT_MAP[nextChar] && ACCENT_MAP[nextChar].dead === markDead) {
        const baseKey = CHAR_TO_KEY[base];
        if (!baseKey) return { keyIds: new Set(), needsShift: false };
        return { keyIds: new Set([baseKey.id]), needsShift: isCharShifted(nextChar) };
      }
    }
    const accentInfo = ACCENT_MAP[nextChar];
    if (accentInfo) {
      const deadKey = CHAR_TO_KEY[accentInfo.dead];
      if (!deadKey) return { keyIds: new Set(), needsShift: false };
      return { keyIds: new Set([deadKey.id]), needsShift: false };
    }
  }

  const key = CHAR_TO_KEY[nextChar];
  if (!key) return { keyIds: new Set(), needsShift: false };
  return { keyIds: new Set([key.id]), needsShift: isCharShifted(nextChar) };
};

const TypingKeyboard = ({ text, userInput, pendingDeadKey, finished }) => {
  const nextChar = useMemo(() => {
    if (finished || !text) return null;
    const idx = userInput ? userInput.length : 0;
    return text[idx] || null;
  }, [text, userInput, finished]);

  const highlighted = useMemo(() => {
    return findHighlightedKeys(nextChar, pendingDeadKey);
  }, [nextChar, pendingDeadKey]);

  const highlightSet = useMemo(() => {
    const ids = highlighted.keyIds;
    if (highlighted.needsShift) {
      ids.add("lshift");
      ids.add("rshift");
    }
    return ids;
  }, [highlighted]);

  if (!text) return null;

  return (
    <div className="typingKeyboardWrapper">
      <div className="typingKeyboard">
        {KEYS_DATA.map((row, ri) => (
          <div className="typingKbRow" key={ri}>
            {row.map((key) => {
              const color = COLORS[key.finger] || "#6B7280";
              const isActive = highlightSet.has(key.id);
              return (
                <div
                  key={key.id}
                  className={`typingKbKey ${isActive ? "isActive" : ""} ${key.id === "space" ? "isSpace" : ""}`}
                  style={{ flex: key.w, "--key-color": color }}
                >
                  <span className="typingKbLabel">{key.label}</span>
                  {key.sub != null && <span className="typingKbSub">{key.sub}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TypingKeyboard;
