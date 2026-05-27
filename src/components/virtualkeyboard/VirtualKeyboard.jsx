import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Icon } from "../../utils/general";
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

/* ─── Layout ABNT2 Completo ─────────────── */
const ROWS = [
  // Linha 0 (Controles)
  [
    { l: "Esc", k: "Escape", w: 1, cls: "vk-action" },
    { l: "F1", k: "F1", w: 1, cls: "vk-action" },
    { l: "F2", k: "F2", w: 1, cls: "vk-action" },
    { l: "F3", k: "F3", w: 1, cls: "vk-action" },
    { l: "F4", k: "F4", w: 1, cls: "vk-action" },
    { l: "F5", k: "F5", w: 1, cls: "vk-action" },
    { l: "F6", k: "F6", w: 1, cls: "vk-action" },
    { l: "F7", k: "F7", w: 1, cls: "vk-action" },
    { l: "F8", k: "F8", w: 1, cls: "vk-action" },
    { l: "F9", k: "F9", w: 1, cls: "vk-action" },
    { l: "F10", k: "F10", w: 1, cls: "vk-action" },
    { l: "F11", k: "F11", w: 1, cls: "vk-action" },
    { l: "F12", k: "F12", w: 1, cls: "vk-action" },
    { l: "Ins", k: "Insert", w: 1, cls: "vk-action" },
    { l: "Del", k: "Delete", w: 1, cls: "vk-action" },
  ],
  // Linha 1 (Números)
  [
    { l: "'", v: "'", s: '"', w: 1 },
    { l: "1", v: "1", s: "!", a: "¹", w: 1 },
    { l: "2", v: "2", s: "@", a: "²", w: 1 },
    { l: "3", v: "3", s: "#", a: "³", w: 1 },
    { l: "4", v: "4", s: "$", a: "£", w: 1 },
    { l: "5", v: "5", s: "%", a: "¢", w: 1 },
    { l: "6", v: "6", s: "¨", a: "¬", w: 1 },
    { l: "7", v: "7", s: "&", w: 1 },
    { l: "8", v: "8", s: "*", w: 1 },
    { l: "9", v: "9", s: "(", w: 1 },
    { l: "0", v: "0", s: ")", w: 1 },
    { l: "-", v: "-", s: "_", w: 1 },
    { l: "=", v: "=", s: "+", a: "§", w: 1 },
    { l: "⌫", k: "Backspace", w: 1.8, cls: "vk-action" },
  ],
  // Linha 2 (QWERTY)
  [
    { l: "Tab", k: "Tab", w: 1.5, cls: "vk-action" },
    { l: "Q", v: "q", w: 1 },
    { l: "W", v: "w", w: 1 },
    { l: "E", v: "e", w: 1 },
    { l: "R", v: "r", w: 1 },
    { l: "T", v: "t", w: 1 },
    { l: "Y", v: "y", w: 1 },
    { l: "U", v: "u", w: 1 },
    { l: "I", v: "i", w: 1 },
    { l: "O", v: "o", w: 1 },
    { l: "P", v: "p", w: 1 },
    { l: "´", v: "´", d: true, s: "`", w: 1 },
    { l: "[", v: "[", s: "{", a: "ª", w: 1 },
    { l: "↵", k: "Enter", w: 1.3, cls: "vk-action vk-enter vk-enter-top" },
  ],
  // Linha 3 (ASDF)
  [
    { l: "Caps", k: "CapsLock", w: 1.8, cls: "vk-action vk-caps" },
    { l: "A", v: "a", w: 1 },
    { l: "S", v: "s", w: 1 },
    { l: "D", v: "d", w: 1 },
    { l: "F", v: "f", w: 1 },
    { l: "G", v: "g", w: 1 },
    { l: "H", v: "h", w: 1 },
    { l: "J", v: "j", w: 1 },
    { l: "K", v: "k", w: 1 },
    { l: "L", v: "l", w: 1 },
    { l: "Ç", v: "ç", w: 1 },
    { l: "~", v: "~", d: true, s: "^", w: 1 },
    { l: "]", v: "]", s: "}", a: "º", w: 1 },
    { l: "↵", k: "Enter", w: 1.5, cls: "vk-action vk-enter vk-enter-bottom" },
  ],
  // Linha 4 (ZXCV)
  [
    { l: "⇧", k: "Shift", w: 2.2, cls: "vk-action vk-shift" },
    { l: "\\", v: "\\", s: "|", w: 1 },
    { l: "Z", v: "z", w: 1 },
    { l: "X", v: "x", w: 1 },
    { l: "C", v: "c", w: 1 },
    { l: "V", v: "v", w: 1 },
    { l: "B", v: "b", w: 1 },
    { l: "N", v: "n", w: 1 },
    { l: "M", v: "m", w: 1 },
    { l: ",", v: ",", s: "<", w: 1 },
    { l: ".", v: ".", s: ">", w: 1 },
    { l: ";", v: ";", s: ":", w: 1 },
    { l: "/", v: "/", s: "?", a: "°", w: 1 },
    { l: "⇧", k: "Shift", w: 2.2, cls: "vk-action vk-shift" },
  ],
  // Linha 5 (Espaço e Navegação)
  [
    { l: "Ctrl", k: "Control", w: 1.5, cls: "vk-action" },
    { l: "Win", k: "Meta", w: 1.2, cls: "vk-action vk-win", icon: "win" },
    { l: "Alt", k: "Alt", w: 1.2, cls: "vk-action" },
    { v: " ", w: 6, cls: "vk-space" },
    { l: "AltGr", k: "AltGraph", w: 1.2, cls: "vk-action vk-altgr" },
    { l: "Menu", k: "ContextMenu", w: 1.2, cls: "vk-action vk-menu", icon: "menu" },
    { l: "Ctrl", k: "Control", w: 1.5, cls: "vk-action" },
    { l: "←", k: "ArrowLeft", w: 1, cls: "vk-action vk-arrow" },
    { k: "ArrowsUpDown", w: 1, cls: "vk-action vk-arrow-col" },
    { l: "→", k: "ArrowRight", w: 1, cls: "vk-action vk-arrow" },
  ],
];

/* ─── Componente principal ───────────────────────────── */
function VirtualKeyboard() {
  const visible = useSelector((s) => s.globals?.virtualKeyboard);
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [altGr, setAltGr] = useState(false);
  const [dead, setDead] = useState(null);
  const [pressing, setPressing] = useState(null);
  
  const [capsAnim, setCapsAnim] = useState(false); // Gatilho de animação de letras

  const shiftRef = useRef(false);
  const capsRef = useRef(false);
  const altGrRef = useRef(false);
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

    lockInput(document.activeElement);

    const onFocusIn = (e) => lockInput(e.target);
    const onFocusOut = (e) => restoreInput(e.target);

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
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
      setAltGr(false);
      setDead(null);
      shiftRef.current = false;
      capsRef.current = false;
      altGrRef.current = false;
      deadRef.current = null;
    }
  }, [visible]);

  const getChar = useCallback((keyObj) => {
    if (altGrRef.current && keyObj.a) return keyObj.a;
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
        setCapsAnim(true);
        setTimeout(() => setCapsAnim(false), 300);
        return;
      }
      if (k === "CapsLock") {
        setCaps((p) => {
          const n = !p;
          capsRef.current = n;
          return n;
        });
        setCapsAnim(true);
        setTimeout(() => setCapsAnim(false), 300);
        return;
      }
      if (k === "AltGraph") {
        setAltGr((p) => {
          const n = !p;
          altGrRef.current = n;
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
      // Evitar disparo de letras caso k seja uma dessas teclas de controle
      if (k && !keyObj.v) {
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
      
      // Dead key secundária (shift + dead key principal, ex: shift + ´ = `)
      if (keyObj.d && shifted && keyObj.s) {
        const deadSec = keyObj.s;
        if (["`", "^"].includes(deadSec)) {
          deadRef.current = deadSec;
          setDead(deadSec);
          setShift(false);
          shiftRef.current = false;
          return;
        }
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
      if (altGrRef.current) {
        setAltGr(false);
        altGrRef.current = false;
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
            if (keyObj.k === "ArrowsUpDown") {
              return (
                <div key={ki} className="vk-arrow-col" style={{ flex: keyObj.w }}>
                  <button
                    className={`vk-key vk-action vk-arrow ${pressing === `${ri}-${ki}-up` ? "vk-key--pressing" : ""}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setPressing(`${ri}-${ki}-up`);
                      handleKey({ k: "ArrowUp" });
                    }}
                    onPointerUp={() => setPressing(null)}
                    onPointerLeave={() => setPressing(null)}
                  >
                    ↑
                  </button>
                  <button
                    className={`vk-key vk-action vk-arrow ${pressing === `${ri}-${ki}-down` ? "vk-key--pressing" : ""}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setPressing(`${ri}-${ki}-down`);
                      handleKey({ k: "ArrowDown" });
                    }}
                    onPointerUp={() => setPressing(null)}
                    onPointerLeave={() => setPressing(null)}
                  >
                    ↓
                  </button>
                </div>
              );
            }

            const isLetter = CHARS_BASE.includes(keyObj.v || "");
            
            const isDeadActive =
              (dead === keyObj.v && keyObj.d && !shift) ||
              (dead === keyObj.s && keyObj.d && shift);
              
            const isShiftActive = keyObj.k === "Shift" && shift;
            const isCapsActive = keyObj.k === "CapsLock" && caps;
            const isAltGrActive = keyObj.k === "AltGraph" && altGr;

            const cls = [
              "vk-key",
              keyObj.cls || "",
              isDeadActive ? "vk-key--dead-active" : "",
              keyObj.d ? "vk-key--dead" : "",
              isShiftActive || isCapsActive || isAltGrActive ? "vk-key--active" : "",
              pressing === `${ri}-${ki}` ? "vk-key--pressing" : "",
              isLetter && capsAnim ? "vk-letter-anim" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const keyStyle = {};
            if (keyObj.w) keyStyle.flex = keyObj.w;
            
            // Lógica de renderização do rótulo da tecla
            let content;
            if (keyObj.icon === "win") {
              content = <Icon fafa="faWindows" width={14} />;
            } else if (keyObj.icon === "menu") {
              content = <Icon fafa="faBars" width={14} />;
            } else if (keyObj.s || keyObj.a) {
              // Tecla com múltiplos caracteres
              content = (
                <div className="vk-key-multi">
                  {keyObj.s && <span className="vk-sec">{keyObj.s}</span>}
                  <span className="vk-pri">{keyObj.l}</span>
                  {keyObj.a && <span className="vk-ter">{keyObj.a}</span>}
                </div>
              );
            } else if (isLetter) {
              const letter = shift || caps ? keyObj.l.toUpperCase() : keyObj.l.toLowerCase();
              content = <span className="vk-letter">{letter}</span>;
            } else {
              content = keyObj.l || " ";
            }

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
                {isCapsActive && keyObj.k === "CapsLock" && <div className="vk-led" />}
                {content}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default VirtualKeyboard;
