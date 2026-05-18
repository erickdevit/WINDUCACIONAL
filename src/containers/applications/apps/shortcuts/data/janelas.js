export default {
  id: "janelas",
  title: "Janelas",
  icon: "janelas",
  items: [
    { id: "alt-tab", name: "Alternar janelas", combo: ["Alt", "Tab"] },
    { id: "alt-f4", name: "Fechar janela", combo: ["Alt", "F4"] },
    {
      id: "ctrl-shift-esc",
      name: "Gerenciador de Tarefas",
      combo: ["Ctrl", "Shift", "Esc"],
    },
    { id: "win-up", name: "Maximizar janela", combo: ["Windows", "↑"] },
    { id: "win-down", name: "Restaurar / minimizar", combo: ["Windows", "↓"] },
    { id: "win-left", name: "Fixar à esquerda", combo: ["Windows", "←"] },
    { id: "win-right", name: "Fixar à direita", combo: ["Windows", "→"] },
    { id: "alt-esc", name: "Circular janelas", combo: ["Alt", "Esc"] },
    { id: "win-tab", name: "Visão de tarefas", combo: ["Windows", "Tab"] },
  ],
};
