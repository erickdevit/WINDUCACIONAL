import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { CheckersBoard } from "./CheckersBoard";
import { UnoTable } from "./UnoTable";
import { DominoTable } from "./DominoTable";
import { TicTacToeBoard } from "./TicTacToeBoard";
import { HangmanGame } from "./HangmanGame";
import "./arcade.scss";

export function ArcadeApp() {
  const wnapp = useSelector((state) => state.apps.arcade || {});

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action || "ARCADEAPP"}
      icon="arcade"
      name="Arcade"
      className="arcadeAppWindow"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <ArcadeView visible={!wnapp.hide} />
    </AppWindow>
  );
}

function ArcadeView({ visible }) {
  const person = useSelector((state) => state.setting.person) || {};

  const [activeTab, setActiveTab] = useState("lobby"); // 'lobby', 'ranking'
  const [rooms, setRooms] = useState([]);
  const [selectedGameFilter, setSelectedGameFilter] = useState("all"); // 'all', 'checkers', 'uno', 'domino', 'tictactoe', 'hangman'
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(null);

  // Modal de criação de sala
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomGameType, setNewRoomGameType] = useState("checkers");
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(4);

  // Rankings
  const [rankings, setRankings] = useState({
    turmaRankings: [],
    globalRankings: [],
  });
  const [rankingGameType, setRankingGameType] = useState("overall");
  const [rankingScope, setRankingScope] = useState("turma"); // 'turma' ou 'global'

  // Carrega lista de salas
  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getArcadeRooms({
        gameType: selectedGameFilter === "all" ? undefined : selectedGameFilter,
      });
      setRooms(data.rooms || []);
    } catch (err) {
      console.error("Erro ao listar salas do Arcade:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedGameFilter]);

  // Carrega rankings
  const loadRankings = useCallback(async () => {
    try {
      const data = await api.getArcadeRankings({
        turmaId: person.turmaId,
        gameType: rankingGameType,
      });
      setRankings({
        turmaRankings: data.turmaRankings || [],
        globalRankings: data.globalRankings || [],
      });
    } catch (err) {
      console.error("Erro ao carregar rankings do Arcade:", err);
    }
  }, [person.turmaId, rankingGameType]);

  useEffect(() => {
    if (!visible) return;
    if (activeTab === "lobby" && !activeRoom) {
      loadRooms();
      const interval = setInterval(() => {
        loadRooms();
      }, 4000);
      return () => clearInterval(interval);
    } else if (activeTab === "ranking") {
      loadRankings();
    }
  }, [visible, activeTab, activeRoom, loadRooms, loadRankings]);

  // Sincronização periódica da sala de espera para atualização rápida de participantes
  useEffect(() => {
    if (!visible || !activeRoom?.id || activeRoom.status !== "WAITING") return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getArcadeRoom(activeRoom.id);
        if (data && data.room) {
          setActiveRoom((prev) => {
            if (!prev || prev.id !== data.room.id) return prev;
            return {
              ...prev,
              ...data.room,
              players: data.players || prev.players,
              gameState: data.gameState || prev.gameState,
            };
          });
        }
      } catch {
        // Silencioso em caso de instabilidade pontual
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [visible, activeRoom?.id, activeRoom?.status]);

  // Streaming SSE em tempo real (apenas quando a janela está visível e dentro de uma sala)
  useEffect(() => {
    if (!visible || !activeRoom?.id) return;

    const eventSource = new EventSource(
      `/api/arcade/rooms/${activeRoom.id}/stream`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "SYNC_STATE") {
          setActiveRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: payload.status,
                  gameState: payload.gameState,
                }
              : null
          );
        } else if (payload.type === "ROOM_UPDATED") {
          setActiveRoom((prev) =>
            prev
              ? {
                  ...prev,
                  players: payload.players,
                }
              : null
          );
        } else if (payload.type === "GAME_STARTED") {
          setActiveRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: payload.status,
                  gameState: payload.gameState,
                  players: payload.players || prev.players,
                }
              : null
          );
        } else if (payload.type === "GAME_UPDATED") {
          setActiveRoom((prev) =>
            prev
              ? {
                  ...prev,
                  gameState: payload.gameState,
                }
              : null
          );
        } else if (payload.type === "GAME_OVER") {
          setActiveRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: "FINISHED",
                  winnerUserId: payload.winnerUserId,
                  gameState: payload.gameState,
                }
              : null
          );
          loadRankings();
        } else if (payload.type === "ROOM_RESET") {
          setActiveRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: "WAITING",
                  gameState: null,
                  players: payload.players,
                }
              : null
          );
        } else if (payload.type === "ROOM_CLOSED") {
          setActiveRoom(null);
          loadRooms();
          if (payload.message) {
            setErrorMsg(payload.message);
            setTimeout(() => setErrorMsg(""), 4000);
          }
        }
      } catch (err) {
        console.error("Erro ao processar evento do Arcade:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Erro na conexão SSE do Arcade:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [visible, activeRoom?.id, loadRankings, loadRooms]);

  // Contagem regressiva para remoção automática de sala encerrada
  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "FINISHED") {
      setAutoCloseCountdown(null);
      return;
    }

    setAutoCloseCountdown(30);
    const timer = setInterval(() => {
      setAutoCloseCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRoom?.status, activeRoom?.id]);

  // Retorna automaticamente ao saguão quando o tempo esgota
  useEffect(() => {
    if (autoCloseCountdown === 0 && activeRoom?.status === "FINISHED") {
      setActiveRoom(null);
      loadRooms();
    }
  }, [autoCloseCountdown, activeRoom?.status, loadRooms]);

  // Criação de nova sala
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      let maxP = 2;
      if (newRoomGameType === "uno") maxP = newRoomMaxPlayers;
      else if (newRoomGameType === "domino" || newRoomGameType === "hangman")
        maxP = newRoomMaxPlayers;

      const data = await api.createArcadeRoom({
        title: newRoomTitle,
        gameType: newRoomGameType,
        maxPlayers: maxP,
      });
      setShowCreateModal(false);
      setNewRoomTitle("");
      handleEnterRoom(data.room.id);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao criar sala.");
    }
  };

  // Entrar em uma sala ou acompanhar partida
  const handleEnterRoom = async (roomId, isSpectator = false) => {
    setErrorMsg("");
    try {
      if (!isSpectator) {
        await api.joinArcadeRoom(roomId);
      }
      const data = await api.getArcadeRoom(roomId);
      setActiveRoom({
        ...data.room,
        players: data.players,
        gameState: data.gameState,
      });
    } catch (err) {
      try {
        const data = await api.getArcadeRoom(roomId);
        setActiveRoom({
          ...data.room,
          players: data.players,
          gameState: data.gameState,
        });
      } catch (getErr) {
        setErrorMsg(
          getErr.message || err.message || "Não foi possível entrar na sala."
        );
      }
    }
  };

  // Sair da sala
  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    try {
      if (myPlayerObj) {
        await api.leaveArcadeRoom(activeRoom.id);
      }
    } catch (err) {
      console.error("Erro ao sair da sala:", err);
    } finally {
      setActiveRoom(null);
      loadRooms();
    }
  };

  // Alternar Pronto (Ready)
  const handleToggleReady = async () => {
    if (!activeRoom) return;
    try {
      const data = await api.toggleArcadeReady(activeRoom.id);
      setActiveRoom((prev) => ({ ...prev, players: data.players }));
    } catch (err) {
      console.error("Erro ao alternar pronto:", err);
    }
  };

  // Iniciar partida (Host)
  const handleStartMatch = async () => {
    if (!activeRoom) return;
    setErrorMsg("");
    try {
      const data = await api.startArcadeGame(activeRoom.id);
      setActiveRoom((prev) => ({
        ...prev,
        status: "PLAYING",
        gameState: data.gameState,
      }));
    } catch (err) {
      setErrorMsg(err.message || "Não foi possível iniciar a partida.");
    }
  };

  // Ações de jogo
  const handleGameAction = async (action) => {
    if (!activeRoom) return;
    try {
      const data = await api.sendArcadeAction(activeRoom.id, action);
      setActiveRoom((prev) => ({ ...prev, gameState: data.gameState }));
    } catch (err) {
      setErrorMsg(err.message || "Ação inválida.");
    }
  };

  // Solicitar revanche
  const handleRematch = async () => {
    if (!activeRoom) return;
    try {
      await api.rematchArcadeGame(activeRoom.id);
      setActiveRoom((prev) => ({
        ...prev,
        status: "WAITING",
        gameState: null,
      }));
    } catch (err) {
      setErrorMsg(err.message || "Erro ao reiniciar partida.");
    }
  };

  // Apagar sala
  const handleDeleteRoom = async (roomId, roomTitle) => {
    if (
      !window.confirm(
        `Tem certeza de que deseja apagar a sala "${roomTitle || "selecionada"}"?`
      )
    ) {
      return;
    }

    try {
      await api.deleteArcadeRoom(roomId);
      if (activeRoom?.id === roomId) {
        setActiveRoom(null);
      }
      loadRooms();
    } catch (err) {
      setErrorMsg(err.message || "Não foi possível apagar a sala.");
    }
  };

  const isStaff = person.role === "professor" || person.role === "admin";
  const isHost =
    activeRoom?.hostUserId === person.id ||
    (person.username && activeRoom?.hostUsername === person.username) ||
    isStaff;
  const myPlayerObj = activeRoom?.players?.find(
    (p) =>
      (person.id && p.userId === person.id) ||
      (person.username && p.username === person.username)
  );

  // Validação de início de partida
  const canStartMatch =
    isHost &&
    (activeRoom?.gameType === "checkers" || activeRoom?.gameType === "tictactoe"
      ? activeRoom.players?.length === 2
      : activeRoom?.players?.length >= 2);

  const isPlayingOrFinished =
    activeTab === "lobby" &&
    activeRoom &&
    (activeRoom.status === "PLAYING" || activeRoom.status === "FINISHED");

  const getGameLabel = (type) => {
    switch (type) {
      case "checkers":
        return "Damas";
      case "uno":
        return "Uno";
      case "domino":
        return "Dominó";
      case "tictactoe":
        return "Jogo da Velha";
      case "hangman":
        return "Forca";
      default:
        return type;
    }
  };

  return (
    <div className={`arcadeContainer ${isPlayingOrFinished ? "inMatchMode" : ""}`}>
      {/* Header do Arcade */}
      {!isPlayingOrFinished && (
        <header className="arcadeHeader">
          <div className="arcadeBrand">
            <div className="arcadeLogoIcon">
              <img src="img/icon/arcade.svg" alt="Arcade" />
            </div>
            <div className="arcadeBrandTitles">
              <h2>Arcade da Turma</h2>
              <span>Jogos Multiplayer Escolares</span>
            </div>
          </div>

          <nav className="arcadeNavTabs">
            <button
              className={activeTab === "lobby" ? "active" : ""}
              onClick={() => {
                setActiveTab("lobby");
                if (!activeRoom) loadRooms();
              }}
            >
              🕹️ Salas de Jogos
            </button>
            <button
              className={activeTab === "ranking" ? "active" : ""}
              onClick={() => {
                setActiveTab("ranking");
                loadRankings();
              }}
            >
              🏆 Hall da Fama
            </button>
          </nav>

          <div className="arcadeHeaderUser">
            <div className="arcadeUserBadge">
              <strong>{person.name || person.username || "Jogador"}</strong>
              <small>{person.turmaName || "Turma Geral"}</small>
            </div>
            <div className="arcadeAvatarCircle">
              {(person.name || person.username || "J")[0]?.toUpperCase()}
            </div>
          </div>
        </header>
      )}

      {/* Conteúdo Principal */}
      <main className={`arcadeMainContent ${isPlayingOrFinished ? "inMatchContent" : ""}`}>
        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-red-900/60 border border-red-500 rounded-lg text-xs text-red-200 flex justify-between items-center">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg("")}
              className="text-red-300 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================= ABA DE RANKINGS ================= */}
        {activeTab === "ranking" && (
          <div className="arcadeRankingsView">
            <div className="rankingControlBar flex flex-wrap gap-2 justify-between items-center">
              <div className="scopeSelector">
                <button
                  className={rankingScope === "turma" ? "active" : ""}
                  onClick={() => setRankingScope("turma")}
                >
                  Minha Turma
                </button>
                <button
                  className={rankingScope === "global" ? "active" : ""}
                  onClick={() => setRankingScope("global")}
                >
                  Geral da Escola
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "overall", label: "Todos os Jogos" },
                  { id: "checkers", label: "Damas" },
                  { id: "uno", label: "Uno" },
                  { id: "domino", label: "Dominó" },
                  { id: "tictactoe", label: "Jogo da Velha" },
                  { id: "hangman", label: "Forca" },
                ].map((g) => (
                  <button
                    key={g.id}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      rankingGameType === g.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                    onClick={() => setRankingGameType(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rankingsTableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Jogador</th>
                    <th>Vitórias</th>
                    <th>Partidas</th>
                    <th>Pontos Totais</th>
                  </tr>
                </thead>
                <tbody>
                  {(rankingScope === "turma"
                    ? rankings.turmaRankings
                    : rankings.globalRankings
                  ).map((entry, idx) => {
                    const isMe = entry.userId === person.id;
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <tr
                        key={entry.userId}
                        className={isMe ? "currentUserRow" : ""}
                      >
                        <td>{medals[idx] || `${idx + 1}º`}</td>
                        <td>{entry.displayName || entry.username}</td>
                        <td>{entry.winsCount || 0}</td>
                        <td>{entry.matchesPlayed || 0}</td>
                        <td className="text-amber-400 font-extrabold">
                          {entry.totalPoints || 0} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(rankingScope === "turma"
                ? rankings.turmaRankings
                : rankings.globalRankings
              ).length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Nenhuma pontuação registrada para este ranking ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ABA DO LOBBY ================= */}
        {activeTab === "lobby" && !activeRoom && (
          <div className="arcadeLobbyView">
            <div className="arcadeLobbyBanner">
              <div className="bannerInfo">
                <h3>Salas de Jogos da Turma</h3>
                <p>
                  Jogue partidas multiplayer educativas com seus colegas de classe!
                  Escolha entre Damas, Uno, Dominó, Jogo da Velha e Forca.
                </p>
              </div>
              <button
                className="bannerActionBtn"
                onClick={() => setShowCreateModal(true)}
              >
                <span>➕</span> Criar Sala de Jogo
              </button>
            </div>

            <div className="arcadeFilterRow">
              <div className="gameTypeFilters flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "Todos os Jogos" },
                  { id: "checkers", label: "Damas" },
                  { id: "uno", label: "Uno" },
                  { id: "domino", label: "Dominó" },
                  { id: "tictactoe", label: "Jogo da Velha" },
                  { id: "hangman", label: "Forca" },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={selectedGameFilter === f.id ? "active" : ""}
                    onClick={() => setSelectedGameFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button className="refreshBtn" onClick={loadRooms}>
                🔄 Atualizar
              </button>
            </div>

            {/* Grid de Salas */}
            <div className="arcadeRoomsGrid">
              {rooms.map((room) => (
                <div key={room.id} className="arcadeRoomCard">
                  <div className="cardTop">
                    <span className={`gameBadge ${room.gameType}`}>
                      {getGameLabel(room.gameType)}
                    </span>
                    <span className={`statusPill ${room.status.toLowerCase()}`}>
                      {room.status === "WAITING"
                        ? "Aguardando"
                        : room.status === "PLAYING"
                        ? "Em partida"
                        : "Encerrada"}
                    </span>
                  </div>

                  <div className="cardBody">
                    <h4>{room.title}</h4>
                    <p>Criada por {room.hostName || room.hostUsername}</p>
                  </div>

                  <div className="cardFooter">
                    <div className="playerCount">
                      👥 {room.playerCount || 1} / {room.maxPlayers}
                    </div>

                    <div className="cardFooterBtns">
                      <button
                        className="enterRoomBtn"
                        onClick={() =>
                          handleEnterRoom(room.id, room.status !== "WAITING")
                        }
                      >
                        {room.status === "WAITING"
                          ? "Entrar na Sala"
                          : "Acompanhar"}
                      </button>

                      {(isStaff || room.hostUserId === person.id) && (
                        <button
                          className="deleteRoomCardBtn"
                          title="Apagar Sala"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id, room.title);
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {rooms.length === 0 && !loading && (
              <div className="arcadeEmptyState">
                <div className="text-4xl">🕹️</div>
                <h4>Nenhuma sala aberta no momento</h4>
                <p>
                  Que tal criar uma nova sala de jogo e convidar seus
                  colegas de turma?
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= SALA DE ESPERA (WAITING) ================= */}
        {activeTab === "lobby" &&
          activeRoom &&
          activeRoom.status === "WAITING" && (
            <div className="arcadeWaitingRoom">
              <div className="waitingHeader">
                <div className="waitingInfo">
                  <h3>{activeRoom.title}</h3>
                  <span>
                    Jogo:{" "}
                    <strong className="text-indigo-400">
                      {getGameLabel(activeRoom.gameType)} ({activeRoom.maxPlayers} Jogadores)
                    </strong>
                  </span>
                </div>

                <div className="waitingHeaderActions">
                  <button className="leaveBtn" onClick={handleLeaveRoom}>
                    Sair da Sala
                  </button>

                  {(isStaff || isHost) && (
                    <button
                      className="deleteRoomBtn"
                      onClick={() =>
                        handleDeleteRoom(activeRoom.id, activeRoom.title)
                      }
                    >
                      🗑️ Apagar Sala
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-300 mb-3">
                  Jogadores Conectados ({activeRoom.players?.length || 0} /{" "}
                  {activeRoom.maxPlayers})
                </h4>
                <div className="playersGrid">
                  {activeRoom.players?.map((p) => (
                    <div key={p.userId} className="playerSeatCard">
                      <div className="playerAvatar">
                        {p.displayName?.[0] || "?"}
                      </div>
                      <div className="playerMeta">
                        <strong>{p.displayName || p.username}</strong>
                        <small>
                          {p.userId === activeRoom.hostUserId
                            ? "👑 Criador da Sala"
                            : "Aluno"}
                        </small>
                      </div>
                      <span
                        className={`readyTag ${
                          p.isReady ? "ready" : "waiting"
                        }`}
                      >
                        {p.isReady ? "Pronto" : "Aguardando"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="waitingFooterActions">
                <button
                  className={`readyToggleBtn ${
                    myPlayerObj?.isReady ? "isReady" : ""
                  }`}
                  onClick={handleToggleReady}
                >
                  {myPlayerObj?.isReady
                    ? "✓ Estou Pronto!"
                    : "Marcar como Pronto"}
                </button>

                {isHost && (
                  <button
                    className="startMatchBtn"
                    disabled={!canStartMatch}
                    onClick={handleStartMatch}
                  >
                    🚀 Iniciar Partida
                  </button>
                )}

                {!isHost && (
                  <span className="text-xs text-slate-400">
                    Aguardando o criador da sala iniciar a partida...
                  </span>
                )}
              </div>

              {activeRoom.players?.length < 2 && (
                <div className="text-center text-xs text-amber-300">
                  Aguardando pelo menos mais 1 jogador para liberar o início da partida.
                </div>
              )}
            </div>
          )}

        {/* ================= PARTIDA EM ANDAMENTO (PLAYING OU FINISHED) ================= */}
        {activeTab === "lobby" &&
          activeRoom &&
          (activeRoom.status === "PLAYING" ||
            activeRoom.status === "FINISHED") && (
            <div className="arcadeActiveGameWrapper">
              <div className="activeGameTopBar">
                <div className="activeGameInfo">
                  <div className="gameLogoMini">
                    <img src="img/icon/arcade.svg" alt="Arcade" />
                  </div>
                  <span className="roomTitle">{activeRoom.title}</span>
                  <span className={`gameBadge ${activeRoom.gameType}`}>
                    {getGameLabel(activeRoom.gameType)}
                  </span>
                  {!myPlayerObj && (
                    <span className="spectatorBadge">
                      👁️ Modo Espectador
                    </span>
                  )}
                </div>

                <div className="activeGameHudCenter">
                  {activeRoom.gameType === "checkers" && activeRoom.gameState && (
                    <div className="checkersHudSummary">
                      <span className="capturesScore">
                        Placar: 🔴 {activeRoom.gameState.capturedCount?.[0] || 0} x {activeRoom.gameState.capturedCount?.[1] || 0} ⚪
                      </span>
                    </div>
                  )}

                  {activeRoom.gameType === "uno" && activeRoom.gameState?.activeColor && (
                    <div className="unoHudSummary">
                      <span className={`hudColorPill ${activeRoom.gameState.activeColor}`}>
                        Cor: {activeRoom.gameState.activeColor}
                      </span>
                    </div>
                  )}
                </div>

                <div className="activeGameActions">
                  <button className="leaveBtn" onClick={handleLeaveRoom}>
                    {myPlayerObj ? "Sair da Partida" : "Voltar ao Saguão"}
                  </button>

                  {(isStaff || isHost) && (
                    <button
                      className="deleteRoomBtn"
                      onClick={() =>
                        handleDeleteRoom(activeRoom.id, activeRoom.title)
                      }
                    >
                      🗑️ Apagar Sala
                    </button>
                  )}
                </div>
              </div>

              {activeRoom.gameType === "checkers" && (
                <CheckersBoard
                  gameState={activeRoom.gameState}
                  currentUserId={person.id}
                  currentUsername={person.username}
                  onMove={(move) => handleGameAction({ type: "MOVE", move })}
                  onResign={() => handleGameAction({ type: "RESIGN" })}
                />
              )}

              {activeRoom.gameType === "uno" && (
                <UnoTable
                  gameState={activeRoom.gameState}
                  currentUserId={person.id}
                  currentUsername={person.username}
                  onPlayCard={(cardId, chosenColor) =>
                    handleGameAction({ type: "PLAY_CARD", cardId, chosenColor })
                  }
                  onDrawCard={() => handleGameAction({ type: "DRAW_CARD" })}
                  onPassTurn={() => handleGameAction({ type: "PASS" })}
                  onCallUno={() => handleGameAction({ type: "CALL_UNO" })}
                  onCatchUno={(targetUserId) =>
                    handleGameAction({ type: "CATCH_UNO", targetUserId })
                  }
                />
              )}

              {activeRoom.gameType === "domino" && (
                <DominoTable
                  gameState={activeRoom.gameState}
                  currentUserId={person.id}
                  onPlayTile={(tileId, targetEnd) =>
                    handleGameAction({ type: "PLAY_TILE", tileId, targetEnd })
                  }
                  onDrawTile={() => handleGameAction({ type: "DRAW_TILE" })}
                  onPassTurn={() => handleGameAction({ type: "PASS" })}
                />
              )}

              {activeRoom.gameType === "tictactoe" && (
                <TicTacToeBoard
                  gameState={activeRoom.gameState}
                  currentUserId={person.id}
                  onMakeMove={(position) =>
                    handleGameAction({ type: "MAKE_MOVE", position })
                  }
                />
              )}

              {activeRoom.gameType === "hangman" && (
                <HangmanGame
                  gameState={activeRoom.gameState}
                  currentUserId={person.id}
                  onGuessLetter={(letter) =>
                    handleGameAction({ type: "GUESS_LETTER", letter })
                  }
                  onGuessWord={(attemptWord) =>
                    handleGameAction({ type: "GUESS_WORD", attemptWord })
                  }
                />
              )}
            </div>
          )}

        {/* Modal de Fim de Jogo */}
        {activeRoom && activeRoom.status === "FINISHED" && (
          <div className="arcadeGameOverModal">
            <div className="gameOverCard">
              <div className="trophyIcon">🏆</div>
              <h3>Partida Concluída!</h3>
              <p>
                {activeRoom.winnerUserId === person.id
                  ? "Parabéns! Você venceu a partida e conquistou pontos para o ranking!"
                  : activeRoom.winnerUserId
                  ? `Vitória de ${
                      activeRoom.players?.find(
                        (p) => p.userId === activeRoom.winnerUserId
                      )?.displayName || "outro jogador"
                    }!`
                  : "Empate ou limite de tentativas atingido!"}
              </p>

              {autoCloseCountdown !== null && (
                <div className="autoCloseNotice">
                  ⏳ Esta sala encerrada será removida automaticamente em{" "}
                  {autoCloseCountdown}s
                </div>
              )}

              <div className="modalActionBtns">
                {isHost && (
                  <button className="rematchBtn" onClick={handleRematch}>
                    🔄 Jogar Novamente
                  </button>
                )}
                <button className="backToLobbyBtn" onClick={handleLeaveRoom}>
                  Voltar ao Saguão
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Criação de Sala */}
      {showCreateModal && (
        <div className="arcadeModalOverlay">
          <div className="arcadeModalCard">
            <h3>Criar Sala no Arcade</h3>

            <form onSubmit={handleCreateRoom}>
              <div className="formGroup">
                <label>Nome ou Título da Sala:</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Ex.: Desafio dos Campeões"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                />
              </div>

              <div className="formGroup">
                <label>Escolha o Jogo:</label>
                <div className="gameTypeSelector grid grid-cols-2 gap-2">
                  {[
                    { id: "checkers", name: "Damas", sub: "2 jogadores" },
                    { id: "uno", name: "Uno", sub: "2 até 6 jogadores" },
                    { id: "domino", name: "Dominó", sub: "2 até 4 jogadores" },
                    { id: "tictactoe", name: "Jogo da Velha", sub: "2 jogadores" },
                    { id: "hangman", name: "Forca", sub: "2 até 4 jogadores" },
                  ].map((g) => (
                    <div
                      key={g.id}
                      className={`gameChoice ${
                        newRoomGameType === g.id ? "selected" : ""
                      }`}
                      onClick={() => setNewRoomGameType(g.id)}
                    >
                      <strong>{g.name}</strong>
                      <small>{g.sub}</small>
                    </div>
                  ))}
                </div>
              </div>

              {(newRoomGameType === "uno" ||
                newRoomGameType === "domino" ||
                newRoomGameType === "hangman") && (
                <div className="formGroup mt-3">
                  <label>Capacidade Máxima de Jogadores:</label>
                  <select
                    value={newRoomMaxPlayers}
                    onChange={(e) =>
                      setNewRoomMaxPlayers(parseInt(e.target.value, 10))
                    }
                  >
                    <option value={2}>2 jogadores</option>
                    <option value={3}>3 jogadores</option>
                    <option value={4}>4 jogadores</option>
                    {newRoomGameType === "uno" && (
                      <>
                        <option value={5}>5 jogadores</option>
                        <option value={6}>6 jogadores (Máximo)</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div className="modalActions">
                <button
                  type="button"
                  className="cancelBtn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submitBtn"
                  disabled={!newRoomTitle.trim()}
                >
                  Criar Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
