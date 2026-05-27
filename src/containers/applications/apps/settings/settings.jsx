import "./settings.scss";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { changeTheme } from "../../../../actions";
import { UserAvatar } from "../../../../components/user/UserAvatar";
import {
  getRoleLabel,
  getSettingText,
  getStudentTypeLabel,
  getUserDisplayName,
  normalizeName,
  SETTINGS_PAGE_LABELS,
} from "../../../../lib/ui";
import { api } from "../../../../lib/api";
import { Icon, Image } from "../../../../utils/general";
import LangSwitch from "../assets/Langswitch";
import data from "../assets/settingsData.json";
import "../assets/settings.scss";
import { AppWindow } from "../../../../components/shared/AppWindow";

const ACCOUNT_OVERVIEW = "overview";
const ACCOUNT_OTHER_USERS = "other-users";
const ACCOUNT_TURMAS = "turmas";

const normalizeSearchText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const Settings = () => {
  const wnapp = useSelector((state) => state.apps.settings);
  const theme = useSelector((state) => state.setting.person.theme);
  const currentUser = useSelector((state) => state.setting.person);
  const wall = useSelector((state) => state.wallpaper);
  const dispatch = useDispatch();

  const [page, setPage] = useState("System");
  const [nav, setNav] = useState("");
  const [updating, setUpdating] = useState(false);
  const [upmodalOpen, setUpmodalOpen] = useState(false);
  const [accountSection, setAccountSection] = useState(ACCOUNT_OVERVIEW);

  const pageLabel = SETTINGS_PAGE_LABELS[page] || page;

  const themechecker = {
    default: "light",
    dark: "dark",
    ThemeA: "dark",
    ThemeB: "dark",
    ThemeD: "light",
    ThemeC: "light",
  };

  const tiles = useMemo(() => data[page] || [], [page]);

  const openPage = (nextPage) => {
    setPage(nextPage);
    if (nextPage !== "Accounts") setAccountSection(ACCOUNT_OVERVIEW);
  };

  const handleWallAndTheme = (e) => {
    const payload = e.target.dataset.payload;
    const nextTheme = themechecker[payload.split("/")[0]];
    if (nextTheme !== theme) changeTheme();
    dispatch({
      type: "WALLSET",
      payload,
    });
  };

  const openOtherUsers = () => {
    setPage("Accounts");
    setAccountSection(ACCOUNT_OTHER_USERS);
  };

  const openTurmas = () => {
    setPage("Accounts");
    setAccountSection(ACCOUNT_TURMAS);
  };

  const renderTile = (item) => {
    if (
      currentUser.role === "aluno" &&
      (item.name === "Other users" || item.name === "Family")
    ) {
      return null;
    }

    const interactive =
      page === "Accounts" &&
      (item.name === "Other users" || item.name === "Family");
    const clickHandler = interactive
      ? item.name === "Family"
        ? openTurmas
        : openOtherUsers
      : undefined;
    return (
      <div
        key={`${item.type}-${item.name || "blank"}`}
        className={`${item.type}${interactive ? " interactiveTile" : ""}`}
        onClick={clickHandler}
      >
        <span className="settingsIcon">{item.icon}</span>
        <div className="tile_content">
          <p>{getSettingText(item.name)}</p>
          {item.desc ? (
            <p className="tile_desc">{getSettingText(item.desc)}</p>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Configurações"
      className="settingsApp"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <nav className={nav}>
        <div className="nav_top">
          <div
            className="account"
            onClick={() => {
              setPage("Accounts");
              setAccountSection(ACCOUNT_OVERVIEW);
            }}
          >
            <UserAvatar user={currentUser} size={60} />
            <div>
              <p>{getUserDisplayName(currentUser)}</p>
              <p>{getRoleLabel(currentUser.role)}</p>
            </div>
          </div>
          <input
            type="text"
            className="search"
            placeholder="Localizar uma configuração"
            name="search"
          />
        </div>
        <div className="nav_bottom win11Scroll">
          {Object.keys(data).map((item) => (
            <div
              key={item}
              className={`navLink ${item === page ? "selected" : ""}`}
              onClick={() => openPage(item)}
            >
              <img
                src={`img/settings/${item}.webp`}
                alt=""
                height={16}
                width={16}
              />
              {SETTINGS_PAGE_LABELS[item] || item}
            </div>
          ))}
          <div className="marker"></div>
        </div>
      </nav>

      <main>
        <h1>
          {page === "Accounts" && accountSection === ACCOUNT_OTHER_USERS
            ? "Contas > Outros usuários"
            : page === "Accounts" && accountSection === ACCOUNT_TURMAS
            ? "Contas > Turmas"
            : pageLabel}
        </h1>

        {page === "Accounts" &&
        accountSection === ACCOUNT_OTHER_USERS &&
        currentUser.role === "professor" ? (
          <UserManagement
            currentUser={currentUser}
            onBack={() => setAccountSection(ACCOUNT_OVERVIEW)}
          />
        ) : null}

        {page === "Accounts" &&
        accountSection === ACCOUNT_TURMAS &&
        currentUser.role === "professor" ? (
          <TurmaManagement
            currentUser={currentUser}
            onBack={() => setAccountSection(ACCOUNT_OVERVIEW)}
          />
        ) : null}

        {!(
          page === "Accounts" &&
          (accountSection === ACCOUNT_OTHER_USERS ||
            accountSection === ACCOUNT_TURMAS)
        ) ? (
          <div className="tilesCont win11Scroll">
            {tiles.map((item, index) => {
              switch (item.type) {
                case "sysTop":
                  return (
                    <div key={index} className="sysTop">
                      <div className="left">
                        <img
                          src={`img/wallpaper/${wall.src}`}
                          alt=""
                          className="device_img"
                        />
                        <div className="column_device">
                          <p className="device_name">Liber-V</p>
                          <p className="device_model">NS14A8</p>
                          <p className="device_rename">Renomear</p>
                        </div>
                      </div>
                      <div className="right">
                        <div className="column">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/2/25/Microsoft_icon.svg"
                            height={20}
                            alt=""
                          />
                          <p>
                            Microsoft 365
                            <br />
                            <span className="column_lower">Ver benefícios</span>
                          </p>
                        </div>
                        <div
                          className="column"
                          onClick={() => setPage("Windows Update")}
                        >
                          <img
                            src="img/settings/Windows Update.webp"
                            alt=""
                            height={20}
                          />
                          <p>
                            Windows Update
                            <br />
                            <span className="column_lower">
                              Seu sistema está atualizado
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                case "netTop":
                  return (
                    <div key={index} className="netTop">
                      <div>
                        <img src="img/settings/wifi.png" alt="" height={100} />
                        <div>
                          <h2 className="font-medium text-lg">Wi-Fi</h2>
                          <p>Conectado, seguro</p>
                        </div>
                      </div>
                      <div className="box">
                        <span className="settingsIcon"></span>
                        <div>
                          <h3>Propriedades</h3>
                          <p>Rede pública 5 GHz</p>
                        </div>
                      </div>
                      <div className="box">
                        <span className="settingsIcon"></span>
                        <div>
                          <h3>Uso de dados</h3>
                          <p>
                            {Math.round(Math.random() * 100)} GB nos últimos 30
                            dias
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                case "personaliseTop":
                  return (
                    <div key={index} className="personaliseTop">
                      <img
                        className="mainImg"
                        src={`img/wallpaper/${wall.src}`}
                        alt=""
                      />
                      <div>
                        <h3>Selecione um tema para aplicar</h3>
                        <div className="bgBox">
                          {wall.themes.map((itemTheme) => (
                            <Image
                              key={itemTheme}
                              className={
                                wall.src.includes(itemTheme) ? "selected" : ""
                              }
                              src={`img/wallpaper/${itemTheme}/img0.jpg`}
                              ext
                              onClick={handleWallAndTheme}
                              click="WALLSET"
                              payload={`${itemTheme}/img0.jpg`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                case "accountsTop":
                  return (
                    <div key={index} className="accountsTop">
                      <UserAvatar user={currentUser} size={90} />
                      <div>
                        <p>{getUserDisplayName(currentUser).toUpperCase()}</p>
                        <p>{currentUser.username || "sem usuário"}</p>
                        <p>{getRoleLabel(currentUser.role)}</p>
                      </div>
                    </div>
                  );
                case "timeTop":
                  return (
                    <div key={index} className="timeTop">
                      <h1>
                        {new Date().toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </h1>
                    </div>
                  );
                case "langSwitcher":
                  return (
                    <div key={index} className="tile langSwitcherTile">
                      <span className="settingsIcon"></span>
                      <div className="tile_content">
                        <p>Idioma de exibição do Windows</p>
                        <p className="tile_desc">
                          Recursos do Windows, como Configurações e Explorador
                          de Arquivos, aparecerão neste idioma
                        </p>
                      </div>
                      <LangSwitch />
                    </div>
                  );
                case "updateTop":
                  return (
                    <div key={index} className="updateTop">
                      <div className="left">
                        <img src="img/settings/update.png" width={90} alt="" />
                        <div>
                          <h2>Seu sistema está atualizado</h2>
                          <p>Última verificação: hoje</p>
                        </div>
                      </div>
                      <div className="right">
                        <div
                          className="btn"
                          onClick={() => {
                            setUpdating(true);
                            setTimeout(() => {
                              setUpdating(false);
                              setUpmodalOpen(true);
                            }, Math.random() * 2000);
                          }}
                        >
                          {updating
                            ? "Verificando atualizações..."
                            : "Verificar atualizações"}
                        </div>
                      </div>
                    </div>
                  );
                case "subHeading":
                case "spacer":
                  return (
                    <div key={index} className={item.type}>
                      {getSettingText(item.name)}
                    </div>
                  );
                case "tile":
                case "tile square":
                case "tile thin-blue":
                  return renderTile(item);
                default:
                  return null;
              }
            })}
          </div>
        ) : null}
      </main>

      {upmodalOpen ? (
        <>
          <div className="absolute z-30 bg-black bg-opacity-60 h-full w-full top-0 left-0"></div>

          <div
            className="absolute top-[50%] left-[50%] z-50 rounded"
            style={{
              transform: "translateX(-50%) translateY(-50%)",
              background: "var(--wintheme)",
              padding: "1.5rem",
            }}
          >
            <h1
              style={{ marginBottom: "10px" }}
              className="text-2xl font-semibold"
            >
              Reinicialização necessária
            </h1>
            <p>
              Algumas alterações só entrarão em vigor depois que o dispositivo
              for reiniciado.
            </p>

            <div className="flex" style={{ marginTop: "14px" }}>
              <button
                style={{
                  padding: "10px",
                  backgroundColor: "var(--clrPrm)",
                  color: "var(--alt-txt)",
                  marginRight: "10px",
                }}
                onClick={() => {
                  window.location =
                    window.location.href + `?clearCache=${Math.random()}`;
                }}
                className="flex-1 rounded border-none hover:opacity-95"
              >
                Reiniciar agora
              </button>
              <button
                style={{ padding: "10px", color: "var(--sat-txt)" }}
                className="flex-1 rounded border"
                onClick={() => setUpmodalOpen(false)}
              >
                Reiniciar depois
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div className="navMenuBtn" onClick={() => setNav(nav ? "" : "open")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 48 48"
          width={24}
          height={24}
        >
          <path d="M5.5 9a1.5 1.5 0 1 0 0 3h37a1.5 1.5 0 1 0 0-3h-37zm0 13.5a1.5 1.5 0 1 0 0 3h37a1.5 1.5 0 1 0 0-3h-37zm0 13.5a1.5 1.5 0 1 0 0 3h37a1.5 1.5 0 1 0 0-3h-37z" />
        </svg>
      </div>
    </AppWindow>
  );
};

const getEmptyCreateForm = (role = "aluno") => ({
  username: "",
  displayName: "",
  password: "",
  role,
  studentType: "normal",
  turmaId: "",
});

const emptyEditForm = {
  id: "",
  username: "",
  displayName: "",
  password: "",
  role: "aluno",
  studentType: "normal",
  turmaId: "",
  active: true,
};

const studentTypeOptions = [
  {
    value: "normal",
    title: "Normal",
    description: "Fluxo padrão para alunos regulares.",
  },
  {
    value: "kids",
    title: "Kids",
    description: "Identifica alunos do grupo infantil.",
  },
];

const defaultScheduleDays = [1, 2, 3, 4, 5];

const weekDayOptions = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const normalizeScheduleDays = (days) =>
  Array.isArray(days) && days.length > 0
    ? [...new Set(days.map(Number))].sort((a, b) => a - b)
    : defaultScheduleDays;

const getScheduleSummary = (turma) => {
  const days = normalizeScheduleDays(turma.scheduleDays);
  const labels = weekDayOptions
    .filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(", ");
  return `${labels} · ${turma.scheduleStartTime || "00:00"} às ${
    turma.scheduleEndTime || "23:59"
  }`;
};

const AppLikeDialog = ({
  title,
  icon = "settings",
  onClose,
  children,
  actions,
  defaultWidth = 654,
  defaultHeight = 620,
}) => {
  const layerRef = useRef(null);
  const [dialog, setDialog] = useState({
    top: 36,
    left: 36,
    width: defaultWidth,
    height: defaultHeight,
    maximized: false,
    minimized: false,
    restore: null,
  });

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const width = Math.min(defaultWidth, Math.max(360, layer.clientWidth - 24));
    const height = Math.min(
      defaultHeight,
      Math.max(420, layer.clientHeight - 24)
    );
    setDialog((state) => ({
      ...state,
      width,
      height,
      left: Math.max(12, Math.round((layer.clientWidth - width) / 2)),
      top: Math.max(12, Math.round((layer.clientHeight - height) / 2)),
    }));
  }, [defaultHeight, defaultWidth]);

  const startDrag = (event) => {
    if (dialog.maximized) return;
    event.preventDefault();
    const layer = layerRef.current;
    if (!layer) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...dialog };

    const move = (moveEvent) => {
      const nextLeft = start.left + moveEvent.clientX - startX;
      const nextTop = start.top + moveEvent.clientY - startY;
      setDialog((state) => ({ ...state, left: nextLeft, top: nextTop }));
    };

    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const startResize = (event, direction) => {
    if (dialog.maximized) return;
    event.preventDefault();
    event.stopPropagation();
    const layer = layerRef.current;
    if (!layer) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...dialog };
    const minWidth = 360;
    const minHeight = 360;

    const move = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let nextTop = start.top;
      let nextLeft = start.left;
      let nextWidth = start.width;
      let nextHeight = start.height;

      if (direction.includes("e")) {
        nextWidth = Math.max(start.width + deltaX, minWidth);
      }
      if (direction.includes("s")) {
        nextHeight = Math.max(start.height + deltaY, minHeight);
      }
      if (direction.includes("w")) {
        const maxDelta = start.width - minWidth;
        const limitedDelta = Math.min(deltaX, maxDelta);
        nextLeft = start.left + limitedDelta;
        nextWidth = start.width - limitedDelta;
      }
      if (direction.includes("n")) {
        const maxDelta = start.height - minHeight;
        const limitedDelta = Math.min(deltaY, maxDelta);
        nextTop = start.top + limitedDelta;
        nextHeight = start.height - limitedDelta;
      }

      setDialog((state) => ({
        ...state,
        top: nextTop,
        left: nextLeft,
        width: nextWidth,
        height: nextHeight,
      }));
    };

    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const toggleMaximize = () => {
    const layer = layerRef.current;
    if (!layer) return;
    setDialog((state) => {
      if (state.maximized && state.restore) {
        return {
          ...state.restore,
          maximized: false,
          minimized: false,
          restore: null,
        };
      }
      return {
        top: 8,
        left: 8,
        width: Math.max(360, layer.clientWidth - 16),
        height: Math.max(360, layer.clientHeight - 16),
        maximized: true,
        minimized: false,
        restore: {
          ...state,
          maximized: false,
          minimized: false,
          restore: null,
        },
      };
    });
  };

  const minimize = () => {
    setDialog((state) => ({ ...state, minimized: true }));
  };

  const restoreMinimized = () => {
    setDialog((state) => ({ ...state, minimized: false }));
  };

  const dialogStyle = dialog.minimized
    ? {}
    : {
        top: dialog.top,
        left: dialog.left,
        width: dialog.width,
        height: dialog.height,
      };

  return (
    <div className="appDialogLayer" ref={layerRef}>
      {dialog.minimized ? (
        <div className="appDialogMinimized dpShad">
          <Icon src={icon} width={16} />
          <span>{title}</span>
          <button type="button" onClick={restoreMinimized}>
            Restaurar
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar janela">
            <Icon fafa="faXmark" width={11} />
          </button>
        </div>
      ) : (
        <div
          className={`appDialogWindow dpShad ${
            dialog.maximized ? "maximized" : ""
          }`}
          style={dialogStyle}
        >
          <div className="appDialogTitleBar" onMouseDown={startDrag}>
            <div className="appDialogTitle">
              <Icon src={icon} width={14} />
              <span>{title}</span>
            </div>
            <div
              className="appDialogControls"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={minimize}
                aria-label="Minimizar janela"
              >
                <Icon src="minimize" ui width={12} />
              </button>
              <button
                type="button"
                onClick={toggleMaximize}
                aria-label="Redimensionar janela"
              >
                <Icon
                  src={dialog.maximized ? "maximize" : "maxmin"}
                  ui
                  width={12}
                />
              </button>
              <button
                type="button"
                className="closeBtn"
                onClick={onClose}
                aria-label="Fechar janela"
              >
                <Icon src="close" ui width={14} />
              </button>
            </div>
          </div>
          <div className="appDialogContent">{children}</div>
          {actions ? <div className="appDialogActions">{actions}</div> : null}
          {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((direction) => (
            <div
              key={direction}
              className={`appDialogResize appDialogResize-${direction}`}
              onMouseDown={(event) => startResize(event, direction)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const UserManagement = ({ currentUser, onBack }) => {
  const [users, setUsers] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [createForm, setCreateForm] = useState(getEmptyCreateForm());
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createMode, setCreateMode] = useState("");
  const [dialogMode, setDialogMode] = useState("");
  const [message, setMessage] = useState("");
  const [createUsernameStatus, setCreateUsernameStatus] = useState(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const isProfessor = currentUser.role === "professor";
  const isStaff = currentUser.role !== "aluno";

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const turmaNameById = useMemo(
    () => new Map(turmas.map((turma) => [turma.id, turma.nome])),
    [turmas]
  );
  const turmaTypeById = useMemo(
    () =>
      new Map(turmas.map((turma) => [turma.id, turma.studentType || "normal"])),
    [turmas]
  );
  const filteredUsers = useMemo(() => {
    const search = normalizeSearchText(userSearch.trim());

    return users.filter((user) => {
      const matchesSearch =
        !search || normalizeSearchText(user.displayName).includes(search);
      const matchesTurma =
        turmaFilter === "all" ||
        (turmaFilter === "team" && user.role === "professor") ||
        (turmaFilter === "none" && user.role === "aluno" && !user.turmaId) ||
        user.turmaId === turmaFilter;

      return matchesSearch && matchesTurma;
    });
  }, [turmaFilter, userSearch, users]);

  const prepareEditing = (user) => {
    setSelectedUserId(user.id);
    setShowEditPassword(false);
    setEditForm({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      password: "",
      role: user.role,
      studentType: user.studentType || "normal",
      turmaId: user.turmaId || "",
      active: user.active,
    });
  };

  const startEditing = (user) => {
    setCreateMode("");
    setDialogMode("edit");
    setMessage("");
    prepareEditing(user);
  };

  const loadUsers = async () => {
    if (!isStaff) return;
    setLoading(true);
    try {
      const [usersResult, turmasResult] = await Promise.all([
        api.getUsers(),
        api.getTurmas().catch(() => ({ turmas: [] })),
      ]);
      const loadedUsers = usersResult.users || [];
      setUsers(loadedUsers);
      setTurmas(turmasResult.turmas || []);
      setMessage("");
      if (loadedUsers.length > 0) {
        const nextSelection =
          loadedUsers.find((user) => user.id === selectedUserId) ||
          loadedUsers[0];
        prepareEditing(nextSelection);
      } else {
        setSelectedUserId("");
        setEditForm(emptyEditForm);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isStaff]);

  const openCreateForm = (role) => {
    setCreateMode(role);
    setDialogMode("create");
    setCreateForm(getEmptyCreateForm(role));
    setSelectedUserId("");
    setMessage("");
    setCreateUsernameStatus(null);
    setShowCreatePassword(false);
  };

  const cancelCreate = () => {
    setDialogMode("");
    setCreateMode("");
    setCreateForm(getEmptyCreateForm());
    setCreateUsernameStatus(null);
    setShowCreatePassword(false);
    if (users.length > 0) {
      prepareEditing(users[0]);
    }
  };

  const closeDialog = () => {
    setDialogMode("");
    setCreateMode("");
    setMessage("");
    setShowCreatePassword(false);
    setShowEditPassword(false);
    if (users.length > 0 && !selectedUserId) {
      prepareEditing(users[0]);
    }
  };

  const updateCreateField = (event) => {
    const { name, value } = event.target;
    if (name === "username") setCreateUsernameStatus(null);
    setCreateForm((state) => {
      const nextForm = {
        ...state,
        [name]: name === "displayName" ? normalizeName(value) : value,
      };
      if (name === "turmaId") {
        nextForm.studentType = turmaTypeById.get(value) || "normal";
      }
      return nextForm;
    });
  };

  const checkCreateUsername = async () => {
    const username = createForm.username.trim();
    if (username.length < 3) {
      setCreateUsernameStatus(null);
      return;
    }
    setCreateUsernameStatus({
      type: "checking",
      text: "Verificando usuário...",
    });
    try {
      const result = await api.checkUsernameAvailability(username);
      setCreateUsernameStatus(
        result.available
          ? { type: "ok", text: "Usuário disponível." }
          : { type: "error", text: "Este usuário já está em uso." }
      );
    } catch (error) {
      setCreateUsernameStatus({ type: "error", text: error.message });
    }
  };

  const updateEditField = (event) => {
    const { name, value, type, checked } = event.target;
    const nextForm = {
      ...editForm,
      [name]:
        name === "displayName"
          ? normalizeName(value)
          : type === "checkbox"
          ? checked
          : value,
    };
    if (name === "role" && value === "professor") {
      nextForm.studentType = "normal";
      nextForm.turmaId = "";
    }
    if (name === "turmaId") {
      nextForm.studentType = turmaTypeById.get(value) || "normal";
    }
    setEditForm(nextForm);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (createUsernameStatus?.type === "error") {
        setLoading(false);
        return;
      }
      const role = createMode || createForm.role;
      await api.createUser({
        username: createForm.username,
        displayName: createForm.displayName,
        password: createForm.password,
        role,
        studentType: role === "aluno" ? createForm.studentType : "normal",
        turmaId: role === "aluno" ? createForm.turmaId || null : null,
      });
      setCreateForm(getEmptyCreateForm(role));
      setCreateMode("");
      setDialogMode("");
      await loadUsers();
      setMessage(
        `${role === "aluno" ? "Aluno" : "Professor"} criado com sucesso.`
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        displayName: editForm.displayName,
        role: editForm.role,
        studentType:
          editForm.role === "aluno" ? editForm.studentType : "normal",
        turmaId: editForm.role === "aluno" ? editForm.turmaId || null : null,
        active: editForm.active,
      };
      if (editForm.password) payload.password = editForm.password;
      await api.updateUser(selectedUser.id, payload);
      setDialogMode("");
      await loadUsers();
      setEditForm((state) => ({ ...state, password: "" }));
      setMessage("Usuário atualizado com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTurmaField = (form, onChange) => (
    <label>
      Turma
      <select name="turmaId" value={form.turmaId} onChange={onChange}>
        <option value="">Sem turma</option>
        {turmas
          .filter((t) => t.active)
          .map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome} ({getStudentTypeLabel(turma.studentType)})
            </option>
          ))}
      </select>
    </label>
  );

  if (!isStaff) {
    return (
      <section className="userAdminPanel">
        <div className="userAdminTopBar">
          <button type="button" className="secondaryBtn" onClick={onBack}>
            Voltar
          </button>
        </div>
        <div className="userAdminCard">
          <h2>Outros usuários</h2>
          <p>
            Apenas professores podem criar ou editar contas. Como aluno, você
            acessa somente o seu próprio disco virtual, e o diretório completo
            `C:\Users` permanece restrito ao professor.
          </p>
        </div>
      </section>
    );
  }

  const professorCount = users.filter(
    (user) => user.role === "professor"
  ).length;
  const studentCount = users.filter((user) => user.role === "aluno").length;
  const createRoleLabel = createMode === "professor" ? "professor" : "aluno";

  return (
    <section className="userAdminPanel">
      <div className="userAdminTopBar">
        <button type="button" className="secondaryBtn" onClick={onBack}>
          <Icon fafa="faArrowLeft" width={12} />
          Voltar
        </button>
        <button
          type="button"
          className="secondaryBtn"
          onClick={loadUsers}
          disabled={loading}
        >
          <Icon fafa="faRotate" width={12} />
          Atualizar lista
        </button>
      </div>

      <div className="userAdminHero">
        <div>
          <h2>Gerenciar outros usuários</h2>
          <p>
            Crie contas separadas para alunos e professores, controle o acesso
            ao simulador e mantenha a separação dos discos virtuais.
          </p>
        </div>
        <div className="userAdminStats" aria-label="Resumo de usuários">
          <span>{studentCount} alunos</span>
          <span>{professorCount} professores</span>
        </div>
      </div>

      {message && !dialogMode ? (
        <p className="userAdminMessage">{message}</p>
      ) : null}

      {isProfessor ? (
        <div className="userAddRow">
          <div className="userAddInfo">
            <Icon fafa="faUserPlus" width={18} />
            <div>
              <strong>Adicionar outro usuário</strong>
              <span>Escolha uma criação exclusiva para aluno ou professor.</span>
            </div>
          </div>
          <div className="userAddActions">
            <button
              type="button"
              className={createMode === "aluno" ? "selected" : ""}
              onClick={() => openCreateForm("aluno")}
            >
              <Icon fafa="faUser" width={13} />
              Criar aluno
            </button>
            <button
              type="button"
              className={createMode === "professor" ? "selected" : ""}
              onClick={() => openCreateForm("professor")}
            >
              <Icon fafa="faUserTie" width={13} />
              Criar professor
            </button>
          </div>
        </div>
      ) : null}

      <div className="userAdminGrid">
        <section className="userAdminCard userDirectoryCard">
          <div className="userDirectoryHeader">
            <div>
              <h3>Usuários configurados</h3>
              <span>
                {filteredUsers.length} de {users.length} usuários exibidos
              </span>
            </div>
          </div>
          <div className="userDirectoryToolbar">
            <label>
              Turma
              <select
                value={turmaFilter}
                onChange={(event) => setTurmaFilter(event.target.value)}
              >
                <option value="all">Todas as turmas</option>
                <option value="team">Equipe</option>
                <option value="none">Sem turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Buscar por nome
              <input
                type="search"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Digite o nome"
              />
            </label>
          </div>
          <div className="userDirectoryList">
            {users.length === 0 && !loading ? (
              <p>Nenhum usuário configurado.</p>
            ) : null}
            {users.length > 0 && filteredUsers.length === 0 ? (
              <p>Nenhum usuário encontrado com os filtros atuais.</p>
            ) : null}
            {filteredUsers.map((user) => (
              <button
                type="button"
                key={user.id}
                className={`directoryRow ${
                  user.id === selectedUserId ? "selected" : ""
                } ${!isProfessor ? "readOnly" : ""}`}
                onClick={() => isProfessor && startEditing(user)}
                style={{ cursor: isProfessor ? "pointer" : "default" }}
              >
                <UserAvatar user={user} size={42} />
                <div className="directoryMeta">
                  <strong>{user.displayName}</strong>
                  <span>@{user.username}</span>
                </div>
                <div className="directoryStatus">
                  <span>{getRoleLabel(user.role)}</span>
                  {user.role === "aluno" ? (
                    <span
                      className={`studentTypeBadge ${
                        user.studentType === "kids" ? "isKids" : "isNormal"
                      }`}
                    >
                      {getStudentTypeLabel(user.studentType)}
                    </span>
                  ) : null}
                  <span>
                    {user.role === "aluno"
                      ? turmaNameById.get(user.turmaId) || "Sem turma"
                      : "Equipe"}
                  </span>
                  <span className={user.active ? "active" : "inactive"}>
                    {user.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {dialogMode === "create" && createMode ? (
        <AppLikeDialog
          title={`Criar ${createRoleLabel}`}
          icon="settings"
          onClose={cancelCreate}
          actions={
            <>
              <button
                type="submit"
                form="create-user-form"
                className="primaryDialogBtn"
                disabled={
                  loading ||
                  createUsernameStatus?.type === "checking" ||
                  createUsernameStatus?.type === "error"
                }
              >
                Criar {createRoleLabel}
              </button>
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={cancelCreate}
              >
                Voltar
              </button>
            </>
          }
        >
          <form
            id="create-user-form"
            className="userDialogForm userCreateCard"
            onSubmit={submitCreate}
          >
            <h3>Criar {createRoleLabel}</h3>
            <p>
              {createMode === "aluno"
                ? "Cadastre o aluno em uma turma. O tipo Kids ou Normal será herdado automaticamente da turma."
                : "Cadastre um professor para administrar contas e turmas."}
            </p>
            {message ? <p className="userDialogMessage">{message}</p> : null}
            <label>
              Nome completo
              <input
                name="displayName"
                value={createForm.displayName}
                onChange={updateCreateField}
                autoComplete="name"
                placeholder={
                  createMode === "aluno" ? "Nome do aluno" : "Nome do professor"
                }
                autoFocus
                required
              />
            </label>
            <label>
              Nome de usuário
              <input
                name="username"
                value={createForm.username}
                onChange={updateCreateField}
                onBlur={checkCreateUsername}
                autoComplete="username"
                placeholder="usuario"
                minLength={3}
                required
              />
            </label>
            {createUsernameStatus ? (
              <p
                className={`formHint usernameStatus ${
                  createUsernameStatus.type === "ok"
                    ? "isOk"
                    : createUsernameStatus.type === "error"
                    ? "isError"
                    : "isChecking"
                }`}
              >
                {createUsernameStatus.text}
              </p>
            ) : null}
            <label>
              Senha inicial
              <div className="settingsPasswordInputWrapper">
                <input
                  name="password"
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={updateCreateField}
                  autoComplete="new-password"
                  placeholder="Mínimo de 8 caracteres"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="settingsPasswordToggle"
                  onClick={() => setShowCreatePassword((state) => !state)}
                  aria-label={
                    showCreatePassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  <FontAwesomeIcon
                    icon={showCreatePassword ? faEyeSlash : faEye}
                  />
                </button>
              </div>
            </label>
            {createMode === "aluno" ? (
              <>
                {renderTurmaField(createForm, updateCreateField)}
                <p className="formHint">
                  Tipo aplicado:{" "}
                  <span
                    className={`studentTypeBadge ${
                      createForm.studentType === "kids" ? "isKids" : "isNormal"
                    }`}
                  >
                    {getStudentTypeLabel(createForm.studentType)}
                  </span>
                </p>
              </>
            ) : null}
          </form>
        </AppLikeDialog>
      ) : null}

      {dialogMode === "edit" && selectedUser ? (
        <AppLikeDialog
          title="Editar usuário"
          icon="settings"
          onClose={closeDialog}
          actions={
            <>
              <button
                type="submit"
                form="edit-user-form"
                className="primaryDialogBtn"
                disabled={loading}
              >
                Salvar alterações
              </button>
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={closeDialog}
              >
                Cancelar
              </button>
            </>
          }
        >
          <form
            id="edit-user-form"
            className="userDialogForm userEditCard"
            onSubmit={submitEdit}
          >
            <h3>Editar usuário</h3>
            <div className="editUserHeader">
              <UserAvatar user={selectedUser} size={52} />
              <div>
                <strong>{selectedUser.displayName}</strong>
                <span>@{selectedUser.username}</span>
                <div className="editUserTags">
                  <small>{getRoleLabel(selectedUser.role)}</small>
                  {selectedUser.role === "aluno" ? (
                    <small
                      className={`studentTypeBadge ${
                        selectedUser.studentType === "kids"
                          ? "isKids"
                          : "isNormal"
                      }`}
                    >
                      {getStudentTypeLabel(selectedUser.studentType)}
                    </small>
                  ) : null}
                </div>
              </div>
            </div>
            {message ? <p className="userDialogMessage">{message}</p> : null}
            <label>
              Nome completo
              <input
                name="displayName"
                value={editForm.displayName}
                onChange={updateEditField}
                autoComplete="name"
                autoFocus
                required
              />
            </label>
            <label>
              Nome de usuário
              <input
                name="username"
                value={editForm.username}
                autoComplete="username"
                readOnly
              />
            </label>
            <label>
              Grupo
              <select
                name="role"
                value={editForm.role}
                onChange={updateEditField}
              >
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
              </select>
            </label>
            {editForm.role === "aluno" ? (
              <>
                {renderTurmaField(editForm, updateEditField)}
                <p className="formHint">
                  Tipo aplicado:{" "}
                  <span
                    className={`studentTypeBadge ${
                      editForm.studentType === "kids" ? "isKids" : "isNormal"
                    }`}
                  >
                    {getStudentTypeLabel(editForm.studentType)}
                  </span>
                </p>
              </>
            ) : null}
            <label>
              Nova senha
              <div className="settingsPasswordInputWrapper">
                <input
                  name="password"
                  type={showEditPassword ? "text" : "password"}
                  value={editForm.password}
                  onChange={updateEditField}
                  autoComplete="new-password"
                  placeholder="Deixe em branco para manter"
                  minLength={8}
                />
                <button
                  type="button"
                  className="settingsPasswordToggle"
                  onClick={() => setShowEditPassword((state) => !state)}
                  aria-label={
                    showEditPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  <FontAwesomeIcon
                    icon={showEditPassword ? faEyeSlash : faEye}
                  />
                </button>
              </div>
            </label>
            <label className="toggleRow">
              <input
                name="active"
                type="checkbox"
                checked={editForm.active}
                onChange={updateEditField}
                disabled={selectedUser.username === currentUser.username}
              />
              <span>Usuário ativo</span>
            </label>
          </form>
        </AppLikeDialog>
      ) : null}
    </section>
  );
};

const generateLocalTurmaCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const getEmptyTurmaForm = () => ({
  nome: "",
  code: generateLocalTurmaCode(),
  studentType: "normal",
  scheduleDays: defaultScheduleDays,
  scheduleStartTime: "00:00",
  scheduleEndTime: "23:59",
  descricao: "",
});

const TurmaManagement = ({ currentUser, onBack }) => {
  const [view, setView] = useState("list"); // "list", "create", "details"
  const [turmas, setTurmas] = useState([]);
  const [users, setUsers] = useState([]);
  const [createForm, setCreateForm] = useState(getEmptyTurmaForm);
  const [editForm, setEditForm] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isProfessor = currentUser.role === "professor";
  const isStaff = currentUser.role !== "aluno";

  const loadData = async () => {
    if (!isStaff) return;
    setLoading(true);
    try {
      const [turmasRes, usersRes] = await Promise.all([
        api.getTurmas(),
        api.getUsers(),
      ]);
      setTurmas(turmasRes.turmas || []);
      setUsers(usersRes.users || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isStaff]);

  const viewDetails = (turma) => {
    setSelectedId(turma.id);
    setEditForm({
      nome: turma.nome,
      code: turma.code || "",
      studentType: turma.studentType || "normal",
      scheduleDays: normalizeScheduleDays(turma.scheduleDays),
      scheduleStartTime: turma.scheduleStartTime || "00:00",
      scheduleEndTime: turma.scheduleEndTime || "23:59",
      descricao: turma.descricao || "",
      active: turma.active,
    });
    setView("details");
    setMessage("");
  };

  const updateCreateField = (e) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const updateEditField = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const updateCreateScheduleDay = (day, checked) => {
    setCreateForm((form) => ({
      ...form,
      scheduleDays: checked
        ? normalizeScheduleDays([...form.scheduleDays, day])
        : form.scheduleDays.filter((item) => item !== day),
    }));
  };

  const updateEditScheduleDay = (day, checked) => {
    setEditForm((form) => ({
      ...form,
      scheduleDays: checked
        ? normalizeScheduleDays([...form.scheduleDays, day])
        : form.scheduleDays.filter((item) => item !== day),
    }));
  };

  const renderScheduleFields = (form, onFieldChange, onDayChange) => (
    <fieldset className="turmaScheduleFields">
      <legend>Dias e horários de aula</legend>
      <p>
        A Frequência usa esta agenda para calcular presenças e ausências da
        turma.
      </p>
      <div className="turmaWeekDays">
        {weekDayOptions.map((day) => (
          <label key={day.value}>
            <input
              type="checkbox"
              checked={(Array.isArray(form.scheduleDays)
                ? form.scheduleDays
                : defaultScheduleDays
              ).includes(day.value)}
              onChange={(event) => onDayChange(day.value, event.target.checked)}
            />
            <span>{day.label}</span>
          </label>
        ))}
      </div>
      <div className="turmaTimeGrid">
        <label>
          Início
          <input
            name="scheduleStartTime"
            type="time"
            value={form.scheduleStartTime}
            onChange={onFieldChange}
            required
          />
        </label>
        <label>
          Fim
          <input
            name="scheduleEndTime"
            type="time"
            value={form.scheduleEndTime}
            onChange={onFieldChange}
            required
          />
        </label>
      </div>
    </fieldset>
  );

  const submitCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await api.createTurma(createForm);
      setCreateForm(getEmptyTurmaForm());
      await loadData();
      setView("list");
      setMessage("Turma criada com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setMessage("");
    try {
      await api.updateTurma(selectedId, editForm);
      await loadData();
      setView("list");
      setMessage("Turma atualizada com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (turmaId) => {
    const turma = turmas.find((t) => t.id === turmaId);
    if (!turma) return;
    if (
      !confirm(
        `Excluir a turma "${turma.nome}"? Os alunos vinculados ficarão sem turma.`
      )
    )
      return;
    setLoading(true);
    try {
      await api.deleteTurma(turmaId);
      if (selectedId === turmaId) {
        setView("list");
      }
      await loadData();
      setMessage("Turma excluída com sucesso.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isStaff) {
    return (
      <section className="userAdminPanel turmaManagementPanel win11Scroll">
        <div className="userAdminTopBar">
          <button type="button" className="secondaryBtn" onClick={onBack}>
            Voltar
          </button>
        </div>
        <div className="userAdminCard">
          <h2>Turmas</h2>
          <p>Apenas professores podem gerenciar turmas.</p>
        </div>
      </section>
    );
  }

  const selectedTurma = turmas.find((t) => t.id === selectedId);
  const turmaUsers = users.filter((u) => u.turmaId === selectedId);

  return (
    <section className="userAdminPanel turmaManagementPanel win11Scroll">
      <div className="userAdminTopBar">
        <button type="button" className="secondaryBtn" onClick={onBack}>
          <Icon fafa="faArrowLeft" width={12} />
          Voltar
        </button>
      </div>

      <div className="userAdminHero">
        <div>
          <h2>Gerenciar turmas</h2>
          <p>
            Selecione uma turma para ver seus alunos, tipo, código e detalhes.
          </p>
        </div>
      </div>
      {message && view === "list" ? (
        <p className="userAdminMessage">{message}</p>
      ) : null}
      {isProfessor ? (
        <div className="userAddRow">
          <div className="userAddInfo">
            <Icon fafa="faUserPlus" width={18} />
            <div>
              <strong>Criar nova turma</strong>
              <span>
                Um código automático de 6 caracteres será usado no cadastro do
                aluno.
              </span>
            </div>
          </div>
          <div className="userAddActions">
            <button
              type="button"
              onClick={() => {
                setCreateForm(getEmptyTurmaForm());
                setView("create");
                setMessage("");
              }}
            >
              Criar turma
            </button>
          </div>
        </div>
      ) : null}
      <div
        className="userAdminCard turmaListCard"
        style={{ marginTop: "14px" }}
      >
        <div className="turmaList">
          {turmas.length === 0 ? (
            <p>Nenhuma turma cadastrada. Clique no botão acima para criar.</p>
          ) : (
            turmas.map((turma) => (
              <div
                key={turma.id}
                className="turmaRow"
                onClick={() => viewDetails(turma)}
              >
                <div className="turmaRowInfo">
                  <strong>{turma.nome}</strong>
                  {turma.descricao ? <span>{turma.descricao}</span> : null}
                  <span>{getScheduleSummary(turma)}</span>
                </div>
                <div className="turmaRowActions">
                  <span className="turmaCodeBadge">
                    {turma.code || "------"}
                  </span>
                  <span className="turmaCodeBadge">
                    {getStudentTypeLabel(turma.studentType)}
                  </span>
                  <span
                    className={turma.active ? "turmaActive" : "turmaInactive"}
                  >
                    {turma.active ? "Ativa" : "Inativa"}
                  </span>
                  {isProfessor ? (
                    <button
                      type="button"
                      className="turmaDeleteBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(turma.id);
                      }}
                      title="Excluir turma"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {view === "create" ? (
        <AppLikeDialog
          title="Criar turma"
          icon="settings"
          onClose={() => {
            setView("list");
            setMessage("");
          }}
          actions={
            <>
              <button
                type="submit"
                form="create-turma-form"
                className="primaryDialogBtn"
                disabled={loading}
              >
                Salvar turma
              </button>
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={() => {
                  setView("list");
                  setMessage("");
                }}
              >
                Cancelar
              </button>
            </>
          }
        >
          <form
            id="create-turma-form"
            className="userDialogForm turmaCreateCard"
            onSubmit={submitCreate}
          >
            <h3>Criar turma</h3>
            <p>
              Use o código automático para vincular alunos. O tipo da turma
              define se todos serão Normal ou Kids.
            </p>
            {message ? <p className="userDialogMessage">{message}</p> : null}
            <label>
              Nome da turma
              <input
                name="nome"
                value={createForm.nome}
                onChange={updateCreateField}
                placeholder="Ex: 1A - Manhã"
                minLength={2}
                required
              />
            </label>
            <label>
              Código da turma
              <input
                name="code"
                value={createForm.code}
                readOnly
                maxLength={6}
              />
            </label>
            <label>
              Tipo da turma
              <select
                name="studentType"
                value={createForm.studentType}
                onChange={updateCreateField}
              >
                {studentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
            {renderScheduleFields(
              createForm,
              updateCreateField,
              updateCreateScheduleDay
            )}
            <label>
              Descrição (opcional)
              <input
                name="descricao"
                value={createForm.descricao}
                onChange={updateCreateField}
                placeholder="Ex: Turma do 1º ano, período matutino"
              />
            </label>
          </form>
        </AppLikeDialog>
      ) : null}

      {view === "details" && selectedTurma && editForm ? (
        <AppLikeDialog
          title={`Turma ${selectedTurma.nome}`}
          icon="settings"
          onClose={() => {
            setView("list");
            setMessage("");
          }}
          defaultWidth={760}
          defaultHeight={620}
          actions={
            <>
              {isProfessor ? (
                <button
                  type="submit"
                  form="edit-turma-form"
                  className="primaryDialogBtn"
                  disabled={loading}
                >
                  Salvar alterações
                </button>
              ) : null}
              <button
                type="button"
                className="secondaryDialogBtn"
                onClick={() => {
                  setView("list");
                  setMessage("");
                }}
              >
                Voltar
              </button>
            </>
          }
        >
          <div className="turmaDialogGrid">
            <section>
              <h3>Alunos em {selectedTurma.nome}</h3>
              <p className="turmaCodeLarge">
                Código: {selectedTurma.code || "------"}
              </p>
              <p className="turmaCodeLarge">
                Tipo: {getStudentTypeLabel(selectedTurma.studentType)}
              </p>
              <p className="turmaCodeLarge">
                Aulas: {getScheduleSummary(selectedTurma)}
              </p>
              {message ? <p className="userDialogMessage">{message}</p> : null}
              <div className="turmaStudentList">
                {turmaUsers.length === 0 ? (
                  <p>Nenhum aluno vinculado a esta turma no momento.</p>
                ) : (
                  turmaUsers.map((u) => (
                    <div key={u.id} className="turmaStudentRow">
                      <div>
                        <strong>{u.displayName}</strong>
                        <span>@{u.username}</span>
                        <span>{getStudentTypeLabel(u.studentType)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {isProfessor ? (
              <form
                id="edit-turma-form"
                className="userDialogForm turmaEditCard"
                onSubmit={submitEdit}
              >
                <h3>Editar turma</h3>
                <label>
                Nome da turma
                <input
                  name="nome"
                  value={editForm.nome}
                  onChange={updateEditField}
                  minLength={2}
                  autoFocus
                  required
                />
              </label>
              <label>
                Código da turma
                <input
                  name="code"
                  value={editForm.code}
                  readOnly
                  maxLength={6}
                />
              </label>
              <label>
                Tipo da turma
                <select
                  name="studentType"
                  value={editForm.studentType}
                  onChange={updateEditField}
                >
                  {studentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="formHint">
                Ao alterar o tipo da turma, todos os alunos vinculados herdam o
                novo tipo automaticamente.
              </p>
              {renderScheduleFields(
                editForm,
                updateEditField,
                updateEditScheduleDay
              )}
              <label>
                Descrição
                <input
                  name="descricao"
                  value={editForm.descricao}
                  onChange={updateEditField}
                />
              </label>
              <label className="toggleRow">
                <input
                  name="active"
                  type="checkbox"
                  checked={editForm.active}
                  onChange={updateEditField}
                />
                <span>Turma ativa</span>
              </label>
              </form>
            ) : null}
          </div>
        </AppLikeDialog>
      ) : null}
    </section>
  );
};
