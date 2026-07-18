/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { beforeAll, describe, expect, it, vi } from "vitest";

const authenticatedUser = {
  id: "user-1",
  username: "aluno",
  displayName: "Aluno Teste",
  role: "aluno",
  studentType: "normal",
  turmaId: "turma-1",
};

vi.mock("../src/lib/api", () => ({
  api: {
    me: vi.fn().mockResolvedValue({ user: authenticatedUser }),
    getFileTree: vi.fn().mockResolvedValue({ tree: {} }),
    getUserConfig: vi.fn().mockResolvedValue({ config: {} }),
    saveUserConfig: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../src/containers/applications", () => ({
  DesktopApplication: () => "Aplicativo seguro carregado",
  formatDueAt: () => {
    throw new RangeError("Helper não deve ser renderizado como componente");
  },
}));
vi.mock("../src/containers/applications/draft", () => ({}));
vi.mock("../src/components/menu", () => ({ default: () => null }));
vi.mock("../src/components/start", () => ({
  BandPane: () => null,
  CalnWid: () => null,
  DesktopApp: () => null,
  SidePane: () => null,
  StartMenu: () => null,
  WidPane: () => null,
}));
vi.mock("../src/components/taskbar", () => ({ default: () => null }));
vi.mock("../src/containers/background", () => ({
  Background: () => null,
  BootScreen: () => null,
  LockScreen: () => null,
}));
vi.mock("../src/components/pwa/PwaPrompt", () => ({ default: () => null }));
vi.mock("../src/components/auth/LoginScreen", () => ({
  LoginScreen: () => "Tela de login",
}));
vi.mock("../src/components/notifications/UserNotifications", () => ({
  UserNotifications: () => null,
}));
vi.mock("../src/components/virtualkeyboard/VirtualKeyboard", () => ({
  default: () => null,
}));
vi.mock("../src/containers/applications/apps/FileDialog", () => ({
  FileDialog: () => null,
}));
vi.mock("../src/containers/applications/apps/attendance/attendance", () => ({
  AttendanceStandalonePage: () => null,
}));
vi.mock("../src/containers/applications/apps/exam/exam", () => ({
  ExamStandalonePage: () => null,
}));
vi.mock("../src/containers/applications/apps/typing/typing", () => ({
  TypingStandalonePage: () => null,
}));
vi.mock("../src/actions", () => ({ loadSettings: vi.fn() }));
vi.mock("../src/lib/appUpdate", () => ({
  startAppVersionWatcher: vi.fn(() => undefined),
}));
vi.mock("../src/lib/keyboardShortcuts", () => ({
  getGlobalShortcutAction: vi.fn(() => null),
}));

const initialState = {
  apps: { hz: 2 },
  wallpaper: { booted: true, locked: false, dir: 0 },
  files: {
    fileDialog: null,
    loaded: false,
    revision: 0,
    data: { toJSON: () => ({}) },
  },
  setting: { person: { id: null } },
};

describe("Login e carregamento do desktop", () => {
  beforeAll(() => {
    window.onstart = true;
  });

  it("monta apenas apps React após restaurar uma sessão autenticada", async () => {
    const { default: App } = await import("../src/App");
    const store = createStore((state = initialState) => state);

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(
      await screen.findByText("Aplicativo seguro carregado")
    ).not.toBeNull();
    expect(document.body.textContent).not.toContain(
      "O simulador encontrou um problema."
    );
  }, 10000);
});
