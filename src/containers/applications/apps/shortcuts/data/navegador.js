export default {
  id: "navegador",
  title: "Navegador",
  icon: "navegador",
  items: [
    { id: "ctrl-t", name: "Nova aba", combo: ["Ctrl", "T"] },
    { id: "ctrl-w", name: "Fechar aba", combo: ["Ctrl", "W"] },
    {
      id: "ctrl-shift-t",
      name: "Reabrir aba fechada",
      combo: ["Ctrl", "Shift", "T"],
    },
    { id: "ctrl-r", name: "Recarregar", combo: ["Ctrl", "R"] },
    {
      id: "ctrl-shift-r",
      name: "Recarregar sem cache",
      combo: ["Ctrl", "Shift", "R"],
    },
    { id: "ctrl-n", name: "Nova janela", combo: ["Ctrl", "N"] },
    {
      id: "ctrl-shift-n",
      name: "Janela anônima",
      combo: ["Ctrl", "Shift", "N"],
    },
    { id: "alt-left", name: "Voltar página", combo: ["Alt", "←"] },
    { id: "alt-right", name: "Avançar página", combo: ["Alt", "→"] },
    { id: "ctrl-j", name: "Downloads", combo: ["Ctrl", "J"] },
    { id: "ctrl-h-nav", name: "Histórico", combo: ["Ctrl", "H"] },
    { id: "f11", name: "Tela cheia", combo: ["F11"] },
  ],
};
