import "./settings.scss";
import "../assets/settings.scss";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeTheme } from "../../../../actions";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { UserAvatar } from "../../../../components/user/UserAvatar";
import {
  SETTINGS_PAGE_LABELS,
  getRoleLabel,
  getSettingText,
  getUserDisplayName,
} from "../../../../lib/ui";
import { Image } from "../../../../utils/general";
import LangSwitch from "../assets/Langswitch";
import data from "../assets/settingsData.json";
import {
  ACCOUNT_OTHER_USERS,
  ACCOUNT_OVERVIEW,
  ACCOUNT_TURMAS,
} from "./settingsShared";
import { TurmaManagement } from "./TurmaManagement";
import { UserManagement } from "./UserManagement";

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
    setNav("");
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
    setNav("");
  };

  const openTurmas = () => {
    setPage("Accounts");
    setAccountSection(ACCOUNT_TURMAS);
    setNav("");
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
