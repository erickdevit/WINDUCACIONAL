import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// O app de Configuracoes foi dividido em modulos: settings.jsx (componente
// Settings), settingsShared.jsx (helpers/dialogo) e os componentes
// UserManagement.jsx e TurmaManagement.jsx. As verificacoes abaixo inspecionam
// o codigo do app inteiro, entao concatenamos os modulos (settings primeiro).
const settingsDir = path.resolve(
  __dirname,
  "../src/containers/applications/apps/settings"
);
const settingsStylesPath = path.resolve(
  __dirname,
  "../src/containers/applications/apps/assets/settings.scss"
);
const settingsCode = [
  "settings.jsx",
  "settingsShared.jsx",
  "UserManagement.jsx",
  "TurmaManagement.jsx",
]
  .map((file) => fs.readFileSync(path.join(settingsDir, file), "utf8"))
  .join("\n");
const settingsStyles = fs.readFileSync(settingsStylesPath, "utf8");

describe("Configurações - listagem de usuários", () => {
  it("deve filtrar usuários por turma e por nome", () => {
    expect(settingsCode).toContain(
      'const [userSearch, setUserSearch] = useState("")'
    );
    expect(settingsCode).toContain(
      'const [turmaFilter, setTurmaFilter] = useState("all")'
    );
    expect(settingsCode).toContain("normalizeSearchText(userSearch.trim())");
    expect(settingsCode).toContain(
      "normalizeSearchText(user.displayName).includes(search)"
    );
    expect(settingsCode).toContain("filteredUsers.map");
    expect(settingsCode).toContain('placeholder="Digite o nome"');
  });

  it("deve exibir apenas o nome da turma na listagem de usuários", () => {
    const toolbarBlock = settingsCode.slice(
      settingsCode.indexOf('className="userDirectoryToolbar"'),
      settingsCode.indexOf('className="userDirectoryList"')
    );
    const listBlock = settingsCode.slice(
      settingsCode.indexOf('className="userDirectoryList"'),
      settingsCode.indexOf('{dialogMode === "create"')
    );

    expect(toolbarBlock).toContain("{turma.nome}");
    expect(toolbarBlock).not.toContain("turma.code");
    expect(listBlock).toContain("turmaNameById.get(user.turmaId)");
    expect(listBlock).not.toContain("turma.code");
  });

  it("deve aplicar tipo de aluno a partir da turma", () => {
    expect(settingsCode).toContain("turmaTypeById");
    expect(settingsCode).toContain("Tipo aplicado:");
    expect(settingsCode).not.toContain("renderStudentTypeField");
    expect(settingsCode).toContain("studentTypeBadge");
    expect(settingsStyles).toContain(".studentTypeBadge");
  });

  it("deve exibir nome completo antes do username e verificar username na criação", () => {
    const createBlock = settingsCode.slice(
      settingsCode.indexOf('{dialogMode === "create"'),
      settingsCode.indexOf('{dialogMode === "edit"')
    );
    expect(createBlock.indexOf("Nome completo")).toBeLessThan(
      createBlock.indexOf("Nome de usuário")
    );
    expect(createBlock).toContain("checkCreateUsername");
    expect(createBlock).toContain("usernameStatus");
    expect(settingsCode).toContain("api.checkUsernameAvailability");
    expect(createBlock).toContain('autoComplete="name"');
    expect(createBlock).toContain('autoComplete="username"');
  });

  it("deve permitir mostrar e ocultar senhas no cadastro e edição de usuários", () => {
    expect(settingsCode).toContain("showCreatePassword");
    expect(settingsCode).toContain("showEditPassword");
    expect(settingsCode).toContain("settingsPasswordInputWrapper");
    expect(settingsCode).toContain("settingsPasswordToggle");
    expect(settingsCode).toContain("faEyeSlash");
    expect(settingsStyles).toContain(".settingsPasswordToggle");
  });

  it("deve permitir definir tipo Kids ou Normal na criação e edição de turmas", () => {
    expect(settingsCode).toContain('studentType: "normal"');
    expect(settingsCode).toContain("Tipo da turma");
    expect(settingsCode).toContain("Ao alterar o tipo da turma");
  });

  it("deve permitir configurar dias e horários de aula nas turmas", () => {
    expect(settingsCode).toContain("defaultScheduleDays");
    expect(settingsCode).toContain("Dias e horários de aula");
    expect(settingsCode).toContain("scheduleStartTime");
    expect(settingsCode).toContain("scheduleEndTime");
    expect(settingsCode).toContain("getScheduleSummary");
    expect(settingsStyles).toContain(".turmaScheduleFields");
    expect(settingsStyles).toContain(".turmaManagementPanel");
    expect(settingsStyles).toContain("overflow-y: auto;");
  });

  it("deve manter scroll vertical interno na listagem de usuários", () => {
    expect(settingsStyles).toContain(".userDirectoryList");
    expect(settingsStyles).toContain("overflow-y: auto;");
    expect(settingsStyles).toContain("max-height: clamp");
    expect(settingsStyles).toContain("::-webkit-scrollbar-thumb");
  });

  it("deve definir cores legíveis para seletor e botões superiores", () => {
    expect(settingsStyles).toContain(".userDirectoryToolbar select option");
    expect(settingsStyles).toContain("color-scheme: dark;");
    expect(settingsStyles).toContain("main .secondaryBtn");
    expect(settingsStyles).toContain("color: #fff;");
  });
});
