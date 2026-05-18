export default {
  id: "explorer",
  title: "Explorador",
  icon: "explorer",
  items: [
    {
      id: "ctrl-shift-n-exp",
      name: "Nova pasta",
      combo: ["Ctrl", "Shift", "N"],
    },
    { id: "ctrl-n-exp", name: "Nova janela", combo: ["Ctrl", "N"] },
    { id: "ctrl-w-exp", name: "Fechar janela", combo: ["Ctrl", "W"] },
    {
      id: "alt-up-exp",
      name: "Subir um nível (Pasta acima)",
      combo: ["Alt", "↑"],
    },
    { id: "alt-left-exp", name: "Voltar", combo: ["Alt", "←"] },
    { id: "alt-right-exp", name: "Avançar", combo: ["Alt", "→"] },
    { id: "f2-exp", name: "Renomear arquivo/pasta", combo: ["F2"] },
    {
      id: "alt-enter-exp",
      name: "Propriedades do item",
      combo: ["Alt", "Enter"],
    },
    { id: "f3-exp", name: "Pesquisar", combo: ["F3"] },
    {
      id: "alt-d-exp",
      name: "Selecionar barra de endereços",
      combo: ["Alt", "D"],
    },
    { id: "f5-exp", name: "Atualizar (Recarregar)", combo: ["F5"] },
    { id: "alt-p-exp", name: "Painel de visualização", combo: ["Alt", "P"] },
    {
      id: "alt-shift-p-exp",
      name: "Painel de detalhes",
      combo: ["Alt", "Shift", "P"],
    },
  ],
};
