import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import "./virtualkeyboard.scss";

/* ─── Mapa de composição de acentos (dead keys) ─────── */
const COMBINE = {
  "´": { a: "á", e: "é", i: "í", o: "ó", u: "ú", c: "ç", y: "ý" },
  "`": { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
  "^": { a: "â", e: "ê", i: "î", o: "ô", u: "û" },
  "~": { a: "ã", o: "õ", n: "ñ" },
};

const CHARS_BASE = "abcdefghijklmnopqrstuvwxyzç";

/* ─── Manipulação do elemento ativo ─────────────────── */
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

function moveCursor(dir) {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return;
  const t = el.tagName.toLowerCase();
  if (t !== "input" && t !== "textarea") return;
  const s = el.selectionStart;
  if (dir === "left" && s > 0) {
    el.selectionStart = el.selectionEnd = s - 1;
  } else if (dir === "right" && s < el.value.length) {
    el.selectionStart = el.selectionEnd = s + 1;
  }
}

/* ─── Layout ABNT2 adaptado para mobile ─────────────── */
// w = flex grow relativo, d = dead key, s = shifted char, k = key especial
const ROWS = [
  // Linha de números
  [
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
    { l: "⌫", k: "Backspace", w: 1.6, cls: "vk-action" },
  ],
  // Linha QWERTY
  [
    { l: "Tab", k: "Tab", w: 1.4, cls: "vk-action" },
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
  // Linha ASDF
  [
    { l: "Caps", k: "CapsLock", w: 1.6, cls: "vk-action vk-caps" },
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
    { l: "↵", k: "Enter", w: 1.6, cls: "vk-action vk-enter" },
  ],
  // Linha ZXCV
  [
    { l: "⇧", k: "Shift", w: 1.8, cls: "vk-action vk-shift" },
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
    { l: "⇧", k: "Shift", w: 1.8, cls: "vk-action vk-shift" },
  ],
  // Barra de espaço + navegação
  [
    { l: "←", k: "ArrowLeft", w: 1.4, cls: "vk-action" },
    { l: "→", k: "ArrowRight", w: 1.4, cls: "vk-action" },
    { v: " ", w: 7, cls: "vk-space" },
    { l: "Alt", k: "Alt", w: 1.4, cls: "vk-action" },
    { l: "Ctrl", k: "Control", w: 1.4, cls: "vk-action" },
  ],
];

/* ─── Componente principal ───────────────────────────── */
function VirtualKeyboard() {
  const visible = useSelector((s) => s.globals?.virtualKeyboard);
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [dead, setDead] = useState(null);
  const [pressing, setPressing] = useState(null); // key index sendo pressionada
  const shiftRef = useRef(false);
  const capsRef = useRef(false);
  const deadRef = useRef(null);
  const kbRef = useRef(null);

  /* ── Calcular altura e setar --vk-height no body ─── */
  useEffect(() => {
    if (!visible) {
      document.body.removeAttribute("data-vk");
      document.body.style.removeProperty("--vk-height");
      return;
    }

    const updateHeight = () => {
      if (!kbRef.current) return;
      const h = kbRef.current.getBoundingClientRect().height;
      document.body.setAttribute("data-vk", "on");
      document.body.style.setProperty("--vk-height", `${h}px`);
    };

    // Atualiza após o paint inicial
    const raf = requestAnimationFrame(() => {
      updateHeight();
    });

    const obs = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateHeight)
      : null;
    if (obs && kbRef.current) obs.observe(kbRef.current);

    return () => {
      cancelAnimationFrame(raf);
      obs?.disconnect();
      document.body.removeAttribute("data-vk");
      document.body.style.removeProperty("--vk-height");
    };
  }, [visible]);

  /* ── Bloquear teclado nativo nos inputs ─────────── */
  useEffect(() => {
    if (!visible) return;

    const saved = new WeakMap();

    const lockInput = (el) => {
      if (!el || !(el instanceof HTMLElement)) return;
      const t = el.tagName.toLowerCase();
      if (t !== "input" && t !== "textarea" && !el.isContentEditable) return;
      if (!saved.has(el)) {
        saved.set(el, el.getAttribute("inputmode"));
      }
      el.setAttribute("inputmode", "none");
    };

    const restoreInput = (el) => {
      if (!el || !(el instanceof HTMLElement)) return;
      if (saved.has(el)) {
        const orig = saved.get(el);
        if (orig === null) el.removeAttribute("inputmode");
        else el.setAttribute("inputmode", orig);
        saved.delete(el);
      }
    };

    // Travar o foco atual se for editável
    lockInput(document.activeElement);

    const onFocusIn = (e) => lockInput(e.target);
    const onFocusOut = (e) => restoreInput(e.target);

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      // Restaurar todos que ainda estejam com inputmode=none por nós
      document.querySelectorAll("[inputmode='none']").forEach((el) => {
        restoreInput(el);
      });
    };
  }, [visible]);

  /* ── Reset ao fechar ─────────────────────────────── */
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

  const getChar = useCallback((keyObj) => {
    if (shiftRef.current && keyObj.s) return keyObj.s;
    if (shiftRef.current && CHARS_BASE.includes(keyObj.v))
      return keyObj.v.toUpperCase();
    if (capsRef.current && CHARS_BASE.includes(keyObj.v))
      return keyObj.v.toUpperCase();
    return keyObj.v;
  }, []);

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
      if (k === "ArrowLeft") {
        deadRef.current = null;
        setDead(null);
        moveCursor("left");
        return;
      }
      if (k === "ArrowRight") {
        deadRef.current = null;
        setDead(null);
        moveCursor("right");
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

      // Dead key
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

  if (!visible) return null;

  return (
    <div className="virtual-keyboard" ref={kbRef} role="toolbar" aria-label="Teclado virtual">
      {ROWS.map((row, ri) => (
        <div className="vk-row" key={ri}>
          {row.map((keyObj, ki) => {
            const isLetter = CHARS_BASE.includes(keyObj.v || "");
            let label;
            if (keyObj.l === "⌫" || keyObj.l === "↵" || keyObj.l === "⇧") {
              label = keyObj.l;
            } else if (isLetter) {
              label =
                shift || caps ? keyObj.l.toUpperCase() : keyObj.l.toLowerCase();
            } else if (shift && keyObj.s) {
              label = keyObj.s;
            } else {
              label = keyObj.l || " ";
            }

            const isDeadActive =
              dead === keyObj.v && keyObj.d && !(shift && keyObj.s);
            const isShiftActive = keyObj.k === "Shift" && shift;
            const isCapsActive = keyObj.k === "CapsLock" && caps;

            const cls = [
              "vk-key",
              keyObj.cls || "",
              isDeadActive ? "vk-key--dead-active" : "",
              keyObj.d ? "vk-key--dead" : "",
              isShiftActive ? "vk-key--active" : "",
              isCapsActive ? "vk-key--active" : "",
              pressing === `${ri}-${ki}` ? "vk-key--pressing" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const keyStyle = {};
            if (keyObj.w) keyStyle.flex = keyObj.w;

            return (
              <button
                key={ki}
                className={cls}
                style={keyStyle}
                aria-label={keyObj.l || "Espaço"}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setPressing(`${ri}-${ki}`);
                  handleKey(keyObj);
                }}
                onPointerUp={() => setPressing(null)}
                onPointerLeave={() => setPressing(null)}
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
