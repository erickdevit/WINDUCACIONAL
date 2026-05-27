import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Icon } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { TYPING_LESSONS } from "../assets/typingLessons";
import { useTypingEngine } from "./hooks/useTypingEngine";
import { GameCanvas } from "./GameCanvas";
import { api } from "../../../../lib/api";
import { TypingRankingScrollArea } from "../TypingRankingScrollArea";
import { areTypingCharactersEquivalent } from "../typingInput";
import "./typingKids.scss";

export const TypingKidsApp = () => {
  const wnapp = useSelector((state) => state.apps.typingKids || {});
  const user = useSelector((state) => state.setting.person);
  const engine = useTypingEngine(user);

  const [view, setView] = useState("menu");
  const [rankingTab, setRankingTab] = useState("global");
  const [selectedTurmaId, setSelectedTurmaId] = useState(user?.turmaId || "");
  const [turmas, setTurmas] = useState([]);
  const [ranking, setRanking] = useState({ global: [], turma: [] });
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [selectedResetTurmaId, setSelectedResetTurmaId] = useState("");
  const [resetRankingStatus, setResetRankingStatus] = useState(null);
  const [resettingRanking, setResettingRanking] = useState(false);
  const inputRef = useRef(null);
  const isProfessor = user?.role === "professor";

  useEffect(() => {
    if (view === "lesson" && inputRef.current) {
      inputRef.current.focus();
    }
    if (view === "ranking") {
      fetchRanking();
    }
    if (isStaff && (view === "ranking" || view === "config")) {
      fetchTurmas();
    }
  }, [view, engine.currentLesson, rankingTab, selectedTurmaId]);

  useEffect(() => {
    if (view === "config" && !isProfessor) {
      setView("menu");
    }
  }, [isProfessor, view]);

  const fetchTurmas = async () => {
    try {
      const data = await api.getTurmas("kids");
      setTurmas(data.turmas || []);
      if (!selectedTurmaId && data.turmas?.length > 0) {
        setSelectedTurmaId(data.turmas[0].id);
      }
      if (!selectedResetTurmaId && data.turmas?.length > 0) {
        setSelectedResetTurmaId(data.turmas[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch turmas:", error);
    }
  };

  const fetchRanking = async () => {
    setLoadingRanking(true);
    try {
      const globalData = await api.getTypingGlobalRanking("kids");
      let turmaData;

      if (rankingTab === "turma") {
        if (isStaff && selectedTurmaId) {
          turmaData = await api.getTypingTurmaRankingById(
            selectedTurmaId,
            "kids"
          );
        } else {
          turmaData = await api.getTypingTurmaRanking();
        }
      }

      setRanking({
        global: globalData.ranking || [],
        turma: turmaData?.ranking || [],
      });
    } catch (error) {
      console.error("Failed to fetch ranking:", error);
    } finally {
      setLoadingRanking(false);
    }
  };

  const handleResetTurmaRanking = async (event) => {
    event.preventDefault();
    const selectedTurma = turmas.find(
      (turma) => turma.id === selectedResetTurmaId
    );
    if (!selectedTurma) {
      setResetRankingStatus({
        type: "error",
        text: "Selecione uma turma para zerar o ranking.",
      });
      return;
    }

    if (
      !confirm(
        `Zerar o ranking da turma ${selectedTurma.nome} (${selectedTurma.code})? Essa ação remove as pontuações registradas dessa turma.`
      )
    ) {
      return;
    }

    setResettingRanking(true);
    setResetRankingStatus(null);
    try {
      const result = await api.resetTypingTurmaRanking(
        selectedTurma.code,
        "kids"
      );
      setResetRankingStatus({
        type: "success",
        text: `Ranking da turma ${
          result.turma?.nome || selectedTurma.nome
        } zerado. ${result.deletedScores || 0} registros removidos.`,
      });
      fetchRanking();
    } catch (error) {
      setResetRankingStatus({
        type: "error",
        text: error.message || "Não foi possível zerar o ranking da turma.",
      });
    } finally {
      setResettingRanking(false);
    }
  };

  const isLessonLocked = (index) =>
    !isStaff &&
    index > 0 &&
    !engine.completedLessons.includes(TYPING_LESSONS[index - 1].id);

  const handleLessonSelect = (lesson, index) => {
    if (isLessonLocked(index)) return;
    engine.launchLesson(lesson);
    setView("lesson");
  };

  if (!wnapp || typeof wnapp.hide === "undefined") return null;

  const currentLessonIndex = engine.currentLesson
    ? TYPING_LESSONS.findIndex(
        (lesson) => lesson.id === engine.currentLesson.id
      )
    : 0;

  return (
    <AppWindow
      wnapp={wnapp}
      app="TYPINGKIDS"
      icon={wnapp.icon}
      name="Digitação Kids"
      className="typingKidsApp flex flex-col font-sans bg-white dark:bg-gray-900"
      toolbarProps={{}}
      rootProps={{
        id: `${wnapp.icon}KidsApp`,
      }}
      windowScreenClassName="flex flex-col bg-white dark:bg-[#121212] transition-colors h-full"
      restWindowClassName="flex-grow overflow-y-auto relative bg-gray-50 dark:bg-gray-950"
      screenTop={
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18181b] z-10">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 text-sm font-bold rounded transition-colors ${
                view === "menu"
                  ? "bg-[#ffcc02] text-black"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
              onClick={() => setView("menu")}
            >
              Lições
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold rounded transition-colors ${
                view === "ranking"
                  ? "bg-[#ffcc02] text-black"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
              onClick={() => setView("ranking")}
            >
              Ranking
            </button>
            {isProfessor && (
              <button
                className={`px-3 py-2 text-sm font-bold rounded transition-colors flex items-center justify-center ${
                  view === "config"
                    ? "bg-[#ffcc02] text-black"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
                onClick={() => setView("config")}
                title="Configurações"
                aria-label="Configurações"
              >
                <Icon fafa="faCog" width={14} />
              </button>
            )}
          </div>

          {view === "ranking" && (
            <div className="absolute left-1/2 -translate-x-1/2 flex bg-gray-900 dark:bg-black rounded-lg p-1">
              <button
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                  rankingTab === "global"
                    ? "bg-[#ffcc02] text-black"
                    : "bg-transparent text-white hover:bg-gray-700"
                }`}
                onClick={() => setRankingTab("global")}
              >
                Global
              </button>
              <button
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                  rankingTab === "turma"
                    ? "bg-[#ffcc02] text-black"
                    : "bg-transparent text-white hover:bg-gray-700"
                }`}
                onClick={() => setRankingTab("turma")}
              >
                Minha Turma
              </button>
            </div>
          )}

          <div className="flex items-center space-x-4">
            {isStaff && (
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#ffcc02] border border-[#ffcc02] px-2 py-1 rounded-full">
                {isProfessor ? "Professor" : "Equipe"}
              </span>
            )}
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {user?.name || user?.username}
            </div>
          </div>
        </div>
      }
    >
      <div onClick={() => view === "lesson" && inputRef.current?.focus()}>
        {/* MENU VIEW */}
        {view === "menu" && (
          <div className="max-w-6xl mx-auto p-10 animate-fade-in pb-20">
            <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 flex flex-col md:flex-row md:items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Cursos de Digitação Kids
                </h1>
                <p className="text-gray-500 text-sm mt-2 font-medium">
                  Cada acerto move o personagem pelas plataformas. Erros reduzem
                  vidas e podem derrubar o aluno no obstáculo.
                </p>
              </div>
              <div className="mt-4 md:mt-0 text-sm font-bold text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/10 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/50">
                {engine.completedLessons.length} / {TYPING_LESSONS.length}{" "}
                Concluídas
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {TYPING_LESSONS.map((lesson, i) => {
                const isCompleted = engine.completedLessons.includes(lesson.id);
                const isLocked = isLessonLocked(i);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonSelect(lesson, i)}
                    disabled={isLocked}
                    className={`relative overflow-hidden p-6 border-2 rounded-2xl text-left transition-transform ${
                      isLocked
                        ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed dark:bg-gray-900 dark:border-gray-800"
                        : isCompleted
                        ? "bg-green-50 border-green-400 hover:scale-105 dark:bg-green-900/20"
                        : "bg-white border-blue-200 hover:border-blue-400 hover:scale-105 dark:bg-gray-800 dark:border-gray-700"
                    }`}
                  >
                    <div className="text-4xl mb-4">
                      {i === TYPING_LESSONS.length - 1
                        ? "🏆"
                        : isCompleted
                        ? "⭐"
                        : isLocked
                        ? "🔒"
                        : "🍄"}
                    </div>
                    <div className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-1">
                      Mundo {i + 1}
                    </div>
                    <div className="text-xl font-black text-gray-800 dark:text-gray-100">
                      {lesson.title}
                    </div>
                    {isCompleted && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        CONCLUÍDO
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute top-4 right-4 bg-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full">
                        BLOQUEADO
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* RANKING VIEW */}
        {view === "ranking" && (
          <div className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in pb-20">
            {loadingRanking ? (
              <div className="flex justify-center items-center min-h-[280px]">
                <div className="animate-spin text-amber-500 text-4xl">⭐</div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border-4 border-amber-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                {rankingTab === "turma" && isStaff && turmas.length > 0 && (
                  <div className="px-6 py-4 bg-amber-50 dark:bg-gray-800 border-b-2 border-amber-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-black text-amber-800 dark:text-amber-500 uppercase tracking-wider">
                      Ver Ranking da Turma:
                    </span>
                    <select
                      className="text-sm bg-white dark:bg-gray-900 border-2 border-amber-200 dark:border-gray-700 rounded-xl px-3 py-1.5 outline-none font-bold text-gray-800 dark:text-gray-100 shadow-sm"
                      value={selectedTurmaId}
                      onChange={(e) => setSelectedTurmaId(e.target.value)}
                    >
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <TypingRankingScrollArea variant="kids">
                  <table className="w-full text-left">
                    <thead className="bg-amber-50 dark:bg-gray-800 border-b-2 border-amber-200 dark:border-gray-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-center text-amber-800 dark:text-amber-500 font-black">
                          Pos
                        </th>
                        <th className="px-6 py-4 text-amber-800 dark:text-amber-500 font-black">
                          Jogador
                        </th>
                        <th className="px-6 py-4 text-right text-amber-800 dark:text-amber-500 font-black">
                          Pontos
                        </th>
                        <th className="px-6 py-4 text-right text-amber-800 dark:text-amber-500 font-black">
                          PPM
                        </th>
                        <th className="px-6 py-4 text-right text-amber-800 dark:text-amber-500 font-black">
                          Precisão
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(rankingTab === "global"
                        ? ranking.global
                        : ranking.turma
                      ).length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="p-12 text-center text-gray-500 font-bold text-lg"
                          >
                            Nenhum herói registrou pontos ainda.
                          </td>
                        </tr>
                      ) : (
                        (rankingTab === "global"
                          ? ranking.global
                          : ranking.turma
                        ).map((item, i) => {
                          const isMe =
                            item.name === (user.name || user.username);
                          return (
                            <tr
                              key={i}
                              className={`hover:bg-amber-50/50 dark:hover:bg-gray-800/50 transition-colors ${
                                isMe ? "bg-amber-100 dark:bg-amber-900/30" : ""
                              }`}
                            >
                              <td className="px-6 py-5 text-center">
                                {i === 0 ? (
                                  <span className="text-3xl drop-shadow-md">
                                    👑
                                  </span>
                                ) : i === 1 ? (
                                  <span className="text-2xl drop-shadow-md">
                                    🥈
                                  </span>
                                ) : i === 2 ? (
                                  <span className="text-2xl drop-shadow-md">
                                    🥉
                                  </span>
                                ) : (
                                  <span className="font-black text-gray-400 text-xl">
                                    {i + 1}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 font-black text-lg text-gray-800 dark:text-gray-100">
                                {item.name}
                                {isMe && (
                                  <span className="ml-3 text-[10px] bg-amber-400 text-amber-900 px-3 py-1 rounded-full uppercase tracking-wider">
                                    Você
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 text-right font-mono font-black text-2xl text-amber-500">
                                {item.points || 0}
                              </td>
                              <td className="px-6 py-5 text-right font-mono font-bold text-lg text-blue-500">
                                {item.best_wpm || 0}
                              </td>
                              <td className="px-6 py-5 text-right font-mono font-bold text-lg text-green-500">
                                {Math.floor(item.best_accuracy || 0)}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </TypingRankingScrollArea>
              </div>
            )}
          </div>
        )}

        {view === "config" && isProfessor && (
          <div className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in pb-20">
            <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Configurações Kids
              </h1>
              <p className="text-gray-500 text-sm mt-2 font-medium">
                Ajustes disponíveis somente para professor.
              </p>
            </div>

            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Vidas por lição
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Cada erro de digitação remove uma vida. Ao zerar, o
                    personagem cai no obstáculo e a tentativa termina.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={engine.draftSettings.maxErrors}
                    onChange={(event) =>
                      engine.updateMaxErrors(event.target.value)
                    }
                    className="w-48"
                  />
                  <div className="min-w-[64px] text-center text-2xl font-black text-[#ffcc02] bg-gray-900 rounded-lg px-3 py-2 font-mono">
                    {engine.draftSettings.maxErrors}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    PPM mínimo
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Velocidade mínima exigida para aprovar uma fase.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={engine.draftSettings.passMinWpm}
                      onChange={(event) =>
                        engine.updatePassMinWpm(event.target.value)
                      }
                      className="w-full"
                    />
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={engine.draftSettings.passMinWpm}
                      onChange={(event) =>
                        engine.updatePassMinWpm(event.target.value)
                      }
                      className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center font-mono font-black text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Precisão mínima
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Percentual mínimo de acertos exigido para aprovar uma fase.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={engine.draftSettings.passMinAccuracy}
                      onChange={(event) =>
                        engine.updatePassMinAccuracy(event.target.value)
                      }
                      className="w-full"
                    />
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={engine.draftSettings.passMinAccuracy}
                        onChange={(event) =>
                          engine.updatePassMinAccuracy(event.target.value)
                        }
                        className="w-20 rounded-l-lg bg-transparent px-3 py-2 text-center font-mono font-black text-gray-900 dark:text-white"
                      />
                      <span className="pr-3 font-black text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  {engine.settingsLoading
                    ? "Carregando configuração salva..."
                    : `Meta ativa: ${engine.passMinWpm} PPM, ${engine.passMinAccuracy}% de precisão e ${engine.maxErrors} vidas.`}
                </p>
                <button
                  type="button"
                  disabled={engine.settingsSaving || !engine.settingsDirty}
                  onClick={engine.saveSettings}
                  className="px-5 py-3 rounded-lg bg-[#ffcc02] text-black font-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {engine.settingsSaving
                    ? "Salvando..."
                    : "Salvar configurações"}
                </button>
              </div>
              {engine.settingsStatus && (
                <div
                  className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
                    engine.settingsStatus.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {engine.settingsStatus.text}
                </div>
              )}
            </div>

            <form
              className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm"
              onSubmit={handleResetTurmaRanking}
            >
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Zerar ranking de turma
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Selecione uma turma Kids para remover apenas as pontuações
                    vinculadas a ela.
                  </p>
                  <select
                    value={selectedResetTurmaId}
                    onChange={(event) => {
                      setSelectedResetTurmaId(event.target.value);
                      setResetRankingStatus(null);
                    }}
                    className="mt-4 w-full max-w-sm rounded-xl border-2 border-amber-200 bg-white px-4 py-3 text-sm font-black text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    {turmas.length === 0 ? (
                      <option value="">Nenhuma turma Kids cadastrada</option>
                    ) : (
                      turmas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {turma.nome} ({turma.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={resettingRanking || !selectedResetTurmaId}
                  className="px-5 py-3 rounded-lg bg-red-600 text-white font-black hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resettingRanking ? "Zerando..." : "Zerar ranking"}
                </button>
              </div>
              {resetRankingStatus && (
                <div
                  className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
                    resetRankingStatus.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {resetRankingStatus.text}
                </div>
              )}
            </form>
          </div>
        )}

        {/* LESSON VIEW */}
        {view === "lesson" && (
          <div
            className="flex flex-col min-h-full items-center p-3 md:p-5"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="w-full max-w-6xl flex justify-between items-center mb-3">
              <button
                onClick={() => setView("menu")}
                className="text-blue-500 hover:text-blue-700 font-bold bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow"
              >
                ← Voltar
              </button>
              <div className="text-xl font-black bg-white dark:bg-gray-800 px-6 py-2 rounded-full shadow text-gray-800 dark:text-gray-200">
                Mundo {currentLessonIndex + 1}
              </div>
              <div className="hidden md:block text-right text-xs font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                Meta: {engine.passMinWpm} PPM / {engine.passMinAccuracy}%
              </div>
            </div>

            <div className="typingKidsGameFrame w-full max-w-6xl">
              <div className="typingKidsCanvasWrap">
                <GameCanvas
                  momentum={engine.momentum}
                  mistakeJustAdded={engine.mistakeJustAdded}
                  finished={engine.finished}
                  passed={engine.passed}
                  levelIndex={currentLessonIndex}
                  combo={engine.combo}
                  score={engine.combo * 10}
                  wpm={engine.wpm}
                  lives={engine.lives}
                  maxErrors={engine.maxErrors}
                  sessionId={engine.sessionId}
                />
              </div>

              <div className="typingKidsTextPanel">
                {!engine.finished && (
                  <input
                    ref={inputRef}
                    className="typingKidsInput absolute inset-0 opacity-0 cursor-default"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={engine.userInput}
                    onBeforeInput={engine.handleInputDeadKey}
                    onKeyDown={engine.handleInputDeadKey}
                    onChange={(e) => engine.handleInputChange(e.target.value)}
                    onBlur={() => engine.setFocusLost(true)}
                    onFocus={() => engine.setFocusLost(false)}
                  />
                )}

                <div className="whitespace-pre-wrap break-words select-none relative z-10">
                  {engine.currentLesson?.text.split("").map((char, i) => {
                    let className = "";
                    const typedChar = engine.userInput[i];
                    const isCurrent = i === engine.userInput.length;
                    const isTypedCorrect =
                      typedChar != null &&
                      areTypingCharactersEquivalent(typedChar, char);

                    if (typedChar != null && !isTypedCorrect) {
                      className =
                        "typingKidsChar text-red-500 bg-red-100 dark:bg-red-900/50 rounded animate-bounce";
                    } else if (isTypedCorrect) {
                      className =
                        "typingKidsChar text-green-500 dark:text-green-400 font-bold drop-shadow-sm";
                    } else if (isCurrent && !engine.finished) {
                      className =
                        "typingKidsChar typingKidsCurrentChar bg-amber-300 dark:bg-amber-600 text-gray-900 dark:text-white rounded border-b-4 border-amber-500 shadow-md";
                    } else {
                      className =
                        "typingKidsChar text-gray-500 dark:text-gray-400";
                    }

                    return (
                      <span
                        key={i}
                        className={`transition-colors duration-75 ${className}`}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Results */}
            {engine.finished && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl text-center max-w-lg w-full border-8 border-amber-400 transform transition-transform scale-100 hover:scale-105">
                  <h2
                    className={`text-5xl font-black mb-6 drop-shadow-md ${
                      engine.passed ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {engine.passed
                      ? "MANDOU BEM! 🎉"
                      : engine.lives === 0
                      ? "GAME OVER! 💔"
                      : "TENTE DE NOVO! 🍄"}
                  </h2>

                  <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-6 mb-8 shadow-inner">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                      <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                        Velocidade
                      </span>
                      <span className="text-3xl font-black text-blue-500 font-mono">
                        {engine.wpm} <span className="text-sm">PPM</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                        Precisão
                      </span>
                      <span className="text-3xl font-black text-green-500 font-mono">
                        {engine.accuracy}%
                      </span>
                    </div>
                    {!engine.passed && (
                      <div className="mt-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 p-4 text-left">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500 dark:text-red-300">
                          Meta mínima para passar
                        </div>
                        <div className="mt-2 text-lg font-black text-gray-800 dark:text-gray-100">
                          {engine.passMinWpm} PPM e {engine.passMinAccuracy}% de
                          precisão
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    {engine.passed &&
                      TYPING_LESSONS[currentLessonIndex + 1] && (
                        <button
                          onClick={() =>
                            engine.launchLesson(
                              TYPING_LESSONS[currentLessonIndex + 1]
                            )
                          }
                          className="w-full px-8 py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-black rounded-full shadow-lg transform transition active:scale-95 uppercase tracking-widest"
                        >
                          PRÓXIMO MUNDO ➔
                        </button>
                      )}
                    <button
                      onClick={() => engine.launchLesson(engine.currentLesson)}
                      className="w-full px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white text-xl font-black rounded-full shadow-lg transform transition active:scale-95 uppercase tracking-widest"
                    >
                      {engine.passed
                        ? "JOGAR NOVAMENTE ↻"
                        : "TENTAR NOVAMENTE ↻"}
                    </button>
                    <button
                      onClick={() => setView("menu")}
                      className="w-full px-8 py-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-xl font-bold rounded-full shadow-sm transform transition active:scale-95 uppercase tracking-widest"
                    >
                      Voltar ao Mapa
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppWindow>
  );
};
