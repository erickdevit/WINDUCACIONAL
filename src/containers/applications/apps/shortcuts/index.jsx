import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import "../assets/shortcuts.scss";
import { shortcutGroups, CategoryIcons } from "./data";
import { captureComboFromEvent, isSameCombo, comboToText } from "./utils";

const allShortcuts = shortcutGroups.flatMap((group) => group.items);

export const ShortcutsApp = () => {
  const wnapp = useSelector((state) => state.apps.atalhos);
  const practiceWindowRef = useRef(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    shortcutGroups[0].id
  );
  const [practiceShortcutId, setPracticeShortcutId] = useState("");
  const [attempt, setAttempt] = useState(null);
  const [streak, setStreak] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  const selectedCategory = useMemo(
    () =>
      shortcutGroups.find((group) => group.id === selectedCategoryId) ||
      shortcutGroups[0],
    [selectedCategoryId]
  );
  const practiceShortcut = useMemo(
    () =>
      allShortcuts.find((shortcut) => shortcut.id === practiceShortcutId) ||
      null,
    [practiceShortcutId]
  );

  useEffect(() => {
    if (!practiceShortcut) return undefined;

    practiceWindowRef.current?.focus({ preventScroll: true });

    const handleWindowKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        event.key === "Escape" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.metaKey
      ) {
        closePractice();
        return;
      }

      const combo = captureComboFromEvent(event);
      if (!combo) return;

      const correct = isSameCombo(combo, practiceShortcut.combo);
      setAttempt({
        combo,
        correct,
      });
      setAttemptCount((count) => count + 1);
      setStreak((currentStreak) => (correct ? currentStreak + 1 : 0));
    };

    const stopPropagation = (event) => {
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleWindowKeyDown, true);
    window.addEventListener("keyup", stopPropagation, true);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown, true);
      window.removeEventListener("keyup", stopPropagation, true);
    };
  }, [practiceShortcut]);

  useEffect(() => {
    if (!practiceShortcut || wnapp?.hide || !wnapp?.max) {
      return;
    }
    practiceWindowRef.current?.focus({ preventScroll: true });
  }, [practiceShortcut, wnapp?.hide, wnapp?.max]);

  const openPractice = (shortcut) => {
    setPracticeShortcutId(shortcut.id);
    setAttempt(null);
    setAttemptCount(0);
    setStreak(0);
  };

  const closePractice = () => {
    setPracticeShortcutId("");
    setAttempt(null);
    setAttemptCount(0);
    setStreak(0);
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Atalhos"
      className="shortcutsApp"
      toolbarProps={{ bg: "var(--shortcuts-titlebar)" }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="shortcutsLayout">
        <aside className="shortcutsSidebar">
          <nav
            className="shortcutCategoryNav win11Scroll"
            aria-label="Categorias de atalhos"
          >
            {shortcutGroups.map((group) => (
              <button
                type="button"
                key={group.id}
                className={group.id === selectedCategory.id ? "selected" : ""}
                onClick={() => setSelectedCategoryId(group.id)}
              >
                <span className="catIcon" aria-hidden="true">
                  {CategoryIcons[group.icon]}
                </span>
                <span className="catLabel">{group.title}</span>
                <strong>{group.items.length}</strong>
              </button>
            ))}
          </nav>
        </aside>

        <section className="shortcutsContent" aria-live="polite">
          <div className="shortcutsHeader">
            <h2>{selectedCategory.title}</h2>
          </div>

          <div className="shortcutGrid win11Scroll">
            {selectedCategory.items.map((shortcut) => (
              <button
                type="button"
                key={shortcut.id}
                className="shortcutTile"
                onClick={() => openPractice(shortcut)}
                aria-label={`Praticar ${shortcut.name}: ${comboToText(
                  shortcut.combo
                )}`}
              >
                <div className="tileCombo">
                  {shortcut.combo.map((key, idx) => (
                    <React.Fragment key={key}>
                      {idx > 0 && <span className="comboPlus">+</span>}
                      <kbd>{key}</kbd>
                    </React.Fragment>
                  ))}
                </div>
                <span className="tileName">{shortcut.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {practiceShortcut ? (
        <div className="practiceOverlay" role="presentation">
          <section
            ref={practiceWindowRef}
            className={`practiceWindow ${
              attempt ? (attempt.correct ? "correct" : "wrong") : ""
            }`}
            tabIndex={-1}
            aria-label={`Prática do atalho ${practiceShortcut.name}`}
          >
            <div className="practiceTitleBar">
              <strong>{practiceShortcut.name}</strong>
              <button
                type="button"
                onClick={closePractice}
                aria-label="Fechar prática"
              >
                ×
              </button>
            </div>

            <div className="practiceBody">
              <div className="practicePulse" aria-hidden="true">
                {attempt?.correct ? "✓" : attempt ? "!" : "A"}
              </div>

              <div className="expectedCombo" aria-label="Atalho esperado">
                {practiceShortcut.combo.map((key, idx) => (
                  <React.Fragment key={key}>
                    {idx > 0 && <span className="comboPlus">+</span>}
                    <kbd>{key}</kbd>
                  </React.Fragment>
                ))}
              </div>

              <div className="attemptPanel">
                <span>Sua entrada</span>
                <strong>{attempt ? comboToText(attempt.combo) : "—"}</strong>
              </div>

              <div className="practiceStats">
                <span>{attemptCount} tentativas</span>
                <span>{streak} seguidos</span>
              </div>

              {attempt ? (
                <p
                  className={`practiceResult ${
                    attempt.correct ? "correct" : "wrong"
                  }`}
                >
                  {attempt.correct
                    ? "Correto!"
                    : `Esperado: ${comboToText(practiceShortcut.combo)}`}
                </p>
              ) : (
                <p className="practiceHint">Pressione o atalho no teclado.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </AppWindow>
  );
};
