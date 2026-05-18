export default {
  id: "discord",
  title: "Discord",
  icon: "discord",
  items: [
    { id: "alt-up-dc", name: "Canal anterior", combo: ["Alt", "↑"] },
    { id: "alt-down-dc", name: "Próximo canal", combo: ["Alt", "↓"] },
    { id: "ctrl-k-dc", name: "Busca de servidor/canal", combo: ["Ctrl", "K"] },
    {
      id: "shift-esc-dc",
      name: "Marcar servidor como lido",
      combo: ["Shift", "Esc"],
    },
    { id: "esc-dc", name: "Marcar canal como lido", combo: ["Esc"] },
    {
      id: "ctrl-shift-m",
      name: "Mutar microfone",
      combo: ["Ctrl", "Shift", "M"],
    },
    {
      id: "ctrl-shift-d",
      name: "Surdecer áudio",
      combo: ["Ctrl", "Shift", "D"],
    },
  ],
};
