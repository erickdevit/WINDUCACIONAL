import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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

/* ─── Atualização de elemento controlado no React ─── */
function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  
  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
}

/* ─── Manipulação do elemento ativo ─────────────────── */
function insert(c) {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return;
  const t = el.tagName.toLowerCase();
  if (t === "input" || t === "textarea") {
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const v = el.value;
    const newValue = v.slice(0, s) + c + v.slice(e);
    setNativeValue(el, newValue);
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
    const newValue = v.slice(0, s) + v.slice(e);
    setNativeValue(el, newValue);
    el.selectionStart = el.selectionEnd = s;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (s > 0) {
    const v = el.value;
    const newValue = v.slice(0, s - 1) + v.slice(s);
    setNativeValue(el, newValue);
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

/* ─── Layout ABNT2 Completo e Reequilibrado ─────────────── */
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
    { l: "⌫", k: "Backspace", w: 2.0, cls: "vk-action" },
  ],
  // Linha 2 (QWERTY)
  [
    { l: "Tab", k: "Tab", w: 1.8, cls: "vk-action" },
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
    { l: "↵", k: "Enter", w: 2.0, cls: "vk-action vk-enter" },
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
    { l: "Ctrl", k: "Control", w: 1.5, cls: "vk-action vk-ctrl" },
    { l: "Win", k: "Meta", w: 1.2, cls: "vk-action vk-win", icon: "win" },
    { l: "Alt", k: "Alt", w: 1.2, cls: "vk-action vk-alt" },
    { v: " ", w: 6, cls: "vk-space" },
    { l: "AltGr", k: "AltGraph", w: 1.2, cls: "vk-action vk-altgr" },
    { l: "Menu", k: "ContextMenu", w: 1.2, cls: "vk-action vk-menu", icon: "menu" },
    { l: "Ctrl", k: "Control", w: 1.5, cls: "vk-action vk-ctrl" },
    { l: "←", k: "ArrowLeft", w: 1, cls: "vk-action vk-arrow" },
    { k: "ArrowsUpDown", w: 1, cls: "vk-action vk-arrow-col" },
    { l: "→", k: "ArrowRight", w: 1, cls: "vk-action vk-arrow" },
  ],
];

/* ─── Componente principal ───────────────────────────── */
function VirtualKeyboard() {
  const visible = useSelector((s) => s.globals?.virtualKeyboard);
  const dispatch = useDispatch();
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [altGr, setAltGr] = useState(false);
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const [dead, setDead] = useState(null);
  const [pressing, setPressing] = useState(null);
  
  const [capsAnim, setCapsAnim] = useState(false); // Gatilho de animação de letras

  const shiftRef = useRef(false);
  const capsRef = useRef(false);
  const altGrRef = useRef(false);
  const ctrlRef = useRef(false);
  const altRef = useRef(false);
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

    // Bloquear todos os inputs existentes imediatamente
    const lockAll = () => {
      document.querySelectorAll("input, textarea, [contenteditable='true']").forEach(lockInput);
    };
    lockAll();

    lockInput(document.activeElement);

    const onFocusIn = (e) => lockInput(e.target);
    const onFocusOut = (e) => restoreInput(e.target);

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);

    // MutationObserver para bloquear novos inputs adicionados dinamicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.matches("input, textarea, [contenteditable='true']")) {
              lockInput(node);
            }
            node.querySelectorAll("input, textarea, [contenteditable='true']").forEach(lockInput);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      observer.disconnect();
      document.querySelectorAll("input, textarea, [contenteditable='true']").forEach((el) => {
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
      setCtrl(false);
      setAlt(false);
      setDead(null);
      shiftRef.current = false;
      capsRef.current = false;
      altGrRef.current = false;
      ctrlRef.current = false;
      altRef.current = false;
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

      const k = keyObj.k;

      // ── Mapeamento de Modificadores ──
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
      if (k === "Control") {
        setCtrl((p) => {
          const n = !p;
          ctrlRef.current = n;
          return n;
        });
        return;
      }
      if (k === "Alt") {
        setAlt((p) => {
          const n = !p;
          altRef.current = n;
          return n;
        });
        return;
      }

      // Função auxiliar interna para despachar eventos de teclado completos
      const dispatchKey = (type, keyName, keyCode) => {
        const ev = new KeyboardEvent(type, {
          key: keyName,
          code: keyCode || "",
          bubbles: true,
          cancelable: true,
          ctrlKey: ctrlRef.current,
          shiftKey: shiftRef.current,
          altKey: altRef.current || altGrRef.current,
          metaKey: k === "Meta",
        });
        el.dispatchEvent(ev);
        return ev.defaultPrevented;
      };

      // Se for a tecla Win (Meta) solta
      if (k === "Meta") {
        dispatchKey("keydown", "Meta", "MetaLeft");
        dispatchKey("keyup", "Meta", "MetaLeft");
        
        // Disparar diretamente o clique de alternância do menu iniciar
        dispatch({ type: "STARTOGG" });
        
        // Limpar modificadores
        setCtrl(false);
        setAlt(false);
        setShift(false);
        setAltGr(false);
        ctrlRef.current = false;
        altRef.current = false;
        shiftRef.current = false;
        altGrRef.current = false;
        return;
      }

      // Interceptação das combinações de Ctrl de Edição (Sticky Keys)
      if (ctrlRef.current && ["a", "c", "v", "x", "z", "y"].includes(k.toLowerCase())) {
        const char = k.toLowerCase();
        
        if (char === "a") {
          if (editable) {
            if (t === "input" || t === "textarea") {
              el.select();
            } else if (el.isContentEditable) {
              const range = document.createRange();
              range.selectNodeContents(el);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        } else if (char === "c") {
          let selectedText = "";
          if (t === "input" || t === "textarea") {
            selectedText = el.value.substring(el.selectionStart, el.selectionEnd);
          } else {
            selectedText = window.getSelection().toString();
          }
          if (selectedText) {
            navigator.clipboard.writeText(selectedText).catch((err) => {
              console.warn("Falha ao copiar:", err);
            });
          }
        } else if (char === "x") {
          let selectedText = "";
          if (t === "input" || t === "textarea") {
            const s = el.selectionStart;
            const e = el.selectionEnd;
            selectedText = el.value.substring(s, e);
            if (selectedText) {
              navigator.clipboard.writeText(selectedText).then(() => {
                const newValue = el.value.slice(0, s) + el.value.slice(e);
                setNativeValue(el, newValue);
                el.selectionStart = el.selectionEnd = s;
                el.dispatchEvent(new Event("input", { bubbles: true }));
              }).catch((err) => {
                console.warn("Falha ao cortar:", err);
              });
            }
          } else if (el.isContentEditable) {
            selectedText = window.getSelection().toString();
            if (selectedText) {
              navigator.clipboard.writeText(selectedText).then(() => {
                document.execCommand("delete", false);
              });
            }
          }
        } else if (char === "v") {
          navigator.clipboard.readText().then((clipText) => {
            if (clipText && editable) {
              insert(clipText);
            }
          }).catch((err) => {
            console.warn("Falha ao colar da area de transferencia:", err);
          });
        } else if (char === "z") {
          if (editable) {
            document.execCommand("undo", false);
          }
        } else if (char === "y") {
          if (editable) {
            document.execCommand("redo", false);
          }
        }
        
        // Resetar o Ctrl
        setCtrl(false);
        ctrlRef.current = false;
        return;
      }

      // ── Teclas Físicas de Ação (Backspace, Tab, Enter, Arrows, Esc, etc.) ──
      if (k === "Backspace") {
        deadRef.current = null;
        setDead(null);
        const prevented = dispatchKey("keydown", "Backspace", "Backspace");
        if (!prevented && editable) {
          backspace();
        }
        dispatchKey("keyup", "Backspace", "Backspace");
        return;
      }
      if (k === "Enter") {
        deadRef.current = null;
        setDead(null);
        const prevented = dispatchKey("keydown", "Enter", "Enter");
        if (!prevented && editable) {
          insert("\n");
        }
        dispatchKey("keyup", "Enter", "Enter");
        return;
      }
      if (k === "Tab") {
        deadRef.current = null;
        setDead(null);
        const prevented = dispatchKey("keydown", "Tab", "Tab");
        if (!prevented && editable) {
          insert("\t");
        }
        dispatchKey("keyup", "Tab", "Tab");
        return;
      }
      if (k === "ArrowLeft") {
        deadRef.current = null;
        setDead(null);
        const prevented = dispatchKey("keydown", "ArrowLeft", "ArrowLeft");
        if (!prevented && editable) {
          moveCursor("left");
        }
        dispatchKey("keyup", "ArrowLeft", "ArrowLeft");
        return;
      }
      if (k === "ArrowRight") {
        deadRef.current = null;
        setDead(null);
        const prevented = dispatchKey("keydown", "ArrowRight", "ArrowRight");
        if (!prevented && editable) {
          moveCursor("right");
        }
        dispatchKey("keyup", "ArrowRight", "ArrowRight");
        return;
      }
      if (k === "ArrowUp") {
        dispatchKey("keydown", "ArrowUp", "ArrowUp");
        dispatchKey("keyup", "ArrowUp", "ArrowUp");
        return;
      }
      if (k === "ArrowDown") {
        dispatchKey("keydown", "ArrowDown", "ArrowDown");
        dispatchKey("keyup", "ArrowDown", "ArrowDown");
        return;
      }

      // Outras teclas de controle puras (Escape, Insert, Delete, F1-F12)
      if (k && !keyObj.v) {
        deadRef.current = null;
        setDead(null);
        dispatchKey("keydown", k, k);
        dispatchKey("keyup", k, k);
        return;
      }

      const shifted = shiftRef.current;

      // Dead key
      if (keyObj.d && !(shifted && keyObj.s)) {
        deadRef.current = keyObj.v;
        setDead(keyObj.v);
        // Limpar shift se ele estava ativo
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
      
      // Montar caractere final considerando dead keys
      let finalChar = ch;
      if (pd) {
        deadRef.current = null;
        setDead(null);
        const map = COMBINE[pd];
        if (map && map[ch.toLowerCase()]) {
          const combined = map[ch.toLowerCase()];
          finalChar = ch === ch.toUpperCase() ? combined.toUpperCase() : combined;
        } else {
          // Se não combina, insere a dead key e depois o caractere
          const prevKey = pd;
          const preventedDead = dispatchKey("keydown", prevKey, "");
          if (!preventedDead && editable) {
            insert(prevKey);
          }
          dispatchKey("keyup", prevKey, "");
        }
      }

      // Disparar eventos keydown e keyup para o caractere final
      const prevented = dispatchKey("keydown", finalChar, "");
      if (!prevented && editable) {
        insert(finalChar);
      }
      dispatchKey("keyup", finalChar, "");

      // Resetar os modificadores temporários de clique único
      if (shiftRef.current) {
        setShift(false);
        shiftRef.current = false;
      }
      if (altGrRef.current) {
        setAltGr(false);
        altGrRef.current = false;
      }
      if (ctrlRef.current) {
        setCtrl(false);
        ctrlRef.current = false;
      }
      if (altRef.current) {
        setAlt(false);
        altRef.current = false;
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
            const isCtrlActive = keyObj.k === "Control" && ctrl;
            const isAltActive = keyObj.k === "Alt" && alt;

            const cls = [
              "vk-key",
              keyObj.cls || "",
              isDeadActive ? "vk-key--dead-active" : "",
              keyObj.d ? "vk-key--dead" : "",
              isShiftActive || isCapsActive || isAltGrActive || isCtrlActive || isAltActive ? "vk-key--active" : "",
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
              content = <Icon src="home" width={16} />;
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
              const label = keyObj.l || " ";
              const displayLabel = (shift || caps) && typeof label === "string" ? label.toUpperCase() : label;
              content = displayLabel;
            }

            const isCapsLockKey = keyObj.k === "CapsLock";

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
                {isCapsLockKey && <div className={`vk-led ${caps ? "vk-led--on" : ""}`} />}
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
