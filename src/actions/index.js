import axios from "axios";
import store from "../reducers";
import { dfApps } from "../utils";
import { gene_name } from "../utils/apps";
import newsData from "../reducers/news.json";

export const dispatchAction = (event) => {
  const action = {
    type: event.target.dataset.action,
    payload: event.target.dataset.payload,
  };

  if (action.type) {
    store.dispatch(action);
  }
};

export const refresh = (pl, menu) => {
  if (menu.menus.desk[0].opts[4].check) {
    store.dispatch({ type: "DESKHIDE" });
    setTimeout(() => store.dispatch({ type: "DESKSHOW" }), 100);
  }
};

export const changeIconSize = (size, menu) => {
  var tmpMenu = { ...menu };
  tmpMenu.menus.desk[0].opts[0].dot = false;
  tmpMenu.menus.desk[0].opts[1].dot = false;
  tmpMenu.menus.desk[0].opts[2].dot = false;
  var isize = 1;

  if (size == "large") {
    tmpMenu.menus.desk[0].opts[0].dot = true;
    isize = 1.5;
  } else if (size == "medium") {
    tmpMenu.menus.desk[0].opts[1].dot = true;
    isize = 1.2;
  } else {
    tmpMenu.menus.desk[0].opts[2].dot = true;
  }

  refresh("", tmpMenu);
  store.dispatch({ type: "DESKSIZE", payload: isize });
  store.dispatch({ type: "MENUCHNG", payload: tmpMenu });
};

export const deskHide = (payload, menu) => {
  var tmpMenu = { ...menu };
  tmpMenu.menus.desk[0].opts[4].check ^= 1;

  store.dispatch({ type: "DESKTOGG" });
  store.dispatch({ type: "MENUCHNG", payload: tmpMenu });
};

export const changeSort = (sort, menu) => {
  var tmpMenu = { ...menu };
  tmpMenu.menus.desk[1].opts[0].dot = false;
  tmpMenu.menus.desk[1].opts[1].dot = false;
  tmpMenu.menus.desk[1].opts[2].dot = false;
  if (sort == "name") {
    tmpMenu.menus.desk[1].opts[0].dot = true;
  } else if (sort == "size") {
    tmpMenu.menus.desk[1].opts[1].dot = true;
  } else {
    tmpMenu.menus.desk[1].opts[2].dot = true;
  }

  refresh("", tmpMenu);
  store.dispatch({ type: "DESKSORT", payload: sort });
  store.dispatch({ type: "MENUCHNG", payload: tmpMenu });
};

export const changeTaskAlign = (align, menu) => {
  var tmpMenu = { ...menu };
  if (tmpMenu.menus.task[0].opts[align == "left" ? 0 : 1].dot) return;

  tmpMenu.menus.task[0].opts[0].dot = false;
  tmpMenu.menus.task[0].opts[1].dot = false;

  if (align == "left") {
    tmpMenu.menus.task[0].opts[0].dot = true;
  } else {
    tmpMenu.menus.task[0].opts[1].dot = true;
  }

  store.dispatch({ type: "TASKTOG" });
  store.dispatch({ type: "MENUCHNG", payload: tmpMenu });
};

export const performApp = (act, menu) => {
  var data = {
    type: menu.dataset.action,
    payload: menu.dataset.payload,
  };

  if (act == "open") {
    if (data.type) store.dispatch(data);
  } else if (act == "pintotaskbar") {
    if (data.type) {
      var apps = store.getState().apps;
      var app = Object.keys(apps).find(
        (x) =>
          apps[x].action == data.type ||
          (apps[x].payload == data.payload && apps[x].payload != null)
      );
      if (app) store.dispatch({ type: "TASKADD", payload: apps[app].name });
    }
  } else if (act == "unpintaskbar") {
    if (data.type) {
      var apps = store.getState().apps;
      var app = Object.keys(apps).find(
        (x) =>
          apps[x].action == data.type ||
          (apps[x].payload == data.payload && apps[x].payload != null)
      );
      if (app) store.dispatch({ type: "TASKREM", payload: apps[app].name });
    }
  } else if (act == "delshort") {
    if (data.type) {
      var apps = store.getState().apps;
      var app = Object.keys(apps).filter(
        (x) =>
          apps[x].action == data.type ||
          (apps[x].payload == data.payload && apps[x].payload != null)
      );

      app = apps[app];
      if (app) {
        store.dispatch({ type: "DESKREM", payload: app.name });
      }
    }
  }
};

export const delApp = (act, menu) => {
  var data = {
    type: menu.dataset.action,
    payload: menu.dataset.payload,
  };

  if (act == "delete") {
    if (data.type) {
      var apps = store.getState().apps;
      var app = Object.keys(apps).filter((x) => apps[x].action == data.type);
      if (app) {
        app = apps[app];
        if (app.pwa == true || app.pwa == False /*what is that for ?*/) {
          store.dispatch({ type: app.action, payload: "close" });
          store.dispatch({ type: "DELAPP", payload: app.icon });

          var installed = localStorage.getItem("installed");
          if (!installed) installed = "[]";

          installed = JSON.parse(installed);
          installed = installed.filter((x) => x.icon != app.icon);
          localStorage.setItem("installed", JSON.stringify(installed));

          store.dispatch({ type: "DESKREM", payload: app.name });
        }
      }
    }
  }
};

export const installApp = (data) => {
  var app = { ...data, type: "app", pwa: true };

  var installed = localStorage.getItem("installed");
  if (!installed) installed = "[]";

  installed = JSON.parse(installed);
  installed.push(app);
  localStorage.setItem("installed", JSON.stringify(installed));

  var desk = localStorage.getItem("desktop");
  if (!desk) desk = dfApps.desktop;
  else desk = JSON.parse(desk);

  desk.push(app.name);
  localStorage.setItem("desktop", JSON.stringify(desk));

  app.action = gene_name();
  store.dispatch({ type: "ADDAPP", payload: app });
  store.dispatch({ type: "DESKADD", payload: app });
  store.dispatch({ type: "WNSTORE", payload: "mnmz" });
};

export const getTreeValue = (obj, path) => {
  if (path == null) return false;

  var tdir = { ...obj };
  path = path.split(".");
  for (var i = 0; i < path.length; i++) {
    tdir = tdir[path[i]];
  }

  return tdir;
};

export const changeTheme = () => {
  var thm = store.getState().setting.person.theme,
    thm = thm == "light" ? "dark" : "light";
  var icon = thm == "light" ? "sun" : "moon";

  document.body.dataset.theme = thm;
  store.dispatch({ type: "STNGTHEME", payload: thm });
  store.dispatch({ type: "PANETHEM", payload: icon });
  store.dispatch({ type: "WALLSET", payload: thm == "light" ? 0 : 1 });
};

const loadWidget = async () => {
  var tmpWdgt = {
      ...store.getState().widpane,
    },
    date = new Date();

  // console.log('fetching ON THIS DAY');
  var wikiurl = "https://en.wikipedia.org/api/rest_v1/feed/onthisday/events";
  await axios
    .get(`${wikiurl}/${date.getMonth()}/${date.getDay()}`)
    .then((res) => res.data)
    .then((data) => {
      var event = data.events[Math.floor(Math.random() * data.events.length)];
      date.setYear(event.year);

      tmpWdgt.data.date = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      tmpWdgt.data.event = event;
    })
    .catch((error) => {});

  var newsList = [];
  newsData.articles.forEach((e) => {
    newsList.push({
      ...e,
      title: e.title.split(`-`).slice(0, -1).join(`-`).trim() || e.title,
    });
  });
  tmpWdgt.data.news = newsList;

  store.dispatch({
    type: "WIDGREST",
    payload: tmpWdgt,
  });
};

export const loadSettings = () => {
  const state = store.getState();
  const sett = state.setting;

  if (sett.person?.theme && sett.person.theme !== "light") changeTheme();

  if (import.meta.env.MODE != "development") {
    loadWidget();
  }
};

// mostly file explorer
export const handleFileOpen = (id) => {
  // handle double click open
  const item = store.getState().files.data.getId(id);
  if (item != null) {
    if (item.type == "folder") {
      store.dispatch({ type: "FILEDIR", payload: item.id });
    } else if (item.type == "file" || item.type == "txt") {
      // Passa o ID do arquivo como payload para o Notepad carregar o conteúdo
      store.dispatch({ type: "NOTEPAD", payload: item.id });
    }
  }
};

// Explorer context menu actions
export const explorerNewFolder = (payload, menu) => {
  store.dispatch({ type: "FILENEWFOLDER" });
};

export const explorerNewFile = (payload, menu) => {
  store.dispatch({ type: "FILENEWFILE" });
};

export const explorerCopy = (payload, menu) => {
  var itemId = menu.dataset && menu.dataset.id;
  if (itemId) {
    store.dispatch({ type: "FILECOPY", payload: itemId });
  }
};

export const explorerCut = (payload, menu) => {
  var itemId = menu.dataset && menu.dataset.id;
  if (itemId) {
    store.dispatch({ type: "FILECUT", payload: itemId });
  }
};

export const explorerPaste = () => {
  store.dispatch({ type: "FILEPASTE" });
};

export const explorerRename = (payload, menu) => {
  var itemId = menu.dataset && menu.dataset.id;
  if (itemId) {
    store.dispatch({ type: "FILERENAME_START", payload: itemId });
  }
};

export const explorerDelete = (payload, menu) => {
  var itemId = menu.dataset && menu.dataset.id;
  if (itemId) {
    store.dispatch({ type: "FILEDELETE_START", payload: itemId });
  }
};

export const explorerOpenItem = (payload, menu) => {
  var itemId = menu.dataset && menu.dataset.id;
  if (itemId) {
    handleFileOpen(itemId);
  }
};

export const explorerProps = () => {
  var cdir = store.getState().files.cdir;
  var item = store.getState().files.data.getId(cdir);
  if (item) {
    alert(
      `Name: ${item.name}\nType: ${item.type}\nItems: ${
        item.data ? item.data.length : 0
      }\nPath: ${store.getState().files.cpath}`
    );
  }
};

export const explorerItemProps = (payload, menu) => {
  var itemId = menu.dataset && menu.dataset.id;
  if (itemId) {
    var item = store.getState().files.data.getId(itemId);
    if (item) {
      var path = store.getState().files.data.getPath(itemId);
      alert(
        `Name: ${item.name}\nType: ${item.type}\n${
          item.type === "folder" ? `Items: ${item.data.length}` : ""
        }\nPath: ${path}`
      );
    }
  }
};

export const explorerRefresh = () => {
  // Force a re-render by dispatching current dir
  var cdir = store.getState().files.cdir;
  store.dispatch({ type: "FILEDIR", payload: cdir });
};

export const flightMode = () => {
  store.dispatch({ type: "TOGGAIRPLNMD", payload: "" });
};
