import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../../../lib/api";
import { Icon } from "../../../utils/general";
import { AppWindow } from "../../../components/shared/AppWindow";
import "./gestor.scss";

export const Gestor = () => {
  const wnapp = useSelector((state) => state.apps.gestor);
  const [activeSection, setActiveSection] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState("all");
  const [ouroUrl, setOuroUrl] = useState("");
  const [savedOuroUrl, setSavedOuroUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [sessionsRes, turmasRes, ouroRes] = await Promise.all([
        api.getGestorSessions(),
        api.getTurmas(),
        api.getOuroModernoConfig(),
      ]);
      setSessions(sessionsRes.sessions || []);
      setTurmas(turmasRes.turmas || []);
      setOuroUrl(ouroRes.url || "");
      setSavedOuroUrl(ouroRes.url || "");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wnapp.hide) loadData();
  }, [wnapp.hide]);

  const handleLogout = async (payload) => {
    let confirmMsg = "Deseja realmente deslogar este aluno?";
    if (payload.target === "all") {
      confirmMsg =
        "Deseja realmente deslogar TODOS os alunos de TODAS as turmas?";
    }
    if (payload.target === "turma") {
      confirmMsg = "Deseja realmente deslogar todos os alunos desta turma?";
    }

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

  const handleSaveOuroUrl = async (event) => {
    event.preventDefault();
    setSavingIntegration(true);
    setMessage("");
    try {
      const result = await api.saveOuroModernoConfig(ouroUrl);
      setOuroUrl(result.url);
      setSavedOuroUrl(result.url);
      setMessage("URL do ITB Ouro Moderno salva com sucesso.");
      window.dispatchEvent(
        new CustomEvent("ouro-moderno:url-updated", {
          detail: { url: result.url },
        })
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingIntegration(false);
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
      window.alert("Para alunos sem turma, deslogue-os individualmente.");
    } else {
      handleLogout({ target: "turma", turmaId: selectedTurmaId });
    }
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Gestor"
      className="gestorApp"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <main className="win11Scroll">
        <header className="gestorHeader">
          <div>
            <h1>Gestor</h1>
            <p>
              {activeSection === "sessions"
                ? "Gerencie as sessões ativas dos alunos no simulador."
                : "Configure as integrações usadas pelos aplicativos."}
            </p>
          </div>

          {activeSection === "sessions" && (
            <div className="gestorHeaderActions">
              <div className="gestorActionButtons">
                <button
                  type="button"
                  className="secondaryBtn"
                  onClick={loadData}
                  disabled={loading}
                >
                  <Icon fafa="faRotate" width={14} />
                  Atualizar
                </button>
                <button
                  type="button"
                  className="dangerBtn"
                  onClick={handleLogoutAction}
                  disabled={
                    loading ||
                    (selectedTurmaId === "all"
                      ? sessions.length === 0
                      : filteredSessions.length === 0)
                  }
                >
                  <Icon fafa="faRightFromBracket" width={14} />
                  {selectedTurmaId === "all"
                    ? "Deslogar todos"
                    : "Deslogar selecionados"}
                </button>
              </div>
              <div className="gestorTurmaFilter">
                <label htmlFor="turma-select">Filtrar turma</label>
                <select
                  id="turma-select"
                  value={selectedTurmaId}
                  onChange={(event) => setSelectedTurmaId(event.target.value)}
                >
                  <option value="all">Todas as turmas</option>
                  <option value="none">Sem turma</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </header>

        <nav className="gestorOptionsBar" aria-label="Opções do Gestor">
          <button
            type="button"
            className={activeSection === "sessions" ? "active" : ""}
            onClick={() => setActiveSection("sessions")}
          >
            Sessões ativas
          </button>
          <button
            type="button"
            className={activeSection === "integrations" ? "active" : ""}
            onClick={() => setActiveSection("integrations")}
          >
            Integrações
          </button>
        </nav>

        <div className="gestorBody">
          {message && (
            <div className="gestorMessage" role="status">
              {message}
            </div>
          )}

          {activeSection === "integrations" ? (
            <section className="integrationPanel">
              <div className="integrationIcon">
                <Icon src="itbOuroModerno" width={42} />
              </div>
              <div className="integrationContent">
                <h2>ITB Ouro Moderno</h2>
                <p>
                  Defina o endereço que professores e alunos acessarão ao abrir
                  o aplicativo. O servidor aceita apenas URLs HTTP ou HTTPS.
                </p>
                <form onSubmit={handleSaveOuroUrl}>
                  <label htmlFor="ouro-moderno-url">URL de acesso</label>
                  <div className="integrationFormRow">
                    <input
                      id="ouro-moderno-url"
                      type="url"
                      inputMode="url"
                      value={ouroUrl}
                      onChange={(event) => setOuroUrl(event.target.value)}
                      placeholder="https://exemplo.com/"
                      maxLength={2048}
                      required
                    />
                    <button
                      type="submit"
                      className="primaryBtn"
                      disabled={
                        savingIntegration ||
                        !ouroUrl.trim() ||
                        ouroUrl.trim() === savedOuroUrl
                      }
                    >
                      {savingIntegration ? "Salvando..." : "Salvar URL"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : filteredSessions.length === 0 && !loading ? (
            <div className="gestorEmptyState">
              <Icon fafa="faUsersSlash" width={48} />
              <p>
                {selectedTurmaId === "all"
                  ? "Nenhum aluno logado no momento."
                  : "Nenhum aluno desta turma logado no momento."}
              </p>
            </div>
          ) : (
            <div className="sessionGroups">
              {Object.values(sessionsByTurma).map((turma) => (
                <section key={turma.id || "sem-turma"} className="sessionCard">
                  <div className="sessionCardHeader">
                    <h2>
                      <Icon fafa="faUsers" width={16} />
                      {turma.nome}
                      <span>
                        {turma.sessions.length} ativo
                        {turma.sessions.length !== 1 ? "s" : ""}
                      </span>
                    </h2>
                    {turma.id && (
                      <button
                        type="button"
                        onClick={() =>
                          handleLogout({ target: "turma", turmaId: turma.id })
                        }
                        disabled={loading}
                      >
                        <Icon fafa="faRightFromBracket" width={12} />
                        Deslogar turma
                      </button>
                    )}
                  </div>
                  <div className="sessionList">
                    {turma.sessions.map((session) => (
                      <div key={session.sessionId} className="sessionRow">
                        <div className="sessionIdentity">
                          <div className="sessionAvatar">
                            {session.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{session.displayName}</strong>
                            <span>
                              @{session.username} · Entrou às{" "}
                              {new Date(session.loginAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="sessionLogoutButton"
                          onClick={() =>
                            handleLogout({
                              target: "user",
                              userId: session.userId,
                            })
                          }
                          title="Deslogar aluno"
                          aria-label={`Deslogar ${session.displayName}`}
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
        </div>
      </main>
    </AppWindow>
  );
};
