import icons from "./apps";

const readStoredList = (key, fallback) => {
  const storedValue = localStorage.getItem(key);
  if (!storedValue) return fallback;

  try {
    return JSON.parse(storedValue);
  } catch (error) {
    return fallback;
  }
};

const seedStoredApps = (storageKey, seedKey, entries, list) => {
  if (localStorage.getItem(seedKey) === "true") {
    return list;
  }

  const mergedList = [...list];
  let changed = false;

  entries.forEach((entry) => {
    if (!mergedList.includes(entry)) {
      mergedList.push(entry);
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem(storageKey, JSON.stringify(mergedList));
  }

  localStorage.setItem(seedKey, "true");
  return mergedList;
};

const replaceStoredAppName = (storageKey, seedKey, fromName, toName, list) => {
  if (localStorage.getItem(seedKey) === "true") {
    return list;
  }

  const replacedList = list.map((entry) =>
    entry === fromName ? toName : entry
  );
  const uniqueList = [...new Set(replacedList)];
  const changed =
    uniqueList.length !== list.length ||
    uniqueList.some((entry, index) => entry !== list[index]);

  if (changed) {
    localStorage.setItem(storageKey, JSON.stringify(uniqueList));
  }

  localStorage.setItem(seedKey, "true");
  return uniqueList;
};

var { taskbar, desktop, pinned, recent } = {
  taskbar: readStoredList("taskbar", [
    "Configurações",
    "Explorador de Arquivos",
    "Navegador",
    "Loja",
    "Chat da Turma",
  ]),
  desktop: readStoredList("desktop", [
    "Usuário",
    "Lixeira",
    "Explorador de Arquivos",
    "Loja",
    "Navegador",
    "Digitação",
    "Digitação Kids",
    "ITB Ouro Moderno",
    "Atalhos",
    "Avaliação",
    "Lições",
    "Montagem de PC",
  ]),
  pinned: readStoredList("pinned", [
    "Navegador",
    "Começar",
    "Gerenciador de Tarefas",
    "Email",
    "Configurações",
    "Loja",
    "Word",
    "Bloco de Notas",
    "Calculadora",
    "Digitação",
    "Digitação Kids",
    "Explorador de Arquivos",
    "Terminal",
    "Câmera",
    "Gestor",
  ]),
  recent: readStoredList("recent", [
    "Email",
    "Terminal",
    "Explorador de Arquivos",
    "Navegador",
  ]),
};

desktop = replaceStoredAppName(
  "desktop",
  "desktop-rename-itb-ouro-moderno-v1",
  "ITB Curso",
  "ITB Ouro Moderno",
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-itb-ouro-moderno-v1",
  ["ITB Ouro Moderno"],
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-atalhos-v1",
  ["Atalhos"],
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-gestor-v1",
  ["Gestor"],
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-attendance-v1",
  ["Frequência"],
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-booklets-v1",
  ["Apostilas"],
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-exam-v1",
  ["Avaliação"],
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-lessons-v1",
  ["Lições"],
  desktop
);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-pc-builder-v1",
  ["Montagem de PC"],
  desktop
);

desktop = seedStoredApps("desktop", "desktop-seed-word-v1", ["Word"], desktop);

desktop = seedStoredApps(
  "desktop",
  "desktop-seed-imagegen-v1",
  ["Gerador de Imagens"],
  desktop
);

export const taskApps = icons.filter((x) => taskbar.includes(x.name));

export const desktopApps = icons
  .filter((x) => desktop.includes(x.name))
  .sort((a, b) => {
    return desktop.indexOf(a.name) > desktop.indexOf(b.name) ? 1 : -1;
  });

export const pinnedApps = icons
  .filter((x) => pinned.includes(x.name))
  .sort((a, b) => {
    return pinned.indexOf(a.name) > pinned.indexOf(b.name) ? 1 : -1;
  });

export const recentApps = icons
  .filter((x) => recent.includes(x.name))
  .sort((a, b) => {
    return recent.indexOf(a.name) > recent.indexOf(b.name) ? 1 : -1;
  });

export const allApps = icons.filter((app) => {
  return app.type === "app";
});

export const dfApps = {
  taskbar,
  desktop,
  pinned,
  recent,
};
