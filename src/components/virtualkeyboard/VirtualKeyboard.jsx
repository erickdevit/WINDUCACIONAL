import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import "./virtualkeyboard.scss";

const COMBINE = {
  "´": { a: "á", e: "é", i: "í", o: "ó", u: "ú", c: "ç", y: "ý" },
  "`": { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
  "^": { a: "â", e: "ê", i: "î", o: "ô", u: "û" },
  "~": { a: "ã", o: "õ", n: "ñ" },
};

const CHARS_BASE = "abcdefghijklmnopqrstuvwxyzç";

function insert(c) {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return;
  const t = el.tagName.toLowerCase();
  if (t === "input" || t === "textarea") {
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const v = el.value;
    el.value = v.slice(0, s) + c + v.slice(e);
    el.selectionStart = el.selectionEnd = s + c.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (el.isContentEditable) {
    document.execCommand("insertText", false, c);
  }
}

function backspace() {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return;
  const t = el.tagName.toLowerCase();
  if (t !== "input" && t !== "textarea") return;
  const s = el.selectionStart;
  const e = el.selectionEnd;
  if (e - s > 0) {
    const v = el.value;
    el.value = v.slice(0, s) + v.slice(e);
    el.selectionStart = el.selectionEnd = s;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (s > 0) {
    const v = el.value;
    el.value = v.slice(0, s - 1) + v.slice(s);
    el.selectionStart = el.selectionEnd = s - 1;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

const ROWS = [
  [
    { l: "Esc", k: "Escape", w: 1.2 },
    { l: "`", v: "`", d: true, s: "¬" },
    { l: "1", v: "1", s: "!" },
    { l: "2", v: "2", s: "@" },
    { l: "3", v: "3", s: "#" },
    { l: "4", v: "4", s: "$" },
    { l: "5", v: "5", s: "%" },
    { l: "6", v: "6", s: "¨" },
    { l: "7", v: "7", s: "&" },
    { l: "8", v: "8", s: "*" },
    { l: "9", v: "9", s: "(" },
    { l: "0", v: "0", s: ")" },
    { l: "-", v: "-", s: "_" },
    { l: "=", v: "=", s: "+" },
    { l: "⌫", k: "Backspace", w: 1.5 },
  ],
  [
    { l: "Tab", k: "Tab", w: 1.2 },
    { l: "Q", v: "q" },
    { l: "W", v: "w" },
    { l: "E", v: "e" },
    { l: "R", v: "r" },
    { l: "T", v: "t" },
    { l: "Y", v: "y" },
    { l: "U", v: "u" },
    { l: "I", v: "i" },
    { l: "O", v: "o" },
    { l: "P", v: "p" },
    { l: "´", v: "´", d: true },
    { l: "[", v: "[", s: "{" },
    { l: "]", v: "]", s: "}" },
  ],
  [
    { l: "Caps", k: "CapsLock", w: 1.4 },
    { l: "A", v: "a" },
    { l: "S", v: "s" },
    { l: "D", v: "d" },
    { l: "F", v: "f" },
    { l: "G", v: "g" },
    { l: "H", v: "h" },
    { l: "J", v: "j" },
    { l: "K", v: "k" },
    { l: "L", v: "l" },
    { l: "Ç", v: "ç" },
    { l: "^", v: "^", d: true },
    { l: "~", v: "~", d: true },
    { l: "↵", k: "Enter", w: 1.5 },
  ],
  [
    { l: "⇧", k: "Shift", w: 2.2 },
    { l: "\\", v: "\\", s: "|" },
    { l: "Z", v: "z" },
    { l: "X", v: "x" },
    { l: "C", v: "c" },
    { l: "V", v: "v" },
    { l: "B", v: "b" },
    { l: "N", v: "n" },
    { l: "M", v: "m" },
    { l: ",", v: ",", s: "<" },
    { l: ".", v: ".", s: ">" },
    { l: ";", v: ";", s: ":" },
    { l: "/", v: "/", s: "?" },
    { l: "⇧", k: "Shift", w: 2.2 },
  ],
  [
    { l: "Ctrl", k: "Control", w: 1.8 },
    { l: "Win", k: "Meta", w: 1.8 },
    { l: "Alt", k: "Alt", w: 1.8 },
    { v: " ", w: 6 },
    { l: "AltGr", k: "AltGraph", w: 1.8 },
    { l: "Menu", k: "ContextMenu", w: 1.8 },
    { l: "Ctrl", k: "Control", w: 1.8 },
  ],
];

function VirtualKeyboard() {
  const visible = useSelector((s) => s.globals?.virtualKeyboard);
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [dead, setDead] = useState(null);
  const shiftRef = useRef(false);
  const capsRef = useRef(false);
  const deadRef = useRef(null);

  const getChar = useCallback((keyObj) => {
    if (shiftRef.current && keyObj.s) return keyObj.s;
    if (shiftRef.current && CHARS_BASE.includes(keyObj.v))
      return keyObj.v.toUpperCase();
    if (capsRef.current && CHARS_BASE.includes(keyObj.v))
      return keyObj.v.toUpperCase();
    return keyObj.v;
  }, []);

  const resolveChar = useCallback(
    (keyObj) => {
      if (keyObj.k) return null;
      const shifted = shiftRef.current;
      if (keyObj.d && !(shifted && keyObj.s)) return null;
      return getChar(keyObj);
    },
    [getChar]
  );

  const handleKey = useCallback(
    (keyObj) => {
      const el = document.activeElement;
      if (!el || !(el instanceof HTMLElement)) return;
      const t = el.tagName.toLowerCase();
      const editable =
        t === "input" || t === "textarea" || el.isContentEditable;
      if (!editable) return;

      const k = keyObj.k;
      if (k === "Shift") {
        setShift((p) => {
          const n = !p;
          shiftRef.current = n;
          return n;
        });
        return;
      }
      if (k === "CapsLock") {
        setCaps((p) => {
          const n = !p;
          capsRef.current = n;
          return n;
        });
        return;
      }
      if (k === "Backspace") {
        deadRef.current = null;
        setDead(null);
        backspace();
        return;
      }
      if (k === "Enter") {
        deadRef.current = null;
        setDead(null);
        insert("\n");
        return;
      }
      if (k === "Tab") {
        deadRef.current = null;
        setDead(null);
        insert("\t");
        return;
      }
      if (k === "Escape") {
        deadRef.current = null;
        setDead(null);
        el.blur();
        return;
      }
      if (k) {
        deadRef.current = null;
        setDead(null);
        el.dispatchEvent(
          new KeyboardEvent("keydown", { key: k, bubbles: true })
        );
        return;
      }

      const shifted = shiftRef.current;

      if (keyObj.d && !(shifted && keyObj.s)) {
        deadRef.current = keyObj.v;
        setDead(keyObj.v);
        if (shiftRef.current) {
          setShift(false);
          shiftRef.current = false;
        }
        return;
      }

      const ch = getChar(keyObj);
      const pd = deadRef.current;
      if (pd) {
        deadRef.current = null;
        setDead(null);
        const map = COMBINE[pd];
        if (map && map[ch.toLowerCase()]) {
          const combined = map[ch.toLowerCase()];
          insert(ch === ch.toUpperCase() ? combined.toUpperCase() : combined);
        } else {
          insert(pd);
          insert(ch);
        }
      } else {
        insert(ch);
      }

      if (shiftRef.current) {
        setShift(false);
        shiftRef.current = false;
      }
    },
    [getChar]
  );

  useEffect(() => {
    if (!visible) {
      setShift(false);
      setCaps(false);
      setDead(null);
      shiftRef.current = false;
      capsRef.current = false;
      deadRef.current = null;
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="virtual-keyboard">
      {ROWS.map((row, ri) => (
        <div className="vk-row" key={ri}>
          {row.map((keyObj, ki) => {
            const isLetter = CHARS_BASE.includes(keyObj.v || "");
            const label = isLetter
              ? shift || caps
                ? keyObj.l
                : keyObj.l.toLowerCase()
              : shift && keyObj.s
                ? keyObj.s
                : keyObj.l || "";

            const cls = ["vk-key"];
            if (keyObj.k || keyObj.w > 1.2)
              cls.push("vk-key-wide");
            if (keyObj.d) cls.push("vk-key-dead");
            if (dead === keyObj.v && (keyObj.d && !(shift && keyObj.s)))
              cls.push("vk-key-active");
            if (keyObj.k === "Shift" && shift) cls.push("vk-key-active");
            if (keyObj.k === "CapsLock" && caps) cls.push("vk-key-active");

            return (
              <button
                key={ki}
                className={cls.join(" ")}
                style={{ flex: keyObj.w || 1 }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleKey(keyObj);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleKey(keyObj);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default VirtualKeyboard;
