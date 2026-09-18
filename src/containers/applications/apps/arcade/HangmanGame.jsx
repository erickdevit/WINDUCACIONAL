import React, { useState } from "react";

export function HangmanGame({
  gameState,
  currentUserId,
  onGuessLetter,
  onGuessWord,
}) {
  const [attemptWordInput, setAttemptWordInput] = useState("");

  if (!gameState) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        Carregando Jogo da Forca...
      </div>
    );
  }

  const {
    players = [],
    category,
    hint,
    guessedLetters = [],
    wrongGuesses = 0,
    maxWrongGuesses = 6,
    maskedWord = "",
    displayWord,
    currentTurn = 0,
    lastActionMessage,
    status,
  } = gameState;

  const activePlayer = players[currentTurn];
  const isMyTurn = activePlayer?.userId === currentUserId;
  const myPlayerObj = players.find((p) => p.userId === currentUserId);
  const isSpectator = !myPlayerObj;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (!attemptWordInput.trim() || !isMyTurn) return;
    onGuessWord(attemptWordInput.trim());
    setAttemptWordInput("");
  };

  // Desenho dos 6 estágios da Forca em SVG
  const renderHangmanSvg = () => {
    return (
      <svg
        viewBox="0 0 100 120"
        className="w-32 h-36 stroke-amber-400 fill-none stroke-[3] drop-shadow-lg"
      >
        {/* Base e Poste */}
        <line x1="10" y1="110" x2="90" y2="110" className="stroke-slate-600" />
        <line x1="30" y1="110" x2="30" y2="10" className="stroke-slate-500" />
        <line x1="30" y1="10" x2="70" y2="10" className="stroke-slate-500" />
        <line x1="70" y1="10" x2="70" y2="25" className="stroke-amber-600" />

        {/* 1. Cabeça */}
        {wrongGuesses >= 1 && <circle cx="70" cy="35" r="10" className="stroke-rose-400" />}

        {/* 2. Tronco */}
        {wrongGuesses >= 2 && <line x1="70" y1="45" x2="70" y2="75" className="stroke-rose-400" />}

        {/* 3. Braço Esquerdo */}
        {wrongGuesses >= 3 && <line x1="70" y1="52" x2="55" y2="65" className="stroke-rose-400" />}

        {/* 4. Braço Direito */}
        {wrongGuesses >= 4 && <line x1="70" y1="52" x2="85" y2="65" className="stroke-rose-400" />}

        {/* 5. Perna Esquerda */}
        {wrongGuesses >= 5 && <line x1="70" y1="75" x2="55" y2="95" className="stroke-rose-400" />}

        {/* 6. Perna Direita */}
        {wrongGuesses >= 6 && <line x1="70" y1="75" x2="85" y2="95" className="stroke-rose-400" />}
      </svg>
    );
  };

  return (
    <div className="hangmanGameContainer flex-grow flex flex-col justify-between p-4 bg-slate-950 text-white rounded-2xl border border-purple-500/30 shadow-2xl relative overflow-hidden">
      {/* Topo - Dica e Categoria */}
      <div className="flex flex-wrap justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-purple-900/80 text-purple-200 border border-purple-500/40 rounded-lg font-bold">
            💡 {category || "Educativo"}
          </span>
          <span className="text-slate-300 italic">Dica: {hint}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-rose-400 font-bold">
            Erros: {wrongGuesses} / {maxWrongGuesses}
          </span>
          <span className="font-bold text-amber-300">
            Vez de: {activePlayer?.displayName || "..."}
          </span>
        </div>
      </div>

      {/* Mensagem de Ação */}
      {lastActionMessage && (
        <div className="text-center my-2 text-xs text-purple-200 bg-purple-950/40 py-1.5 px-3 rounded-lg border border-purple-500/20">
          {lastActionMessage}
        </div>
      )}

      {/* Centro: Forca SVG + Palavra Mascarada */}
      <div className="flex flex-col md:flex-row items-center justify-around my-3 gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex justify-center items-center">{renderHangmanSvg()}</div>

        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl md:text-4xl font-mono font-black tracking-widest text-amber-300 drop-shadow">
            {maskedWord.split("").map((char, i) => (
              <span
                key={i}
                className="inline-block mx-1 border-b-4 border-amber-400 px-1 min-w-[24px] text-center"
              >
                {char}
              </span>
            ))}
          </div>

          {status === "FINISHED" && displayWord && (
            <div className="text-sm font-bold text-emerald-400 bg-emerald-950/60 py-1 px-3 rounded border border-emerald-500/30">
              Palavra Secreta: <strong>{displayWord}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Teclado Virtual A-Z */}
      {!isSpectator && status === "PLAYING" && (
        <div className="hangmanKeyboard flex flex-col items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="flex flex-wrap justify-center gap-1.5 max-w-xl">
            {alphabet.map((letter) => {
              const isUsed = guessedLetters.includes(letter);
              return (
                <button
                  key={letter}
                  disabled={!isMyTurn || isUsed}
                  onClick={() => onGuessLetter(letter)}
                  className={`w-8 h-9 rounded font-black text-sm transition-all shadow ${
                    isUsed
                      ? "bg-slate-800 text-slate-600 border border-slate-700 opacity-40 cursor-not-allowed"
                      : isMyTurn
                      ? "bg-purple-700 hover:bg-purple-600 text-white active:scale-90 border border-purple-400 cursor-pointer"
                      : "bg-slate-800 text-slate-400 border border-slate-700 opacity-60 cursor-not-allowed"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Opção para Tentar Palavra Inteira */}
          {isMyTurn && (
            <form onSubmit={handleWordSubmit} className="flex gap-2 mt-1 w-full max-w-md">
              <input
                type="text"
                placeholder="Sabe a palavra inteira? Arrisque aqui..."
                value={attemptWordInput}
                onChange={(e) => setAttemptWordInput(e.target.value)}
                className="flex-grow px-3 py-1.5 bg-slate-950 border border-purple-500/40 rounded-lg text-xs text-white uppercase focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                disabled={!attemptWordInput.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs"
              >
                🎯 Chutar Palavra
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
