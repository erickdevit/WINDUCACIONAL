export default {
  id: "vscode",
  title: "VS Code",
  icon: "vscode",
  items: [
    { id: "ctrl-p-vs", name: "Pesquisar arquivo", combo: ["Ctrl", "P"] },
    {
      id: "ctrl-shift-p",
      name: "Paleta de comandos",
      combo: ["Ctrl", "Shift", "P"],
    },
    { id: "alt-up", name: "Mover linha acima", combo: ["Alt", "↑"] },
    { id: "alt-down", name: "Mover linha abaixo", combo: ["Alt", "↓"] },
    {
      id: "shift-alt-down",
      name: "Duplicar linha",
      combo: ["Shift", "Alt", "↓"],
    },
    { id: "ctrl-d-vs", name: "Selecionar próxima corr.", combo: ["Ctrl", "D"] },
    { id: "ctrl-space", name: "Sugerir código", combo: ["Ctrl", "Espaço"] },
    { id: "ctrl-slash", name: "Comentar linha", combo: ["Ctrl", "/"] },
    { id: "ctrl-b-vs", name: "Alternar barra lateral", combo: ["Ctrl", "B"] },
    { id: "f12-vs", name: "Ir para definição", combo: ["F12"] },
  ],
};
