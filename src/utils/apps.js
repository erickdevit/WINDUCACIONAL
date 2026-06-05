export const gene_name = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

let installed = JSON.parse(localStorage.getItem("installed") || "[]");

const apps = [
  {
    name: "Start",
    icon: "home",
    type: "action",
    action: "STARTMENU",
  },
  {
    name: "Pesquisar",
    icon: "search",
    type: "action",
    action: "SEARCHMENU",
  },
  {
    name: "Widgets",
    icon: "widget",
    type: "action",
    action: "WIDGETS",
  },
  {
    name: "Configurações",
    icon: "settings",
    type: "app",
    action: "SETTINGS",
  },
  {
    name: "Gerenciador de Tarefas",
    icon: "taskmanager",
    type: "app",
    action: "TASKMANAGER",
  },
  {
    name: "Explorador de Arquivos",
    icon: "explorer",
    type: "app",
    action: "EXPLORER",
  },
  {
    name: "Navegador",
    icon: "edge",
    type: "app",
    action: "MSEDGE",
  },
  {
    name: "Loja",
    icon: "store",
    type: "app",
    action: "WNSTORE",
  },
  {
    name: "Lixeira",
    icon: "bin0",
    type: "app",
  },
  {
    name: "Usuário",
    icon: "win/user",
    type: "app",
    action: "EXPLORER",
  },
  {
    name: "Alarmes",
    icon: "alarm",
    type: "app",
  },
  {
    name: "Calculadora",
    icon: "calculator",
    type: "app",
    action: "CALCUAPP",
  },
  {
    name: "Calendário",
    icon: "calendar",
    type: "app",
  },
  {
    name: "Câmera",
    icon: "camera",
    type: "app",
    action: "CAMERA",
  },
  {
    name: "Seu Telefone",
    icon: "yphone",
    type: "app",
  },
  {
    name: "Comentários",
    icon: "feedback",
    type: "app",
  },
  {
    name: "Começar",
    icon: "getstarted",
    type: "app",
    action: "OOBE",
  },
  {
    name: "Groove Music",
    icon: "groove",
    type: "app",
  },
  {
    name: "Yammer",
    icon: "yammer",
    type: "app",
  },
  {
    name: "Email",
    icon: "mail",
    type: "app",
  },
  {
    name: "Filmes",
    icon: "movies",
    type: "app",
  },
  {
    name: "Xbox",
    icon: "xbox",
    type: "app",
  },
  {
    name: "Office",
    icon: "msoffice",
    type: "app",
  },
  {
    name: "Narrator",
    icon: "narrator",
    type: "app",
  },
  {
    name: "Notícias",
    icon: "news",
    type: "app",
  },
  {
    name: "Bloco de Notas",
    icon: "notepad",
    type: "app",
    action: "NOTEPAD",
  },
  {
    name: "Word",
    icon: "winWord",
    type: "app",
    action: "WORDAPP",
  },
  {
    name: "Notas Autoadesivas",
    icon: "notes",
    type: "app",
  },
  {
    name: "OneDrive",
    icon: "oneDrive",
    type: "app",
  },
  {
    name: "OneNote",
    icon: "onenote",
    type: "app",
  },
  {
    name: "Outlook",
    icon: "outlook",
    type: "app",
  },
  {
    name: "Pessoas",
    icon: "people",
    type: "app",
  },
  {
    name: "Fotos",
    icon: "photos",
    type: "app",
  },
  {
    name: "Segurança",
    icon: "security",
    type: "app",
  },
  {
    name: "Sharepoint",
    icon: "share",
    type: "app",
  },
  {
    name: "Skype",
    icon: "skype",
    type: "app",
  },
  {
    name: "Snipping Tool",
    icon: "snip",
    type: "app",
  },
  {
    name: "Teams",
    icon: "teams",
    type: "app",
  },
  {
    name: "Terminal",
    icon: "terminal",
    type: "app",
    action: "TERMINAL",
  },
  {
    name: "Dicas",
    icon: "tips",
    type: "app",
  },
  {
    name: "To Do",
    icon: "todo",
    type: "app",
  },
  {
    name: "Maps",
    icon: "maps",
    type: "app",
  },
  {
    name: "Gravador de Voz",
    icon: "voice",
    type: "app",
  },
  {
    name: "Clima",
    icon: "weather",
    type: "app",
  },
  {
    name: "Cortana",
    icon: "cortana",
    type: "app",
  },
  {
    name: "Digitação",
    icon: "typing",
    type: "app",
    action: "TYPINGAPP",
    studentAccess: "normal",
  },
  {
    name: "Digitação Kids",
    icon: "typingKids",
    type: "app",
    action: "TYPINGKIDS",
    studentAccess: "kids",
  },
  {
    name: "ITB Ouro Moderno",
    icon: "itbOuroModerno",
    type: "app",
    action: "ITBOUROMODERNO",
    pwa: true,
    data: {
      type: "IFrame",
      url: "https://itbcurso.shyr.it/",
    },
  },
  {
    name: "Chat da Turma",
    icon: "chat",
    type: "app",
    action: "CHATAPP",
  },
  {
    name: "Atalhos",
    icon: "atalhos",
    type: "app",
    action: "SHORTCUTSAPP",
  },
  {
    name: "Gestor",
    icon: "gestor",
    type: "app",
    action: "GESTORAPP",
    professorOnly: true,
  },
  {
    name: "Frequência",
    icon: "attendance",
    type: "app",
    action: "ATTENDANCEAPP",
  },
  {
    name: "Apostilas",
    icon: "booklets",
    type: "app",
    action: "BOOKLETSAPP",
  },
  {
    name: "Avaliação",
    icon: "exam",
    type: "app",
    action: "EXAMAPP",
  },
];

for (let i = 0; i < installed.length; i++) {
  installed[i].action = gene_name();
  apps.push(installed[i]);
}

export default apps;
