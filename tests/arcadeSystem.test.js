import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (relativePath) =>
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");

const migration0010 = read("../server/db/migrations/0010_arcade_games.sql");
const migration0011 = read("../server/db/migrations/0011_domino_tictactoe_hangman.sql");
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
const dominoComponentCode = read(
  "../src/containers/applications/apps/arcade/DominoTable.jsx"
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
    expect(migration0010).toContain("CREATE TABLE IF NOT EXISTS arcade_rankings");
    expect(migration0011).toContain("domino, tictactoe, hangman");
  });
});

describe("Arcade - Backend, Rotas e Suporte a Novos Jogos", () => {
  it("está registrado no server/index.cjs", () => {
    expect(indexServerCode).toContain(
      'require("./routes/arcade.cjs")(routeContext)'
    );
  });

  it("suporta ações dos jogos Dominó, Jogo da Velha e Forca no endpoint de ação", () => {
    expect(arcadeRoutesCode).toContain("PLAY_TILE");
    expect(arcadeRoutesCode).toContain("DRAW_TILE");
    expect(arcadeRoutesCode).toContain("MAKE_MOVE");
    expect(arcadeRoutesCode).toContain("GUESS_LETTER");
    expect(arcadeRoutesCode).toContain("GUESS_WORD");
  });

  it("sanitiza estado do Dominó e Forca para evitar trapaça", () => {
    expect(arcadeRoutesCode).toContain("gameType === \"domino\"");
    expect(arcadeRoutesCode).toContain("boneyard: undefined");
    expect(arcadeRoutesCode).toContain("gameType === \"hangman\"");
    expect(arcadeRoutesCode).toContain("secretWord: isFinished ? gameState.secretWord : undefined");
  });
});

describe("Arcade - Componentes Frontend dos Novos Jogos", () => {
  it("renderiza o Dominó com cadeia de pedras, acoplamento de pontas e ação do dorme", () => {
    expect(dominoComponentCode).toContain("dominoChain");
    expect(dominoComponentCode).toContain("Jogar na Ponta Esquerda");
    expect(dominoComponentCode).toContain("Comprar do Dorme");
  });

  it("renderiza o Jogo da Velha com grade 3x3 e símbolos X e O", () => {
    expect(tictactoeComponentCode).toContain("grid-cols-3");
    expect(tictactoeComponentCode).toContain("onMakeMove(idx)");
  });

  it("renderiza o Jogo da Forca com boneco SVG, palavra oculta e teclado virtual A-Z", () => {
    expect(hangmanComponentCode).toContain("renderHangmanSvg");
    expect(hangmanComponentCode).toContain("maskedWord");
    expect(hangmanComponentCode).toContain("hangmanKeyboard");
  });

  it("integra os novos jogos no componente principal ArcadeApp", () => {
    expect(appComponentCode).toContain("DominoTable");
    expect(appComponentCode).toContain("TicTacToeBoard");
    expect(appComponentCode).toContain("HangmanGame");
    expect(appComponentCode).toContain("Dominó");
    expect(appComponentCode).toContain("Jogo da Velha");
    expect(appComponentCode).toContain("Forca");
  });
});
