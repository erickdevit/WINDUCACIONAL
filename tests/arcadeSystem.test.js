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
      'room.game_type === "uno" && players.length < 2'
    );
    expect(indexServerCode).toContain("req.user.turmaId = req.user.turma_id");
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

  it("contém estilos SCSS completos para o Arcade, Damas e Uno", () => {
    expect(scssCode).toContain(".arcadeContainer");
    expect(scssCode).toContain(".checkersBoard");
    expect(scssCode).toContain(".unoCard");
    expect(scssCode).toContain(".arcadeGameOverModal");
  });
});
