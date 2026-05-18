const defState = {
  hide: true,
  top: 80,
  left: 360,
  opts: "desk",
  attr: null,
  dataset: null,
  data: {
    desk: {
      width: "310px",
      secwid: "200px",
    },
    task: {
      width: "220px",
      secwid: "120px",
      ispace: false, // show the space for icons in menu
    },
    app: {
      width: "310px",
      secwid: "200px",
    },
    explorer: {
      width: "310px",
      secwid: "200px",
    },
    explorerItem: {
      width: "280px",
      secwid: "180px",
    },
  },
  menus: {
    desk: [
      {
        name: "Exibir",
        icon: "view",
        type: "svg",
        opts: [
          {
            name: "Ícones grandes",
            action: "changeIconSize",
            payload: "large",
          },
          {
            name: "Ícones médios",
            action: "changeIconSize",
            payload: "medium",
          },
          {
            name: "Ícones pequenos",
            action: "changeIconSize",
            payload: "small",
            dot: true,
          },
          {
            type: "hr",
          },
          {
            name: "Mostrar ícones da área de trabalho",
            action: "deskHide",
            check: true,
          },
        ],
      },
      {
        name: "Classificar por",
        icon: "sort",
        type: "svg",
        opts: [
          {
            name: "Nome",
            action: "changeSort",
            payload: "name",
          },
          {
            name: "Tamanho",
            action: "changeSort",
            payload: "size",
          },
          {
            name: "Data de modificação",
            action: "changeSort",
            payload: "date",
          },
        ],
      },
      {
        name: "Atualizar",
        action: "refresh",
        type: "svg",
        icon: "refresh",
      },
      {
        type: "hr",
      },
      {
        name: "Novo",
        icon: "New",
        type: "svg",
        opts: [
          {
            name: "Pasta",
          },
          {
            name: "Atalho",
          },
          {
            name: "Documento de Texto",
          },
          {
            name: "Pasta Compactada (zipada)",
          },
        ],
      },
      {
        type: "hr",
      },
      {
        name: "Configurações de exibição",
        icon: "display",
        type: "svg",
        action: "SETTINGS",
        payload: "full",
      },
      {
        name: "Personalizar",
        icon: "personalize",
        type: "svg",
        action: "SETTINGS",
        payload: "full",
      },
      {
        type: "hr",
      },
      {
        name: "Próxima tela de fundo da área de trabalho",
        action: "WALLNEXT",
      },
      {
        name: "Abrir no Terminal",
        icon: "terminal",
        action: "OPENTERM",
        payload: "C:\\Users\\Blue\\Desktop",
      },
      {
        name: "Sobre",
        action: "DESKABOUT",
        icon: "win/info",
        payload: true,
      },
    ],
    task: [
      {
        name: "Alinhar ícones",
        opts: [
          {
            name: "Esquerda",
            action: "changeTaskAlign",
            payload: "left",
          },
          {
            name: "Centro",
            action: "changeTaskAlign",
            payload: "center",
            dot: true,
          },
        ],
      },
      {
        type: "hr",
      },
      {
        name: "Pesquisar",
        opts: [
          {
            name: "Mostrar",
            action: "TASKSRCH",
            payload: true,
          },
          {
            name: "Ocultar",
            action: "TASKSRCH",
            payload: false,
          },
        ],
      },
      {
        name: "Widgets",
        opts: [
          {
            name: "Mostrar",
            action: "TASKWIDG",
            payload: true,
          },
          {
            name: "Ocultar",
            action: "TASKWIDG",
            payload: false,
          },
        ],
      },
      {
        type: "hr",
      },
      {
        name: "Mostrar Área de Trabalho",
        action: "SHOWDSK",
      },
    ],
    app: [
      {
        name: "Abrir",
        action: "performApp",
        payload: "open",
      },
      {
        name: "Executar como administrador",
        action: "performApp",
        payload: "open",
        icon: "win/shield",
      },
      {
        name: "Abrir local do arquivo",
        dsb: true,
      },
      {
        name: "Fixar na barra de tarefas",
        action: "performApp",
        payload: "pintotaskbar",
      },
      {
        name: "Desafixar da barra de tarefas",
        action: "performApp",
        payload: "unpintaskbar",
      },
      {
        name: "Desafixar do início",
        dsb: true,
      },
      {
        name: "Compactar para arquivo Zip",
        dsb: true,
      },
      {
        name: "Copiar como caminho",
        dsb: true,
      },
      {
        name: "Propriedades",
        dsb: true,
      },
      {
        type: "hr",
      },
      {
        name: "Excluir atalho",
        action: "performApp",
        payload: "delshort",
      },
      {
        name: "Excluir",
        action: "delApp",
        payload: "delete",
      },
    ],
    explorer: [
      {
        name: "Exibir",
        icon: "view",
        type: "svg",
        opts: [
          {
            name: "Ícones grandes",
            action: "FILEVIEW",
            payload: "1",
          },
          {
            name: "Detalhes",
            action: "FILEVIEW",
            payload: "5",
          },
        ],
      },
      {
        type: "hr",
      },
      {
        name: "Novo",
        icon: "New",
        type: "svg",
        opts: [
          {
            name: "Pasta",
            action: "explorerNewFolder",
          },
          {
            name: "Documento de Texto",
            action: "explorerNewFile",
          },
        ],
      },
      {
        type: "hr",
      },
      {
        name: "Paste",
        icon: "paste",
        action: "explorerPaste",
      },
      {
        type: "hr",
      },
      {
        name: "Atualizar",
        action: "explorerRefresh",
        icon: "refresh",
        type: "svg",
      },
      {
        name: "Propriedades",
        action: "explorerProps",
      },
    ],
    explorerItem: [
      {
        name: "Abrir",
        action: "explorerOpenItem",
      },
      {
        type: "hr",
      },
      {
        name: "Recortar",
        icon: "cut",
        action: "explorerCut",
      },
      {
        name: "Copiar",
        icon: "copy",
        action: "explorerCopy",
      },
      {
        type: "hr",
      },
      {
        name: "Renomear",
        icon: "rename",
        action: "explorerRename",
      },
      {
        name: "Excluir",
        action: "explorerDelete",
      },
      {
        type: "hr",
      },
      {
        name: "Propriedades",
        action: "explorerItemProps",
      },
    ],
  },
};

const menusReducer = (state = defState, action) => {
  var tmpState = {
    ...state,
  };
  if (action.type == "MENUHIDE") {
    tmpState.hide = true;
  } else if (action.type == "MENUSHOW") {
    tmpState.hide = false;
    tmpState.top = (action.payload && action.payload.top) || 272;
    tmpState.left = (action.payload && action.payload.left) || 430;
    tmpState.opts = (action.payload && action.payload.menu) || "desk";
    tmpState.attr = action.payload && action.payload.attr;
    tmpState.dataset = action.payload && action.payload.dataset;
  } else if (action.type == "MENUCHNG") {
    tmpState = {
      ...action.payload,
    };
  }

  return tmpState;
};

export default menusReducer;
