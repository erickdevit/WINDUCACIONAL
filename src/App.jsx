import { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useDispatch, useSelector } from "react-redux";
import "./i18nextConf";
import "./index.css";
import "./mobile.scss";
import "./components/auth/login-screen.scss";

import ActMenu from "./components/menu";
import {
  BandPane,
  CalnWid,
  DesktopApp,
  SidePane,
  StartMenu,
  WidPane,
} from "./components/start";
import Taskbar from "./components/taskbar";
import { Background, BootScreen, LockScreen } from "./containers/background";
import PwaPrompt from "./components/pwa/PwaPrompt";
import { LoginScreen } from "./components/auth/LoginScreen";
import { UserNotifications } from "./components/notifications/UserNotifications";

import { loadSettings } from "./actions";
import * as Applications from "./containers/applications";
import * as Drafts from "./containers/applications/draft";
import { FileDialog } from "./containers/applications/apps/FileDialog";
import { api } from "./lib/api";
import { startAppVersionWatcher } from "./lib/appUpdate";
import { getGlobalShortcutAction } from "./lib/keyboardShortcuts";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div>
      <meta charSet="UTF-8" />
      <title>404 - Page</title>
      <script src="https://win11.blueedge.me/script.js"></script>
      <link rel="stylesheet" href="https://win11.blueedge.me/style.css" />
      {/* partial:index.partial.html */}
      <div id="page">
        <div id="container">
          <h1>:(</h1>
          <h2>
            Seu computador encontrou um problema e precisa ser reiniciado.
            Estamos coletando algumas informações de erro e reiniciaremos em
            seguida.
          </h2>
          <h2>
            <span id="percentage">0</span>% concluído
          </h2>
          <div id="details">
            <div id="qr">
              <div id="image">
                <img src="https://win11.blueedge.me/img/qr.png" alt="QR Code" />
              </div>
            </div>
            <div id="stopcode">
              <h4>
                Para mais informações sobre este problema e possíveis correções,
                acesse
                <br />{" "}
                <a href="https://github.com/blueedgetechno/win11React/issues">
                  https://github.com/blueedgetechno/win11React/issues
                </a>{" "}
              </h4>
              <h5>
                Se você acionar o suporte, informe:
                <br />
                Código de parada: {error.message}
              </h5>
              <button onClick={resetErrorBoundary}>Tentar novamente</button>
            </div>
          </div>
        </div>
      </div>
      {/* partial */}
    </div>
  );
}

function App() {
  const apps = useSelector((state) => state.apps);
  const wall = useSelector((state) => state.wallpaper);
  const files = useSelector((state) => state.files);
  const settings = useSelector((state) => state.setting);
  const dispatch = useDispatch();
  const [session, setSession] = useState({
    loading: true,
    saving: false,
    user: null,
    needsBootstrap: false,
    requiresToken: false,
    error: "",
  });
  const lastSavedRevision = useRef(0);
  const saveTimer = useRef(null);

  const loadUserEnvironment = async (user) => {
    dispatch({ type: "SESSIONUSER", payload: user });
    dispatch({ type: "WALLUSER", payload: user.id });
    dispatch({ type: "WALLUNLOCK" });
    const fsData = await api.getFileTree();
    dispatch({ type: "FILELOAD", payload: fsData.tree });

    try {
      const userConfig = await api.getUserConfig();
      if (userConfig?.config && Object.keys(userConfig.config).length > 0) {
        dispatch({ type: "SETTLOAD", payload: userConfig.config });
        if (userConfig.config.person?.theme !== "light") {
          const { changeTheme } = await import("./actions");
          changeTheme();
        }
        if (userConfig.config.wallpaper) {
          const wp = userConfig.config.wallpaper;
          if (typeof wp.wps === "number") {
            dispatch({ type: "WALLSET", payload: wp.wps });
          }
          if (wp.locked === false) {
            dispatch({ type: "WALLUNLOCK" });
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar configurações do usuário:", e);
    }

    lastSavedRevision.current = 0;
  };

  const refreshSession = async () => {
    setSession((state) => ({ ...state, loading: true, error: "" }));
    try {
      const current = await api.me();
      await loadUserEnvironment(current.user);
      setSession({
        loading: false,
        saving: false,
        user: current.user,
        needsBootstrap: false,
        requiresToken: false,
        error: "",
      });
    } catch (error) {
      try {
        const status = await api.bootstrapStatus();
        setSession({
          loading: false,
          saving: false,
          user: null,
          needsBootstrap: status.needsBootstrap,
          requiresToken: status.requiresToken,
          error: "",
        });
      } catch (statusError) {
        setSession({
          loading: false,
          saving: false,
          user: null,
          needsBootstrap: false,
          requiresToken: false,
          error: statusError.message,
        });
      }
    }
  };

  const handleLogin = async (payload) => {
    setSession((state) => ({ ...state, saving: true, error: "" }));
    try {
      const result = await api.login(payload);
      await loadUserEnvironment(result.user);
      setSession((state) => ({
        ...state,
        saving: false,
        user: result.user,
        needsBootstrap: false,
        error: "",
      }));
    } catch (error) {
      setSession((state) => ({
        ...state,
        saving: false,
        error: error.message,
      }));
    }
  };

  const handleBootstrap = async (payload) => {
    setSession((state) => ({ ...state, saving: true, error: "" }));
    try {
      const result = await api.bootstrap({
        username: payload.username,
        displayName: payload.displayName,
        password: payload.password,
        token: payload.token,
      });
      await loadUserEnvironment(result.user);
      setSession((state) => ({
        ...state,
        saving: false,
        user: result.user,
        needsBootstrap: false,
        error: "",
      }));
    } catch (error) {
      setSession((state) => ({
        ...state,
        saving: false,
        error: error.message,
      }));
    }
  };

  const handleRegister = async (payload) => {
    setSession((state) => ({ ...state, saving: true, error: "" }));
    try {
      const result = await api.register({
        username: payload.username,
        displayName: payload.displayName,
        password: payload.password,
        turmaCode: payload.turmaCode,
      });
      await loadUserEnvironment(result.user);
      setSession((state) => ({
        ...state,
        saving: false,
        user: result.user,
        needsBootstrap: false,
        error: "",
      }));
    } catch (error) {
      setSession((state) => ({
        ...state,
        saving: false,
        error: error.message,
      }));
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setSession({
        loading: false,
        saving: false,
        user: null,
        needsBootstrap: false,
        requiresToken: false,
        error: "",
      });
    }
  };

  const afterMath = (event) => {
    var ess = [
      ["START", "STARTHID"],
      ["BAND", "BANDHIDE"],
      ["PANE", "PANEHIDE"],
      ["WIDG", "WIDGHIDE"],
      ["CALN", "CALNHIDE"],
      ["MENU", "MENUHIDE"],
    ];

    var actionType = "";
    try {
      actionType = event.target.dataset.action || "";
    } catch (err) {}

    var actionType0 = getComputedStyle(event.target).getPropertyValue(
      "--prefix"
    );

    ess.forEach((item, i) => {
      if (!actionType.startsWith(item[0]) && !actionType0.startsWith(item[0])) {
        dispatch({
          type: item[1],
        });
      }
    });
  };

  window.oncontextmenu = (e) => {
    afterMath(e);
    e.preventDefault();
    var data = {
      top: e.clientY,
      left: e.clientX,
    };

    // Walk up the DOM tree to find the closest element with data-menu
    var menuEl = e.target.closest("[data-menu]");
    if (menuEl) {
      data.menu = menuEl.dataset.menu;
      data.attr = menuEl.attributes;
      data.dataset = { ...menuEl.dataset };
      dispatch({
        type: "MENUSHOW",
        payload: data,
      });
    }
  };

  window.onclick = afterMath;

  window.onload = (e) => {
    dispatch({ type: "WALLBOOTED" });
  };

  useEffect(() => {
    if (!window.onstart) {
      loadSettings();
      window.onstart = setTimeout(() => {
        // console.log("prematurely loading ( ﾉ ﾟｰﾟ)ﾉ");
        dispatch({ type: "WALLBOOTED" });
      }, 5000);
    }
  });

  useEffect(() => {
    refreshSession();
  }, []);

  useEffect(() => startAppVersionWatcher(), []);

  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    if (session.user && settings.person?.id) {
      if (!settingsLoadedRef.current) {
        settingsLoadedRef.current = true;
        return;
      }
      const saveConfig = async () => {
        try {
          await api.saveUserConfig(settings);
        } catch (e) {
          console.warn("Erro ao salvar configurações:", e);
        }
      };
      const timeoutId = setTimeout(saveConfig, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [settings, session.user]);

  const wallLoadedRef = useRef(false);

  useEffect(() => {
    if (session.user && wall.userId) {
      if (!wallLoadedRef.current) {
        wallLoadedRef.current = true;
        return;
      }
      const saveWallpaper = async () => {
        try {
          const currentConfig = await api.getUserConfig();
          const config = currentConfig?.config || {};
          config.wallpaper = { wps: wall.wps, locked: wall.locked };
          await api.saveUserConfig(config);
        } catch (e) {
          console.warn("Erro ao salvar wallpaper:", e);
        }
      };
      const timeoutId = setTimeout(saveWallpaper, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [wall.wps, wall.locked, wall.userId, session.user]);

  useEffect(() => {
    window.addEventListener("simulador:logout", handleLogout);
    return () => window.removeEventListener("simulador:logout", handleLogout);
  }, []);

  useEffect(() => {
    let metaPressed = false;
    let otherKeyPressed = false;

    const handleKeyDown = async (e) => {
      if (e.key === "Meta") {
        metaPressed = true;
        otherKeyPressed = false;
      } else if (metaPressed) {
        otherKeyPressed = true;
      }

      if (e.key === "F11") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen();
            if (navigator.keyboard && navigator.keyboard.lock) {
              await navigator.keyboard.lock();
            }
          } catch (err) {
            console.warn("Fullscreen failed:", err);
          }
        }
      }

      const shortcutAction = getGlobalShortcutAction(e, {
        apps,
        fileDialogOpen: Boolean(files.fileDialog),
      });

      if (shortcutAction) {
        e.preventDefault();
        dispatch(shortcutAction);
        return;
      }

      if (document.fullscreenElement) {
        if (e.ctrlKey && e.altKey && e.key === "Escape") {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
          return;
        }

        if (e.key === "F11") {
          e.preventDefault();
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          return;
        }

        if (e.metaKey) {
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Meta") {
        if (metaPressed && !otherKeyPressed) {
          dispatch({ type: "STARTOGG" });
        }
        metaPressed = false;
        otherKeyPressed = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [apps, dispatch, files.fileDialog]);

  useEffect(() => {
    if (
      !session.user ||
      !files.loaded ||
      files.revision === lastSavedRevision.current
    ) {
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        dispatch({ type: "FILESAVING", payload: true });
        await api.saveFileTree(files.data.toJSON());
        lastSavedRevision.current = files.revision;
        dispatch({ type: "FILEERROR", payload: null });
      } catch (error) {
        dispatch({ type: "FILEERROR", payload: error.message });
      } finally {
        dispatch({ type: "FILESAVING", payload: false });
      }
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [session.user, files.loaded, files.revision, files.data, dispatch]);

  if (session.loading) {
    return (
      <div className="loginScreen">
        <section className="loginPanel">
          <header>
            <h1>Carregando</h1>
            <p className="loginDescription">
              Verificando sessão e ambiente do usuário...
            </p>
          </header>
        </section>
      </div>
    );
  }

  if (!session.user) {
    return (
      <LoginScreen
        needsBootstrap={session.needsBootstrap}
        requiresToken={session.requiresToken}
        onLogin={handleLogin}
        onBootstrap={handleBootstrap}
        onRegister={handleRegister}
        error={session.error}
        loading={session.saving}
      />
    );
  }

  return (
    <div className="App">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {!wall.booted ? <BootScreen dir={wall.dir} /> : null}
        {wall.locked ? <LockScreen dir={wall.dir} /> : null}
        <div className="appwrap">
          <Background />
          <div className="desktop" data-menu="desk">
            <DesktopApp />
            {Object.keys(Applications).map((key, idx) => {
              var WinApp = Applications[key];
              return <WinApp key={idx} />;
            })}
            {Object.keys(apps)
              .filter((x) => x != "hz")
              .map((key) => apps[key])
              .map((app, i) => {
                if (app.pwa) {
                  var WinApp = Drafts[app.data.type];
                  return <WinApp key={i} icon={app.icon} {...app.data} />;
                }
              })}
            <StartMenu />
            <BandPane />
            <SidePane />
            <WidPane />
            <CalnWid />
          </div>
          <Taskbar />
          <UserNotifications user={session.user} />
          <ActMenu />
          <FileDialog />
        </div>
        <PwaPrompt />
      </ErrorBoundary>
    </div>
  );
}

export default App;
