import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../../../lib/api";
import { Icon } from "../../../utils/general";
import { AppWindow } from "../../../components/shared/AppWindow";
import "./gestor.scss";

export const Gestor = () => {
  const wnapp = useSelector((state) => state.apps.gestor);
  const [sessions, setSessions] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, turmasRes] = await Promise.all([
        api.getGestorSessions(),
        api.getTurmas(),
      ]);
      setSessions(sessionsRes.sessions || []);
      setTurmas(turmasRes.turmas || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wnapp.hide) {
      loadData();
    }
  }, [wnapp.hide]);

  const handleLogout = async (payload) => {
    let confirmMsg = "Deseja realmente deslogar este aluno?";
    if (payload.target === "all") confirmMsg = "Deseja realmente deslogar TODOS os alunos de TODAS as turmas?";
    if (payload.target === "turma") confirmMsg = "Deseja realmente deslogar todos os alunos desta turma?";

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await api.logoutGestorSessions(payload);
      await loadData();
      setMessage("Logout realizado com sucesso.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (selectedTurmaId === "all") return true;
    if (selectedTurmaId === "none") return !session.turmaId;
    return session.turmaId === selectedTurmaId;
  });

  const sessionsByTurma = filteredSessions.reduce((acc, session) => {
    const key = session.turmaId || "sem-turma";
    if (!acc[key]) {
      acc[key] = {
        id: session.turmaId,
        nome: session.turmaNome || "Sem Turma",
        sessions: [],
      };
    }
    acc[key].sessions.push(session);
    return acc;
  }, {});

  const handleLogoutAction = () => {
    if (selectedTurmaId === "all") {
      handleLogout({ target: "all" });
    } else if (selectedTurmaId === "none") {
      // For sessions without turma, we don't have a specific bulk logout by "none" in backend yet, 
      // but we can fallback to individual logouts or just not support bulk for "none" yet.
      // However, the backend post /api/gestor/sessions/logout expects target 'turma' with turmaId.
      alert("Para alunos sem turma, deslogue-os individualmente.");
    } else {
      handleLogout({ target: "turma", turmaId: selectedTurmaId });
    }
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Gestor de Sessões"
      className="gestorApp"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <main className="win11Scroll p-6">
        <header className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Gestor de Alunos</h1>
            <p className="text-gray-500">Gerencie as sessões ativas dos alunos no simulador.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2">
              <button
                className="secondaryBtn flex items-center gap-2"
                onClick={loadData}
                disabled={loading}
              >
                <Icon fafa="faRotate" width={14} />
                Atualizar
              </button>
              <button
                className="dangerBtn flex items-center gap-2"
                onClick={handleLogoutAction}
                disabled={loading || (selectedTurmaId === "all" ? sessions.length === 0 : filteredSessions.length === 0)}
              >
                <Icon fafa="faRightFromBracket" width={14} />
                {selectedTurmaId === "all" ? "Deslogar Todos" : "Deslogar Selecionados"}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-1.5 shadow-sm">
              <label htmlFor="turma-select" className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filtrar Turma:</label>
              <select
                id="turma-select"
                className="text-sm font-medium bg-transparent border-none outline-none focus:ring-0 p-0 cursor-pointer"
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
              >
                <option value="all">Todas as Turmas</option>
                <option value="none">Sem Turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {message && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6" role="alert">
            <p>{message}</p>
          </div>
        )}

        {filteredSessions.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Icon fafa="faUsersSlash" width={48} className="mb-4" />
            <p>{selectedTurmaId === "all" ? "Nenhum aluno logado no momento." : "Nenhum aluno desta turma logado no momento."}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {Object.values(sessionsByTurma).map((turma) => (
              <section key={turma.id || "sem-turma"} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="font-medium flex items-center gap-2">
                    <Icon fafa="faUsers" width={16} />
                    {turma.nome}
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full font-normal">
                      {turma.sessions.length} ativo{turma.sessions.length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  {turma.id && (
                    <button
                      className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                      onClick={() => handleLogout({ target: "turma", turmaId: turma.id })}
                      disabled={loading}
                    >
                      <Icon fafa="faRightFromBracket" width={12} />
                      Deslogar Turma
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {turma.sessions.map((session) => (
                    <div key={session.sessionId} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {session.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{session.displayName}</p>
                          <p className="text-xs text-gray-400">@{session.username} • Entrou às {new Date(session.loginAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-all"
                        onClick={() => handleLogout({ target: "user", userId: session.userId })}
                        title="Deslogar aluno"
                        disabled={loading}
                      >
                        <Icon fafa="faRightFromBracket" width={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </AppWindow>
  );
};
