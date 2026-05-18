export default {
  id: "excel",
  title: "Excel",
  icon: "excel",
  items: [
    { id: "ctrl-n-e", name: "Nova pasta de trabalho", combo: ["Ctrl", "N"] },
    { id: "ctrl-s-e", name: "Salvar", combo: ["Ctrl", "S"] },
    { id: "ctrl-c-e", name: "Copiar", combo: ["Ctrl", "C"] },
    { id: "ctrl-v-e", name: "Colar", combo: ["Ctrl", "V"] },
    { id: "alt-enter", name: "Nova linha na célula", combo: ["Alt", "Enter"] },
    {
      id: "ctrl-shift-l",
      name: "Alternar filtro",
      combo: ["Ctrl", "Shift", "L"],
    },
    { id: "ctrl-arrow", name: "Mover até a borda", combo: ["Ctrl", "Setas"] },
    { id: "shift-space", name: "Selecionar linha", combo: ["Shift", "Espaço"] },
    { id: "ctrl-space", name: "Selecionar coluna", combo: ["Ctrl", "Espaço"] },
    { id: "ctrl-minus", name: "Excluir células", combo: ["Ctrl", "-"] },
    { id: "ctrl-plus", name: "Inserir células", combo: ["Ctrl", "Shift", "+"] },
  ],
};
