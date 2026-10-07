import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (relativePath) =>
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");

const migration0010 = read("../server/db/migrations/0010_arcade_games.sql");
const migration0011 = read(
  "../server/db/migrations/0011_domino_tictactoe_hangman.sql"
);
const migration0012 = read("../server/db/migrations/0012_retire_domino.sql");
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
const unoImageFiles = fs.readdirSync(
  new URL("../public/img/arcade/uno", import.meta.url)
);
const tictactoeComponentCode = read(
  "../src/containers/applications/apps/arcade/TicTacToeBoard.jsx"
);
const hangmanComponentCode = read(
  "../src/containers/applications/apps/arcade/HangmanGame.jsx"
);
const scssCode = read("../src/containers/applications/apps/arcade/arcade.scss");
const appsUtilCode = read("../src/utils/apps.js");

describe("Arcade - Schema e Migrações", () => {
  it("contém tabelas para salas, jogadores da sala e rankings de jogos", () => {
    expect(migration0010).toContain("CREATE TABLE IF NOT EXISTS arcade_rooms");
    expect(migration0010).toContain(
      "CREATE TABLE IF NOT EXISTS arcade_room_players"
    );
    expect(migration0010).toContain(
      "CREATE TABLE IF NOT EXISTS arcade_rankings"
    );
    expect(migration0011).toContain("domino, tictactoe, hangman");
    expect(migration0012).toContain("status IN ('WAITING', 'PLAYING')");
    expect(migration0012).toContain("game_state = '{}'::jsonb");
    expect(migration0012).not.toContain("DELETE FROM arcade_rooms");
  });
});

describe("Arcade - Backend, Rotas e Suporte a Novos Jogos", () => {
  it("está registrado no server/index.cjs", () => {
    expect(indexServerCode).toContain(
      'require("./routes/arcade.cjs")(routeContext)'
    );
  });

  it("suporta ações dos jogos Jogo da Velha e Forca no endpoint de ação", () => {
    expect(arcadeRoutesCode).toContain("MAKE_MOVE");
    expect(arcadeRoutesCode).toContain("GUESS_LETTER");
    expect(arcadeRoutesCode).toContain("GUESS_WORD");
  });

  it("sanitiza o estado da Forca para ocultar a palavra secreta", () => {
    expect(arcadeRoutesCode).toContain('gameType === "hangman"');
    expect(arcadeRoutesCode).toContain(
      "secretWord: isFinished ? gameState.secretWord : undefined"
    );
  });

  it("desativa o Dominó na API e preserva os registros históricos", () => {
    expect(arcadeRoutesCode).not.toContain(
      'require("../domain/arcadeDomino.cjs")'
    );
    expect(arcadeRoutesCode).toContain('gameType === "domino"');
    expect(arcadeRoutesCode).toContain("r.game_type <> 'domino'");
    expect(arcadeRoutesCode).toContain(
      "ensureSupportedGameType(room.game_type)"
    );
  });
});

describe("Arcade - Componentes Frontend dos Novos Jogos", () => {
  it("remove o Dominó da interface, das regras visuais e dos arquivos do jogo", () => {
    expect(appComponentCode).not.toContain("DominoTable");
    expect(appComponentCode).not.toContain("Dominó");
    expect(appComponentCode).not.toContain('"domino"');
    expect(scssCode).not.toContain(".domino");
    expect(
      fs.existsSync(
        new URL(
          "../src/containers/applications/apps/arcade/DominoTable.jsx",
          import.meta.url
        )
      )
    ).toBe(false);
  });

  it("mantém apenas o tabuleiro 3x3 visível no Jogo da Velha", () => {
    expect(tictactoeComponentCode).toContain('role="grid"');
    expect(tictactoeComponentCode).toContain("onMakeMove(index)");
    expect(tictactoeComponentCode).not.toContain("players.map");
    expect(tictactoeComponentCode).not.toContain("lastActionMessage");
  });

  it("mostra todas as cartas dos adversários pelo verso e remove a mão local da mesa", () => {
    expect(unoComponentCode).toContain("Array.from({ length: cardCount })");
    expect(unoComponentCode).toContain('className="opponentCardBack"');
    expect(unoComponentCode).toContain("if (isMe) return null");
    expect(unoComponentCode).not.toContain("turnStatusText");
    expect(scssCode).toContain(".unoPlayerHandArea .handCardsRow");
    expect(scssCode).toContain("opacity: 1;\n        filter: none;");
    expect(scssCode).toContain(
      "position: absolute;\n    right: 0;\n    bottom: 0;"
    );
  });

  it("representa a dama com uma peça superior própria, sem rótulo textual", () => {
    expect(checkersComponentCode).toContain("kingPieceTopper");
    expect(checkersComponentCode).toContain("kingPieceEmblem");
    expect(checkersComponentCode).not.toContain("kingLabel");
    expect(checkersComponentCode).not.toContain(">DAMA<");
    expect(checkersComponentCode).not.toContain("checkersPlayerBar");
    expect(checkersComponentCode).toContain('"activeTurnPiece"');
    expect(scssCode).toContain("top: -12%;");
    expect(scssCode).toContain("width: 84%;");
    expect(scssCode).toContain("height: 74%;");
    expect(scssCode).toContain("@keyframes checkersTurnPiecePulse");
    expect(scssCode).toContain(
      "animation: checkersTurnPiecePulse 1.2s ease-in-out 2;"
    );
    expect(scssCode).toContain(
      ".checkersBoard {\n  width: min(86vw, 76vh, 680px);"
    );
  });

  it("leva a navegação ao título da janela e oculta o ícone e o nome do Arcade", () => {
    expect(appComponentCode).toContain("createPortal(");
    expect(appComponentCode).toContain('className="arcadeToolbarTabs"');
    expect(appComponentCode).toContain("Sala de Jogos");
    expect(appComponentCode).toContain("Hall da Fama");
    expect(appComponentCode).not.toContain("arcadeHeader");
    expect(scssCode).toContain(".arcadeAppWindow .toolbar .appFullName");
    expect(scssCode).toContain(".arcadeToolbarTabs");
  });

  it("usa o baralho UNO substituído e mantém a mão em leque com a carta elevada no foco", () => {
    expect(unoComponentCode).toContain(
      'const extension = card.value === "0" ? "png" : "jpg";'
    );
    expect(unoComponentCode).toContain("--hand-rotation");
    expect(unoComponentCode).toContain('className="handCardsRail"');
    expect(scssCode).toContain(".handCardsRail");
    expect(scssCode).toContain("z-index: 100;");
    expect(scssCode).toContain("padding: 80px 14px 8px;");
    expect(scssCode).toContain(
      "animation: unoTurnCardPulse 1.2s ease-in-out 2;"
    );
    expect(scssCode).toContain("@keyframes unoTurnCardPulse");
  });

  it("mantém as 54 cartas do pacote UNO sem arquivos antigos sobrando", () => {
    const colors = ["Blue", "Green", "Red", "Yellow"];
    const values = [
      ...Array.from({ length: 10 }, (_, index) => String(index)),
      "Draw_2",
      "Reverse",
      "Skip",
    ];
    const expected = colors.flatMap((color) =>
      values.map(
        (value) => `${color}_${value}.${value === "0" ? "png" : "jpg"}`
      )
    );
    expected.push("Wild.jpg", "Wild_Draw_4.jpg");

    expect(unoImageFiles.sort()).toEqual(expected.sort());
  });

  it("integra a dica da Forca no palco e remove o banner de última ação", () => {
    expect(hangmanComponentCode).toContain("hangmanHint");
    expect(hangmanComponentCode).toContain("aria-label={`${wrongGuesses}");
    expect(hangmanComponentCode).not.toContain("lastActionMessage");
    expect(hangmanComponentCode).not.toContain("hangmanInfoBar");
  });

  it("renderiza o Jogo da Forca com boneco SVG, palavra oculta e teclado virtual A-Z", () => {
    expect(hangmanComponentCode).toContain("renderHangmanSvg");
    expect(hangmanComponentCode).toContain("maskedWord");
    expect(hangmanComponentCode).toContain("hangmanKeyboard");
  });

  it("integra os novos jogos no componente principal ArcadeApp", () => {
    expect(appComponentCode).toContain("TicTacToeBoard");
    expect(appComponentCode).toContain("HangmanGame");
    expect(appComponentCode).toContain("Jogo da Velha");
    expect(appComponentCode).toContain("Forca");
  });

  it("oferece interface enxuta com botão de criar sala e alternância entre modos grade (padrão) e lista", () => {
    expect(appComponentCode).toContain("arcadeLobbyTopBar");
    expect(appComponentCode).toContain("arcadeCreateRoomBtn");
    expect(appComponentCode).toContain("roomViewMode");
    expect(appComponentCode).toContain('useState("grid")');
    expect(appComponentCode).toContain("arcadeRoomsGrid");
    expect(appComponentCode).toContain("arcadeRoomsList");
    expect(appComponentCode).toContain("roomsTable");
    expect(scssCode).toContain(".arcadeLobbyTopBar");
    expect(scssCode).toContain(".arcadeCreateRoomBtn");
    expect(scssCode).toContain(".arcadeRoomsList");
    expect(scssCode).toContain(".viewModeSwitch");
  });
});
