export default {
  id: "terminal",
  title: "Terminal",
  icon: "terminal",
  items: [
    { id: "ctrl-c-term", name: "Interromper comando", combo: ["Ctrl", "C"] },
    { id: "ctrl-l", name: "Limpar tela", combo: ["Ctrl", "L"] },
    { id: "up-arrow-term", name: "Comando anterior", combo: ["↑"] },
    { id: "down-arrow-term", name: "Próximo comando", combo: ["↓"] },
    { id: "ctrl-u-term", name: "Apagar linha inteira", combo: ["Ctrl", "U"] },
    { id: "ctrl-a-term", name: "Início da linha", combo: ["Ctrl", "A"] },
    { id: "ctrl-e-term", name: "Fim da linha", combo: ["Ctrl", "E"] },
    { id: "ctrl-r-term", name: "Busca no histórico", combo: ["Ctrl", "R"] },
  ],
};
