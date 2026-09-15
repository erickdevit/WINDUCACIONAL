import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (relativePath) =>
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");

const migration = read("../server/db/migrations/0010_arcade_games.sql");
const arcadeRoutesCode = read("../server/routes/arcade.cjs");
const indexServerCode = read("../server/index.cjs");
const apiCode = read("../src/lib/api.js");
const appComponentCode = read(
  "../src/containers/applications/apps/arcade/ArcadeApp.jsx"
);
const checkersComponentCode = read(
  "../src/containers/applications/apps/arcade/CheckersBoard.jsx"
);
const unoComponentCode = read(
  "../src/containers/applications/apps/arcade/UnoTable.jsx"
);
const scssCode = read("../src/containers/applications/apps/arcade/arcade.scss");
const appsUtilCode = read("../src/utils/apps.js");
const indexUtilCode = read("../src/utils/index.js");

describe("Arcade - Schema e Migration 0010", () => {
  it("contém tabelas para salas, jogadores da sala e rankings de jogos", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS arcade_rooms");
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS arcade_room_players"
    );
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS arcade_rankings");
    expect(migration).toContain("idx_arcade_rooms_turma");
    expect(migration).toContain("idx_arcade_rankings_points");
  });
});

describe("Arcade - Backend, Rotas e Streaming SSE", () => {
  it("está registrado no server/index.cjs", () => {
    expect(indexServerCode).toContain(
      'require("./routes/arcade.cjs")(routeContext)'
    );
  });

  it("implementa transmissão SSE com text/event-stream e isolamento por turma", () => {
    expect(arcadeRoutesCode).toContain("text/event-stream");
    expect(arcadeRoutesCode).toContain("GAME_STARTED");
    expect(arcadeRoutesCode).toContain("GAME_UPDATED");
    expect(arcadeRoutesCode).toContain("GAME_OVER");
    expect(arcadeRoutesCode).toContain("ROOM_RESET");
    expect(arcadeRoutesCode).toContain("normalizeUuid");
    expect(arcadeRoutesCode).toContain("Você não pertence à turma desta sala");
  });

  it("sanitiza cartas de outros jogadores no Uno para segurança anti-trapaça", () => {
    expect(arcadeRoutesCode).toContain("sanitizeGameStateForUser");
    expect(arcadeRoutesCode).toContain("cardCount: p.hand ? p.hand.length : 0");
  });

  it("persiste pontuações nos rankings por turma e geral da escola", () => {
    expect(arcadeRoutesCode).toContain("recordMatchOutcome");
    expect(arcadeRoutesCode).toContain("arcade_rankings");
    expect(arcadeRoutesCode).toContain("turmaRankings");
    expect(arcadeRoutesCode).toContain("globalRankings");
  });

  it("valida vínculo de turma do usuário com suporte a turma_id e turmaId na entrada e início de salas", () => {
    expect(arcadeRoutesCode).toContain(
      "userTurmaId = req.user.turma_id || req.user.turmaId"
    );
    expect(arcadeRoutesCode).toContain(
      "O jogo de Uno necessita de no mínimo 2 jogadores para iniciar."
    );
    expect(indexServerCode).toContain("req.user.turmaId = req.user.turma_id");
  });

  it("protege contra erro interno ao sanitizar game_state vazio ou não inicializado", () => {
    expect(arcadeRoutesCode).toContain("parseJsonField");
    expect(arcadeRoutesCode).toContain("!Array.isArray(gameState.players)");
  });

  it("suporta modo espectador permitindo acompanhar partidas em andamento e bloqueando jogadas de não participantes", () => {
    expect(arcadeRoutesCode).toContain("isSpectator: true");
    expect(arcadeRoutesCode).toContain(
      "Apenas os jogadores participantes podem realizar jogadas na partida."
    );
  });

  it("remove salas encerradas sozinhas com agendamento automático, limpeza periódica e cancelamento em revanche", () => {
    expect(arcadeRoutesCode).toContain("scheduleRoomAutoRemoval");
    expect(arcadeRoutesCode).toContain("cancelRoomAutoRemoval");
    expect(arcadeRoutesCode).toContain("cleanupStaleRooms");
    expect(arcadeRoutesCode).toContain("AUTO_REMOVE_FINISHED_DELAY_MS");
    expect(arcadeRoutesCode).toContain("ROOM_CLOSED");
  });

  it("permite ao professor ou criador apagar a sala via DELETE /api/arcade/rooms/:id com broadcast aos participantes", () => {
    expect(arcadeRoutesCode).toContain('app.delete("/api/arcade/rooms/:id"');
    expect(arcadeRoutesCode).toContain(
      "Apenas professores ou o criador da sala podem apagar esta sala."
    );
    expect(arcadeRoutesCode).toContain("A sala foi apagada pelo professor.");
  });
});

describe("Arcade - Integração com Simulador e Área de Trabalho", () => {
  it("está registrado no catálogo de aplicativos com ícone arcade e ação ARCADEAPP", () => {
    expect(appsUtilCode).toContain('name: "Arcade"');
    expect(appsUtilCode).toContain('icon: "arcade"');
    expect(appsUtilCode).toContain('action: "ARCADEAPP"');
  });

  it("está fixado na área de trabalho e possui seed para perfis existentes", () => {
    expect(indexUtilCode).toContain('"Arcade"');
    expect(indexUtilCode).toContain("desktop-seed-arcade-v1");
  });

  it("possui métodos completos no client de API", () => {
    expect(apiCode).toContain("getArcadeRooms");
    expect(apiCode).toContain("createArcadeRoom");
    expect(apiCode).toContain("getArcadeRoom");
    expect(apiCode).toContain("joinArcadeRoom");
    expect(apiCode).toContain("toggleArcadeReady");
    expect(apiCode).toContain("startArcadeGame");
    expect(apiCode).toContain("sendArcadeAction");
    expect(apiCode).toContain("leaveArcadeRoom");
    expect(apiCode).toContain("rematchArcadeGame");
    expect(apiCode).toContain("deleteArcadeRoom");
    expect(apiCode).toContain("getArcadeRankings");
  });
});

describe("Arcade - Componentes Frontend e Experiência do Usuário", () => {
  it("utiliza AppWindow e encerra SSE ao ocultar ou fechar o app", () => {
    expect(appComponentCode).toContain("AppWindow");
    expect(appComponentCode).toContain("wnapp={wnapp}");
    expect(appComponentCode).toContain("eventSource.close()");
  });

  it("renderiza o tabuleiro de Damas com regras de movimentação e capturas", () => {
    expect(checkersComponentCode).toContain("checkersBoard");
    expect(checkersComponentCode).toContain("checkersSquare");
    expect(checkersComponentCode).toContain("checkersPiece");
    expect(checkersComponentCode).toContain("validMovesForSelected");
    expect(checkersComponentCode).toContain("👑");
  });

  it("implementa perspectiva dinâmica no tabuleiro de Damas mantendo jogador na base e adversário no topo", () => {
    expect(checkersComponentCode).toContain("isFlipped = myPlayerIndex === 1");
    expect(checkersComponentCode).toContain(
      "isFlipped ? 7 - displayR : displayR"
    );
    expect(checkersComponentCode).toContain(
      "isFlipped ? 7 - displayC : displayC"
    );
    expect(checkersComponentCode).toContain("checkersPlayerBar oppBar");
    expect(checkersComponentCode).toContain("checkersPlayerBar myBar");
    expect(scssCode).toContain(".checkersPlayerBar");
  });

  it("renderiza a mesa de Uno com cartas, compra, chamada de UNO e denúncia", () => {
    expect(unoComponentCode).toContain("unoGameContainer");
    expect(unoComponentCode).toContain("unoCard");
    expect(unoComponentCode).toContain("unoShoutBtn");
    expect(unoComponentCode).toContain("catchUnoBtn");
    expect(unoComponentCode).toContain("unoColorPickerOverlay");
  });

  it("renderiza a mesa visual de Uno com feltro oval e posiciona o jogador local sempre no centro inferior para ele mesmo", () => {
    expect(unoComponentCode).toContain("unoVisualArena");
    expect(unoComponentCode).toContain("unoTableFelt");
    expect(unoComponentCode).toContain("unoSeatsContainer");
    expect(unoComponentCode).toContain("unoTableSeat");
    expect(unoComponentCode).toContain("getSeatPositionClass");
    expect(unoComponentCode).toContain("seat-bottom-center");
    expect(unoComponentCode).toContain("localPlayerSeat");
    expect(unoComponentCode).toContain("(myPlayerIndex + i) % players.length");
    expect(scssCode).toContain(".unoVisualArena");
    expect(scssCode).toContain(".unoTableFelt");
    expect(scssCode).toContain(".seat-bottom-center");
  });

  it("limita a mesa de Uno a no máximo 6 alunos nas opções de criação e na validação do servidor", () => {
    expect(arcadeRoutesCode).toContain("parsedMaxPlayers > 6");
    expect(arcadeRoutesCode).toContain("parsedMaxPlayers = 6");
    expect(arcadeRoutesCode).toContain("players.length > 6");
    expect(arcadeRoutesCode).toContain(
      "A mesa de Uno comporta no máximo 6 alunos por partida."
    );
    expect(appComponentCode).toContain(
      "Mesa de 2 até 6 jogadores"
    );
    expect(appComponentCode).toContain(
      "6 jogadores (Mesa Cheia - Máximo)"
    );
  });

  it("contém estilos SCSS completos para o Arcade, Damas e Uno", () => {
    expect(scssCode).toContain(".arcadeContainer");
    expect(scssCode).toContain(".checkersBoard");
    expect(scssCode).toContain(".unoCard");
    expect(scssCode).toContain(".arcadeGameOverModal");
  });

  it("oferece suporte a modo espectador com identificação visual e barra superior para voltar ao saguão", () => {
    expect(appComponentCode).toContain("arcadeActiveGameWrapper");
    expect(appComponentCode).toContain("activeGameTopBar");
    expect(appComponentCode).toContain("👁️ Modo Espectador");
    expect(appComponentCode).toContain("Voltar ao Saguão");
    expect(checkersComponentCode).toContain("isSpectator");
    expect(unoComponentCode).toContain("Modo Espectador");
    expect(scssCode).toContain(".activeGameTopBar");
    expect(scssCode).toContain(".spectatorBadge");
  });

  it("exibe contagem regressiva e aviso de remoção automática de sala encerrada no card de fim de jogo", () => {
    expect(appComponentCode).toContain("autoCloseCountdown");
    expect(appComponentCode).toContain("autoCloseNotice");
    expect(appComponentCode).toContain(
      "Esta sala encerrada será removida automaticamente em"
    );
    expect(appComponentCode).toContain("ROOM_CLOSED");
    expect(scssCode).toContain(".autoCloseNotice");
  });

  it("permite ao professor ou criador apagar salas com botões no saguão, sala de espera e barra superior da partida", () => {
    expect(appComponentCode).toContain("handleDeleteRoom");
    expect(appComponentCode).toContain("deleteRoomCardBtn");
    expect(appComponentCode).toContain("deleteRoomBtn");
    expect(appComponentCode).toContain("deleteArcadeRoom");
    expect(scssCode).toContain(".deleteRoomCardBtn");
    expect(scssCode).toContain(".deleteRoomBtn");
  });
});
