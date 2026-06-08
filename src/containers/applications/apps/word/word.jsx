import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import "./word.scss";
import { Icon } from "../../../../utils/general";

export const Word = () => {
  const wnapp = useSelector((state) => state.apps.winWord);
  const files = useSelector((state) => state.files);
  const dispatch = useDispatch();

  const editorRef = useRef(null);
  const [fileName, setFileName] = useState("Documento 1");
  const [currentFileId, setCurrentFileId] = useState(null);

  // Estados adicionais para a refatoração completa
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [backstageTab, setBackstageTab] = useState("info"); // info, rename
  const [zoom, setZoom] = useState(100);
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [localClipboard, setLocalClipboard] = useState(null);
  const [renameInput, setRenameInput] = useState("");
  const [activeFormat, setActiveFormat] = useState("Normal"); // Normal, Heading1

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    subscript: false,
    superscript: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    fontName: "Aptos",
    fontSize: "3", // Valor padrão da API execCommand correspondente a 12pt (3)
    foreColor: "#000000",
    hiliteColor: "#ffffff",
  });

  // Carrega o arquivo do Redux se fornecido pelo payload (ex.: abrindo do Explorer)
  useEffect(() => {
    if (
      wnapp &&
      wnapp.payload &&
      typeof wnapp.payload === "string" &&
      wnapp.payload !== "full"
    ) {
      const fileItem = files.data.getId(wnapp.payload);
      if (fileItem) {
        if (editorRef.current) {
          editorRef.current.innerHTML = fileItem.data || "";
        }
        setFileName(fileItem.name.replace(/\.docx$/i, ""));
        setCurrentFileId(fileItem.id);

        // Pequeno delay para atualizar metadados após injeção de HTML
        setTimeout(() => {
          calculateWordCount();
          calculatePageCount();
        }, 100);
      }
    }
  }, [wnapp?.payload, files.data]);

  // Monitora alterações nas janelas de diálogo de arquivos
  const prevDialogRef = useRef(null);
  useEffect(() => {
    const dialog = files.fileDialog;

    // Tratamento de salvamento concluído
    if (
      prevDialogRef.current &&
      prevDialogRef.current.caller === "word" &&
      prevDialogRef.current.mode === "save" &&
      dialog === null
    ) {
      const savedName = prevDialogRef.current.fileName || "Documento 1";
      const cleaned = savedName.replace(/\.docx$/i, "");
      setFileName(cleaned);

      const parentDirId = prevDialogRef.current.parentId || files.cdir;
      const folder = files.data.getId(parentDirId);
      if (folder && folder.data) {
        const fileItem = folder.data.find(
          (x) =>
            x.name.toLowerCase() === (cleaned + ".docx").toLowerCase() ||
            x.name.toLowerCase() === cleaned.toLowerCase()
        );
        if (fileItem) {
          setCurrentFileId(fileItem.id);
        }
      }
    }

    // Tratamento de abertura de arquivo concluído
    if (
      prevDialogRef.current &&
      prevDialogRef.current.caller === "word" &&
      prevDialogRef.current.mode === "open" &&
      dialog === null
    ) {
      const openedName = prevDialogRef.current.fileName || "";
      const parentDirId = prevDialogRef.current.cdir;
      if (openedName && parentDirId) {
        const folder = files.data.getId(parentDirId);
        if (folder && folder.data) {
          const fileItem = folder.data.find(
            (x) =>
              x.name.toLowerCase() === (openedName + ".docx").toLowerCase() ||
              x.name.toLowerCase() === openedName.toLowerCase()
          );
          if (fileItem) {
            if (editorRef.current) {
              editorRef.current.innerHTML = fileItem.data || "";
            }
            setFileName(fileItem.name.replace(/\.docx$/i, ""));
            setCurrentFileId(fileItem.id);
            setTimeout(() => {
              calculateWordCount();
              calculatePageCount();
            }, 100);
          }
        }
      }
    }
    prevDialogRef.current = dialog;
  }, [files.fileDialog]);

  // Fecha o menu de contexto ao clicar em qualquer lugar
  useEffect(() => {
    const closeMenu = () => {
      setContextMenu((prev) =>
        prev.visible ? { ...prev, visible: false } : prev
      );
    };
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  // Monitora alterações de seleção no documento
  useEffect(() => {
    const onSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        updateActiveStyles();
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  const openSaveDialog = () => {
    dispatch({
      type: "FILEDIALOG_OPEN",
      payload: {
        mode: "save",
        fileName: fileName,
        caller: "word",
        ext: "docx",
        startDir: "%documents%",
        content: editorRef.current ? editorRef.current.innerHTML : "",
      },
    });
  };

  const openOpenDialog = () => {
    dispatch({
      type: "FILEDIALOG_OPEN",
      payload: {
        mode: "open",
        fileName: "",
        caller: "word",
        ext: "docx",
        startDir: "%documents%",
      },
    });
  };

  const handleSave = () => {
    if (currentFileId) {
      const fileItem = files.data.getId(currentFileId);
      if (fileItem) {
        fileItem.data = editorRef.current ? editorRef.current.innerHTML : "";
        dispatch({ type: "FILEDIR", payload: files.cdir });
        return;
      }
    }
    openSaveDialog();
  };

  const handleKeyDown = (e) => {
    const isMeta = e.ctrlKey || e.metaKey;
    if (isMeta && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSave();
    } else if (isMeta && e.key.toLowerCase() === "b") {
      e.preventDefault();
      execCmd("bold");
    } else if (isMeta && e.key.toLowerCase() === "i") {
      e.preventDefault();
      execCmd("italic");
    } else if (isMeta && e.key.toLowerCase() === "u") {
      e.preventDefault();
      execCmd("underline");
    } else if (isMeta && e.key.toLowerCase() === "c") {
      e.preventDefault();
      handleCopy();
    } else if (isMeta && e.key.toLowerCase() === "x") {
      e.preventDefault();
      handleCut();
    } else if (isMeta && e.key.toLowerCase() === "v") {
      e.preventDefault();
      handlePaste("normal");
    } else if (isMeta && e.shiftKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      handlePaste("text");
    } else if (isMeta && e.altKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      handlePaste("merge");
    } else if (isMeta && e.altKey && e.key.toLowerCase() === "m") {
      e.preventDefault();
      addComment();
    }
  };

  const execCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleEditorInteraction();
  };

  // Funções avançadas de Clipboard
  const handleCopy = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());

      const textVal = selection.toString();
      const htmlVal = container.innerHTML;

      setLocalClipboard({
        html: htmlVal,
        text: textVal,
      });

      try {
        navigator.clipboard.writeText(textVal);
      } catch (err) {}
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleCut = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());

      const textVal = selection.toString();
      const htmlVal = container.innerHTML;

      setLocalClipboard({
        html: htmlVal,
        text: textVal,
      });

      try {
        navigator.clipboard.writeText(textVal);
      } catch (err) {}

      range.deleteContents();
      handleEditorInteraction();
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handlePaste = async (mode = "normal") => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    let htmlContent = "";
    let textContent = "";

    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        textContent = text;
        htmlContent = text.replace(/\n/g, "<br>");
      }
    } catch (e) {
      if (localClipboard) {
        htmlContent = localClipboard.html;
        textContent = localClipboard.text;
      }
    }

    if (!htmlContent && localClipboard) {
      htmlContent = localClipboard.html;
      textContent = localClipboard.text;
    }

    if (htmlContent) {
      if (mode === "text") {
        document.execCommand("insertText", false, textContent);
      } else if (mode === "merge") {
        document.execCommand("insertText", false, textContent);
      } else {
        document.execCommand("insertHTML", false, htmlContent);
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
    handleEditorInteraction();
  };

  // Atualização dos estados de estilo ativos baseado na seleção
  const updateActiveStyles = () => {
    if (!editorRef.current) return;

    try {
      const bold = document.queryCommandState("bold");
      const italic = document.queryCommandState("italic");
      const underline = document.queryCommandState("underline");
      const strikeThrough = document.queryCommandState("strikeThrough");
      const subscript = document.queryCommandState("subscript");
      const superscript = document.queryCommandState("superscript");

      const alignLeft = document.queryCommandState("justifyLeft");
      const alignCenter = document.queryCommandState("justifyCenter");
      const alignRight = document.queryCommandState("justifyRight");
      const alignJustify = document.queryCommandState("justifyFull");

      let fontName = document.queryCommandValue("fontName");
      if (fontName) {
        fontName = fontName.replace(/['"]/g, "");
      } else {
        fontName = "Aptos";
      }

      let fontSize = document.queryCommandValue("fontSize");
      if (!fontSize) {
        fontSize = "3";
      }

      const foreColor = document.queryCommandValue("foreColor") || "#000000";
      const hiliteColor =
        document.queryCommandValue("backColor") ||
        document.queryCommandValue("hiliteColor") ||
        "#ffffff";

      setActiveStyles({
        bold,
        italic,
        underline,
        strikeThrough,
        subscript,
        superscript,
        alignLeft,
        alignCenter,
        alignRight,
        alignJustify,
        fontName,
        fontSize,
        foreColor,
        hiliteColor,
      });

      // Detecção do formato ativo (Normal ou Título 1)
      let format = "Normal";
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node = selection.getRangeAt(0).commonAncestorContainer;
        if (node.nodeType === 3) node = node.parentNode;
        let current = node;
        while (current && current !== editorRef.current) {
          if (
            current.tagName === "H1" ||
            current.tagName === "H2" ||
            current.tagName === "H3"
          ) {
            format = "Heading1";
            break;
          }
          current = current.parentNode;
        }
      }
      setActiveFormat(format);
    } catch (err) {
      console.warn("Failed to query editor styles", err);
    }
  };

  // Aumenta/Diminui tamanho da fonte sequencialmente
  const changeFontSize = (direction) => {
    const sizes = ["1", "2", "3", "4", "5", "6", "7"];
    const currentIndex = sizes.indexOf(activeStyles.fontSize);
    let nextIndex = currentIndex;

    if (direction === "increase" && currentIndex < sizes.length - 1) {
      nextIndex += 1;
    } else if (direction === "decrease" && currentIndex > 0) {
      nextIndex -= 1;
    }

    if (nextIndex !== currentIndex) {
      execCmd("fontSize", sizes[nextIndex]);
    }
  };

  const setHighlightColor = (color) => {
    document.execCommand("backColor", false, color);
    if (editorRef.current) editorRef.current.focus();
    handleEditorInteraction();
  };

  const setFontColor = (color) => {
    document.execCommand("foreColor", false, color);
    if (editorRef.current) editorRef.current.focus();
    handleEditorInteraction();
  };

  // Contagem de palavras e estimativa de páginas
  const calculateWordCount = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  const calculatePageCount = () => {
    if (!editorRef.current) return;
    const pageHeightPx = 1120; // Estimativa de altura de folha A4 no editor
    const scrollHeight = editorRef.current.scrollHeight;
    const pages = Math.max(1, Math.ceil(scrollHeight / pageHeightPx));
    setPageCount(pages);
  };

  const handleEditorInteraction = () => {
    updateActiveStyles();
    calculateWordCount();
    calculatePageCount();
  };

  // Funções extras do menu de contexto
  const translateSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      const translated = prompt(
        "Tradução Simulada (Português -> Inglês):\nOriginal: " + text,
        text + " (Translated)"
      );
      if (translated) {
        document.execCommand("insertText", false, translated);
      }
    } else {
      alert("Selecione algum texto primeiro para traduzir!");
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const addComment = () => {
    const commentText = prompt("Digite seu comentário:", "Revisar este trecho");
    if (commentText) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.className = "word-comment-highlight";
        span.title = `Comentário: ${commentText}`;
        span.style.backgroundColor = "#ffeb3b";
        span.style.borderBottom = "2px dotted #ff9800";
        span.appendChild(range.extractContents());
        range.insertNode(span);
        handleEditorInteraction();
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const setLineSpacing = (spacing) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let parent = range.commonAncestorContainer;
      if (parent.nodeType === 3) {
        parent = parent.parentNode;
      }
      if (parent === editorRef.current) {
        const div = document.createElement("div");
        div.style.lineHeight = spacing;
        div.appendChild(range.extractContents());
        range.insertNode(div);
      } else {
        parent.style.lineHeight = spacing;
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const applyStyle = (styleName) => {
    if (styleName === "Normal") {
      execCmd("formatBlock", "<p>");
      execCmd("fontName", "Aptos");
      execCmd("fontSize", "3"); // 12pt
      setFontColor("#000000");
    } else if (styleName === "NoSpacing") {
      execCmd("formatBlock", "<p>");
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let parent = selection.getRangeAt(0).commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode;
        if (parent && parent !== editorRef.current) {
          parent.style.marginBottom = "0px";
        }
      }
    } else if (styleName === "Heading1") {
      execCmd("formatBlock", "<h1>");
      setFontColor("#185abd");
      execCmd("fontName", "Aptos Display");
      execCmd("fontSize", "5"); // 16pt
    }
  };

  const handleContextMenu = (e) => {
    if (editorRef.current && editorRef.current.contains(e.target)) {
      e.preventDefault();

      const menuWidth = 260;
      const menuHeight = 320;
      let posX = e.clientX;
      let posY = e.clientY;

      if (posX + menuWidth > window.innerWidth) {
        posX = window.innerWidth - menuWidth - 10;
      }
      if (posY + menuHeight > window.innerHeight) {
        posY = window.innerHeight - menuHeight - 10;
      }

      setContextMenu({
        visible: true,
        x: posX,
        y: posY,
      });
      updateActiveStyles();
    }
  };

  const handleRename = () => {
    if (!renameInput.trim()) return;
    const cleaned = renameInput.trim().replace(/\.docx$/i, "");
    setFileName(cleaned);

    if (currentFileId) {
      const fileItem = files.data.getId(currentFileId);
      if (fileItem) {
        fileItem.name = cleaned + ".docx";
        dispatch({ type: "FILEDIR", payload: files.cdir });
      }
    }
    setRenameInput("");
    setFileMenuOpen(false);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Deseja realmente excluir este arquivo? Isso não poderá ser desfeito."
      )
    ) {
      if (currentFileId) {
        const fileItem = files.data.getId(currentFileId);
        if (fileItem && fileItem.host) {
          fileItem.host.data = fileItem.host.data.filter(
            (x) => x.id !== currentFileId
          );
          dispatch({ type: "FILEDIR", payload: files.cdir });
        }
      }
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setFileName("Documento 1");
      setCurrentFileId(null);
      setFileMenuOpen(false);
      setWordCount(0);
      setPageCount(1);
    }
  };

  const handlePrint = () => {
    const content = editorRef.current ? editorRef.current.innerHTML : "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body {
              font-family: 'Aptos', 'Calibri', sans-serif;
              padding: 2.54cm;
              color: #000;
              background: #fff;
            }
            h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
            h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
            h3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em; }
            p { margin-bottom: 1em; line-height: 1.5; }
            ul { list-style-type: disc; padding-left: 40px; margin-bottom: 1em; }
            ol { list-style-type: decimal; padding-left: 40px; margin-bottom: 1em; }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 1em;
            }
            td, th {
              border: 1px solid #ddd;
              padding: 8px;
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Manipulação de cliques na margem esquerda (Padding esquerdo do editor)
  const handleEditorClick = (e) => {
    if (!editorRef.current) return;

    const rect = editorRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;

    // Pega o padding left dinâmico do editor
    const style = window.getComputedStyle(editorRef.current);
    const paddingLeft = parseFloat(style.paddingLeft) || 96;

    // Se clicar dentro do padding esquerdo da folha
    if (relativeX >= 0 && relativeX < paddingLeft) {
      e.preventDefault();
      const clickCount = e.detail;
      const selection = window.getSelection();

      // Encontra o range correspondente à linha clicada
      const range = document.caretRangeFromPoint(
        rect.left + paddingLeft + 5,
        e.clientY
      );
      if (range) {
        if (clickCount === 1) {
          // 1 clique = Seleciona a linha inteira correspondente
          selection.removeAllRanges();
          selection.addRange(range);
          try {
            selection.modify("move", "backward", "lineboundary");
            selection.modify("extend", "forward", "lineboundary");
          } catch (err) {
            console.warn("Failed to select line", err);
          }
        } else if (clickCount === 2) {
          // 2 cliques = Seleciona o parágrafo sob o Y
          let node = range.startContainer;
          if (node.nodeType === 3) node = node.parentNode;

          let current = node;
          while (
            current &&
            current !== editorRef.current &&
            !["P", "DIV", "H1", "H2", "H3", "LI"].includes(current.tagName)
          ) {
            current = current.parentNode;
          }

          if (current && current !== editorRef.current) {
            const selectRange = document.createRange();
            selectRange.selectNodeContents(current);
            selection.removeAllRanges();
            selection.addRange(selectRange);
          }
        } else if (clickCount >= 3) {
          // 3 cliques = Seleciona tudo (Select All)
          const selectRange = document.createRange();
          selectRange.selectNodeContents(editorRef.current);
          selection.removeAllRanges();
          selection.addRange(selectRange);
        }
      }
      handleEditorInteraction();
    }
  };

  // Manipulação de movimento do cursor na margem esquerda (Padding esquerdo do editor)
  const handleEditorMouseMove = (e) => {
    if (!editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const style = window.getComputedStyle(editorRef.current);
    const paddingLeft = parseFloat(style.paddingLeft) || 96;

    if (relativeX >= 0 && relativeX < paddingLeft) {
      editorRef.current.style.cursor = "default"; // Seta padrão, indicando margem
    } else {
      editorRef.current.style.cursor = "text"; // I-beam para digitação
    }
  };

  if (!wnapp) return null;

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name={`${fileName} - Word`}
      className="wordApp light-office"
      rootProps={{
        onKeyDown: handleKeyDown,
      }}
      windowScreenClassName="flex flex-col bg-[#f3f2f1]"
      restWindowClassName="h-full flex-grow relative flex flex-col bg-[#f3f2f1]"
    >
      <div className="word-ribbon flex flex-col bg-[#f3f2f1] text-gray-800 select-none">
        {/* Fake Header Row */}
        <div className="flex items-center justify-between px-2 py-1 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-2 text-xs">
            <button
              className="hover:bg-gray-200 p-1.5 rounded cursor-pointer"
              onClick={() => {
                if (editorRef.current) editorRef.current.innerHTML = "";
                setFileName("Documento 1");
                setCurrentFileId(null);
                setWordCount(0);
                setPageCount(1);
              }}
              title="Novo Documento"
            >
              <Icon fafa="faFileAlt" width={14} color="#555" />
            </button>
            <button
              className="hover:bg-gray-200 p-1.5 rounded cursor-pointer"
              onClick={handleSave}
              title="Salvar (Ctrl+S)"
            >
              <Icon fafa="faSave" width={14} color="#555" />
            </button>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5 text-gray-600 font-semibold px-1 text-[11px]">
              <Icon fafa="faCloud" width={11} color="#107c41" />
              <span>Salvo</span>
            </div>
          </div>

          <div className="flex bg-gray-100 border border-gray-300 hover:bg-white rounded text-sm px-2 py-1 items-center space-x-2 w-1/3 max-w-[400px] cursor-text transition-colors">
            <Icon fafa="faSearch" width={12} color="#555" />
            <input
              type="text"
              placeholder="Pesquisar ferramentas, ajuda e mais (Alt + Q)"
              className="bg-transparent outline-none flex-grow text-xs placeholder-gray-500 text-gray-800"
            />
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 p-1 px-2 rounded">
              <div className="w-6 h-6 rounded-full bg-[#185abd] flex items-center justify-center text-white font-bold text-xs">
                EA
              </div>
            </div>
          </div>
        </div>

        {/* Ribbon Tabs */}
        <div className="flex items-center justify-between px-2 border-b border-gray-300 bg-white pt-1">
          <div className="flex text-xs space-x-1">
            <div
              className={`px-3 py-1.5 cursor-pointer rounded-t text-gray-700 ${
                fileMenuOpen ? "is-active" : "hover:bg-gray-100"
              }`}
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
            >
              Arquivo
            </div>
            <div
              className={`px-3 py-1.5 cursor-pointer font-semibold rounded-t ${
                !fileMenuOpen
                  ? "bg-[#f3f2f1] border-b-2 border-[#185abd] text-[#185abd]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setFileMenuOpen(false)}
            >
              Página Inicial
            </div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">
              Inserir
            </div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">
              Layout
            </div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">
              Referências
            </div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">
              Revisão
            </div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">
              Exibir
            </div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">
              Ajuda
            </div>
          </div>

          <div className="flex text-xs space-x-2 pb-1">
            <div className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100 px-3 py-1 rounded text-gray-700 border border-gray-300">
              <Icon fafa="faComment" width={12} />
              <span>Comentários</span>
            </div>
            <div className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100 px-3 py-1 rounded text-gray-700 border border-gray-300">
              <Icon fafa="faPen" width={12} />
              <span>Edição</span>
            </div>
            <div className="flex items-center space-x-1 cursor-pointer bg-[#185abd] hover:bg-[#1a66d6] px-4 py-1 rounded text-white font-semibold">
              <Icon fafa="faShare" width={12} color="#fff" />
              <span>Compartilhar</span>
            </div>
          </div>
        </div>

        {/* Ribbon Content (Home) */}
        <div className="flex items-stretch px-2 py-2 gap-2 bg-[#f3f2f1] text-xs shadow-sm z-10 overflow-x-auto word-ribbon-content border-b border-gray-300">
          {/* Clipboard */}
          <div className="flex items-stretch pr-2 border-r border-gray-300 space-x-1 shrink-0">
            <button
              className="flex flex-col items-center justify-center p-1 hover:bg-gray-200 rounded w-12"
              title="Colar"
              onClick={() => handlePaste("normal")}
            >
              <Icon fafa="faPaste" width={22} color="#e5a100" />
              <span className="mt-1 text-[11px] text-gray-700">Colar</span>
            </button>
            <div className="flex flex-col justify-center space-y-1">
              <button
                className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"
                title="Recortar"
                onClick={handleCut}
              >
                <Icon fafa="faCut" width={12} color="#555" />
                <span className="text-gray-700">Recortar</span>
              </button>
              <button
                className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"
                title="Copiar"
                onClick={handleCopy}
              >
                <Icon fafa="faCopy" width={12} color="#555" />
                <span className="text-gray-700">Copiar</span>
              </button>
              <button
                className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"
                title="Pincel de Formatação"
                onClick={() => alert("Pincel de Formatação simulado")}
              >
                <Icon fafa="faPaintBrush" width={12} color="#555" />
                <span className="text-gray-700">Pincel</span>
              </button>
            </div>
            <div className="flex items-end justify-center w-full mt-1 text-[10px] text-gray-500 pb-1">
              Área de Transferência
            </div>
          </div>

          {/* Font */}
          <div className="flex flex-col justify-between pr-2 border-r border-gray-300 shrink-0">
            <div className="flex items-center space-x-1 mb-1">
              <select
                className="bg-white border border-gray-300 hover:border-gray-400 rounded px-2 py-1 outline-none w-32 text-gray-800"
                value={activeStyles.fontName}
                onChange={(e) => execCmd("fontName", e.target.value)}
              >
                <option value="Aptos">Aptos (Corpo)</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Calibri">Calibri</option>
                <option value="Courier New">Courier</option>
              </select>
              <select
                className="bg-white border border-gray-300 hover:border-gray-400 rounded px-2 py-1 outline-none text-gray-800"
                value={activeStyles.fontSize}
                onChange={(e) => execCmd("fontSize", e.target.value)}
              >
                <option value="1">10</option>
                <option value="2">11</option>
                <option value="3">12</option>
                <option value="4">14</option>
                <option value="5">16</option>
                <option value="6">20</option>
                <option value="7">24</option>
              </select>
              <button
                className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center text-gray-700 font-serif"
                title="Aumentar Tamanho da Fonte"
                onClick={() => changeFontSize("increase")}
              >
                A<sup className="text-[8px] ml-0.5">^</sup>
              </button>
              <button
                className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center text-gray-700 font-serif text-[10px]"
                title="Diminuir Tamanho da Fonte"
                onClick={() => changeFontSize("decrease")}
              >
                A<sup className="text-[8px] ml-0.5">v</sup>
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <button
                className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center"
                onClick={() => execCmd("removeFormat")}
                title="Limpar Toda a Formatação"
              >
                <Icon fafa="faEraser" width={12} color="#555" />
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button
                className={`w-7 h-7 font-bold hover:bg-gray-200 rounded text-gray-800 ${
                  activeStyles.bold ? "is-active" : ""
                }`}
                onClick={() => execCmd("bold")}
                title="Negrito"
              >
                N
              </button>
              <button
                className={`w-7 h-7 italic hover:bg-gray-200 rounded font-serif text-gray-800 ${
                  activeStyles.italic ? "is-active" : ""
                }`}
                onClick={() => execCmd("italic")}
                title="Itálico"
              >
                I
              </button>
              <button
                className={`w-7 h-7 underline hover:bg-gray-200 rounded text-gray-800 ${
                  activeStyles.underline ? "is-active" : ""
                }`}
                onClick={() => execCmd("underline")}
                title="Sublinhado"
              >
                S
              </button>
              <button
                className={`w-7 h-7 line-through hover:bg-gray-200 rounded text-gray-800 ${
                  activeStyles.strikeThrough ? "is-active" : ""
                }`}
                onClick={() => execCmd("strikeThrough")}
                title="Tachado"
              >
                ab
              </button>
              <button
                className={`w-7 h-7 hover:bg-gray-200 rounded text-[11px] flex items-center justify-center text-gray-800 ${
                  activeStyles.subscript ? "is-active" : ""
                }`}
                onClick={() => execCmd("subscript")}
                title="Subscrito"
              >
                X<sub>2</sub>
              </button>
              <button
                className={`w-7 h-7 hover:bg-gray-200 rounded text-[11px] flex items-center justify-center text-gray-800 ${
                  activeStyles.superscript ? "is-active" : ""
                }`}
                onClick={() => execCmd("superscript")}
                title="Sobrescrito"
              >
                X<sup>2</sup>
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>

              <div
                className="flex flex-col ml-1 hover:bg-gray-200 rounded p-0.5 border border-transparent"
                title="Cor de Realce"
              >
                <input
                  type="color"
                  className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
                  value={
                    activeStyles.hiliteColor === "#ffffff"
                      ? "#ffff00"
                      : activeStyles.hiliteColor
                  }
                  onChange={(e) => setHighlightColor(e.target.value)}
                />
              </div>
              <div
                className="flex flex-col ml-1 hover:bg-gray-200 rounded p-0.5 border border-transparent"
                title="Cor da Fonte"
              >
                <input
                  type="color"
                  className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
                  value={activeStyles.foreColor}
                  onChange={(e) => setFontColor(e.target.value)}
                />
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">
              Fonte
            </div>
          </div>

          {/* Paragraph */}
          <div className="flex flex-col justify-between pr-2 border-r border-gray-300 shrink-0">
            <div className="flex items-center space-x-1 mb-1">
              <button
                className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center"
                onClick={() => execCmd("insertUnorderedList")}
                title="Marcadores"
              >
                <Icon fafa="faListUl" width={12} color="#555" />
              </button>
              <button
                className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center"
                onClick={() => execCmd("insertOrderedList")}
                title="Numeração"
              >
                <Icon fafa="faListOl" width={12} color="#555" />
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <button
                className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center"
                title="Diminuir Recuo"
                onClick={() => execCmd("outdent")}
              >
                <Icon
                  fafa="faIndent"
                  width={12}
                  flip="horizontal"
                  color="#555"
                />
              </button>
              <button
                className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center"
                title="Aumentar Recuo"
                onClick={() => execCmd("indent")}
              >
                <Icon fafa="faIndent" width={12} color="#555" />
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button
                className={`w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center ${
                  activeStyles.alignLeft ? "is-active" : ""
                }`}
                onClick={() => execCmd("justifyLeft")}
                title="Alinhar à Esquerda"
              >
                <Icon fafa="faAlignLeft" width={12} color="#555" />
              </button>
              <button
                className={`w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center ${
                  activeStyles.alignCenter ? "is-active" : ""
                }`}
                onClick={() => execCmd("justifyCenter")}
                title="Centralizar"
              >
                <Icon fafa="faAlignCenter" width={12} color="#555" />
              </button>
              <button
                className={`w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center ${
                  activeStyles.alignRight ? "is-active" : ""
                }`}
                onClick={() => execCmd("justifyRight")}
                title="Alinhar à Direita"
              >
                <Icon fafa="faAlignRight" width={12} color="#555" />
              </button>
              <button
                className={`w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center ${
                  activeStyles.alignJustify ? "is-active" : ""
                }`}
                onClick={() => execCmd("justifyFull")}
                title="Justificar"
              >
                <Icon fafa="faAlignJustify" width={12} color="#555" />
              </button>
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">
              Parágrafo
            </div>
          </div>

          {/* Styles */}
          <div className="flex flex-col justify-between pr-2 border-r border-gray-300 shrink-0">
            <div className="flex items-center space-x-1 mb-1 bg-white p-1 rounded h-[50px] border border-gray-200">
              <div
                className={`px-4 h-full border flex flex-col justify-center items-center rounded cursor-pointer ${
                  activeFormat === "Normal"
                    ? "is-active"
                    : "border-transparent hover:bg-gray-100"
                }`}
                onClick={() => applyStyle("Normal")}
                title="Estilo Normal"
              >
                <span className="text-[14px] font-sans">AaBbCc</span>
                <span className="text-[10px]">Normal</span>
              </div>
              <div
                className={`px-4 h-full border flex flex-col justify-center items-center rounded cursor-pointer ${
                  activeFormat === "NoSpacing"
                    ? "is-active"
                    : "border-transparent hover:bg-gray-100"
                }`}
                onClick={() => applyStyle("NoSpacing")}
                title="Sem Espaçamento de Parágrafo"
              >
                <span className="text-[14px] font-sans leading-tight">
                  AaBbCc
                </span>
                <span className="text-[10px]">Sem Espaço</span>
              </div>
              <div
                className={`px-4 h-full border flex flex-col justify-center items-center rounded cursor-pointer ${
                  activeFormat === "Heading1"
                    ? "is-active"
                    : "border-transparent hover:bg-gray-100"
                }`}
                onClick={() => applyStyle("Heading1")}
                title="Título nível 1"
              >
                <span className="text-[16px] font-bold font-sans">AaBbCc</span>
                <span className="text-[10px]">Título 1</span>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">
              Estilos
            </div>
          </div>

          {/* Editing, Voice, Editor */}
          <div className="flex items-stretch space-x-2 shrink-0">
            <div className="flex flex-col justify-center space-y-1 pr-2 border-r border-gray-300">
              <button
                className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"
                onClick={() => {
                  const term = prompt("Digite o termo a localizar:");
                  if (term && window.find) {
                    window.find(term);
                  }
                }}
              >
                <Icon fafa="faSearch" width={12} color="#555" />
                <span className="w-16 text-left text-gray-700">Localizar</span>
              </button>
              <button
                className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"
                onClick={() => alert("Substituir simulado")}
              >
                <Icon fafa="faExchangeAlt" width={12} color="#555" />
                <span className="w-16 text-left text-gray-700">Substituir</span>
              </button>
              <button
                className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"
                onClick={() => {
                  if (editorRef.current) {
                    const range = document.createRange();
                    range.selectNodeContents(editorRef.current);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    handleEditorInteraction();
                  }
                }}
              >
                <Icon fafa="faMousePointer" width={12} color="#555" />
                <span className="w-16 text-left text-gray-700">Selecionar</span>
              </button>
              <div className="text-center w-full mt-1 text-[10px] text-gray-500 pb-1">
                Edição
              </div>
            </div>

            <div className="flex flex-col justify-between items-center pr-2 border-r border-gray-300 px-2">
              <div
                className="flex flex-col justify-center items-center hover:bg-gray-200 cursor-pointer rounded p-2 h-full w-full"
                onClick={() =>
                  alert(
                    "O recurso Ditar (Voice-to-Text) não está disponível neste computador."
                  )
                }
              >
                <Icon fafa="faMicrophone" width={20} color="#555" />
                <span className="mt-1 text-gray-700">Ditar</span>
              </div>
              <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">
                Voz
              </div>
            </div>

            <div className="flex flex-col justify-between items-center px-2">
              <div
                className="flex flex-col justify-center items-center hover:bg-gray-200 cursor-pointer rounded p-2 h-full w-full"
                onClick={() =>
                  alert(
                    "O Editor do Office analisou o documento e não encontrou erros gramaticais."
                  )
                }
              >
                <Icon fafa="faPenSquare" width={22} color="#185abd" />
                <span className="mt-1 text-gray-700">Editor</span>
              </div>
              <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">
                Editor
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Space & Document Area */}
      <div
        className="flex-grow overflow-auto flex justify-center py-8 win11Scroll bg-[#e1dfdd] relative"
        onContextMenu={handleContextMenu}
      >
        {/* Backstage File Drawer overlay */}
        {fileMenuOpen && (
          <div className="word-backstage">
            <div className="backstage-sidebar">
              <div className="sidebar-header">
                <div className="text-sm font-semibold truncate text-[#185abd] mb-1">
                  {fileName}
                </div>
                <div className="status-text">
                  <Icon fafa="faCloud" width={10} color="#107c41" />
                  <span>Salvo automaticamente</span>
                </div>
              </div>

              <div
                className="sidebar-item"
                onClick={() => setFileMenuOpen(false)}
              >
                <Icon fafa="faArrowLeft" width={14} color="#185abd" />
                <span>Voltar ao Documento</span>
              </div>

              <div className="border-t border-gray-300 my-2"></div>

              <div
                className={`sidebar-item ${
                  backstageTab === "info" ? "active" : ""
                }`}
                onClick={() => setBackstageTab("info")}
              >
                <Icon fafa="faInfoCircle" width={14} />
                <span>Informações</span>
              </div>

              <div
                className="sidebar-item"
                onClick={() => {
                  if (editorRef.current) editorRef.current.innerHTML = "";
                  setFileName("Documento 1");
                  setCurrentFileId(null);
                  setWordCount(0);
                  setPageCount(1);
                  setFileMenuOpen(false);
                }}
              >
                <Icon fafa="faFile" width={14} />
                <span>Novo</span>
              </div>

              <div
                className="sidebar-item"
                onClick={() => {
                  openOpenDialog();
                  setFileMenuOpen(false);
                }}
              >
                <Icon fafa="faFolderOpen" width={14} />
                <span>Abrir</span>
              </div>

              <div
                className="sidebar-item"
                onClick={() => {
                  handleSave();
                  setFileMenuOpen(false);
                }}
              >
                <Icon fafa="faSave" width={14} />
                <span>Salvar</span>
              </div>

              <div
                className="sidebar-item"
                onClick={() => {
                  openSaveDialog();
                  setFileMenuOpen(false);
                }}
              >
                <Icon fafa="faSave" width={14} />
                <span>Salvar Como...</span>
              </div>

              <div
                className={`sidebar-item ${
                  backstageTab === "rename" ? "active" : ""
                }`}
                onClick={() => {
                  setBackstageTab("rename");
                  setRenameInput(fileName);
                }}
              >
                <Icon fafa="faPen" width={14} />
                <span>Renomear</span>
              </div>

              <div
                className="sidebar-item"
                onClick={() => {
                  handlePrint();
                  setFileMenuOpen(false);
                }}
              >
                <Icon fafa="faPrint" width={14} />
                <span>Imprimir</span>
              </div>

              <div className="border-t border-gray-300 my-2"></div>

              <div className="sidebar-item danger" onClick={handleDelete}>
                <Icon fafa="faTrash" width={14} color="#a80000" />
                <span>Excluir</span>
              </div>
            </div>

            <div className="backstage-content">
              {backstageTab === "info" && (
                <div>
                  <h2>Informações do Documento</h2>
                  <div className="bg-gray-50 border border-gray-200 rounded p-4 max-w-xl space-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="font-semibold text-gray-600">Nome:</span>
                      <span className="text-gray-800 font-mono">
                        {fileName}.docx
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="font-semibold text-gray-600">
                        Palavras:
                      </span>
                      <span className="text-gray-800">{wordCount}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="font-semibold text-gray-600">
                        Páginas estimadas:
                      </span>
                      <span className="text-gray-800">{pageCount}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="font-semibold text-gray-600">
                        Localização:
                      </span>
                      <span className="text-gray-800">
                        Documentos (Salvo em Nuvem)
                      </span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="font-semibold text-gray-600">
                        Status:
                      </span>
                      <span className="text-[#107c41] font-semibold flex items-center gap-1">
                        <Icon fafa="faCheck" width={10} color="#107c41" />{" "}
                        Sincronizado e Protegido
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {backstageTab === "rename" && (
                <div>
                  <h2>Renomear Documento</h2>
                  <div className="max-w-md space-y-4">
                    <div className="flex flex-col space-y-2">
                      <label className="text-xs text-gray-600 font-semibold">
                        Novo Nome:
                      </label>
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 outline-none text-sm focus:border-[#185abd]"
                        placeholder="Insira o nome do documento"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="bg-[#185abd] text-white px-4 py-2 rounded text-sm hover:bg-[#154b9f]"
                        onClick={handleRename}
                      >
                        Renomear
                      </button>
                      <button
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300"
                        onClick={() => setFileMenuOpen(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Context Menu + Mini Toolbar overlay */}
        {contextMenu.visible && (
          <div
            className="word-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mini Toolbar */}
            <div className="mini-toolbar">
              <select
                value={activeStyles.fontName}
                onChange={(e) => execCmd("fontName", e.target.value)}
                title="Nome da Fonte"
              >
                <option value="Aptos">Aptos</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Calibri">Calibri</option>
                <option value="Courier New">Courier</option>
              </select>

              <select
                value={activeStyles.fontSize}
                onChange={(e) => execCmd("fontSize", e.target.value)}
                title="Tamanho da Fonte"
              >
                <option value="1">10</option>
                <option value="2">11</option>
                <option value="3">12</option>
                <option value="4">14</option>
                <option value="5">16</option>
                <option value="6">20</option>
                <option value="7">24</option>
              </select>

              <div
                className={`toolbar-btn ${
                  activeStyles.bold ? "is-active" : ""
                }`}
                onClick={() => execCmd("bold")}
                title="Negrito"
              >
                N
              </div>
              <div
                className={`toolbar-btn ${
                  activeStyles.italic ? "is-active" : ""
                }`}
                onClick={() => execCmd("italic")}
                title="Itálico"
              >
                I
              </div>
              <div
                className={`toolbar-btn ${
                  activeStyles.underline ? "is-active" : ""
                }`}
                onClick={() => execCmd("underline")}
                title="Sublinhado"
              >
                S
              </div>

              <div className="color-picker-wrapper" title="Cor da Fonte">
                <input
                  type="color"
                  value={activeStyles.foreColor}
                  onChange={(e) => setFontColor(e.target.value)}
                />
              </div>

              <div className="color-picker-wrapper" title="Cor de Realce">
                <input
                  type="color"
                  value={
                    activeStyles.hiliteColor === "#ffffff"
                      ? "#ffff00"
                      : activeStyles.hiliteColor
                  }
                  onChange={(e) => setHighlightColor(e.target.value)}
                />
              </div>

              <div
                className="toolbar-btn"
                onClick={() => execCmd("insertUnorderedList")}
                title="Marcadores"
              >
                <Icon fafa="faListUl" width={10} color="#555" />
              </div>
            </div>

            {/* Context Menu Items */}
            <div className="menu-items">
              <div className="menu-item" onClick={handleCut}>
                <span className="item-label">
                  <Icon fafa="faCut" width={12} color="#555" /> Recortar
                </span>
                <span className="item-shortcut">Ctrl+X</span>
              </div>
              <div className="menu-item" onClick={handleCopy}>
                <span className="item-label">
                  <Icon fafa="faCopy" width={12} color="#555" /> Copiar
                </span>
                <span className="item-shortcut">Ctrl+C</span>
              </div>
              <div className="menu-item" onClick={() => handlePaste("normal")}>
                <span className="item-label">
                  <Icon fafa="faPaste" width={12} color="#e5a100" /> Colar
                </span>
                <span className="item-shortcut">Ctrl+V</span>
              </div>
              <div className="menu-item" onClick={() => handlePaste("text")}>
                <span className="item-label">
                  <Icon fafa="faPaste" width={12} color="#888" /> Colar Somente
                  Texto
                </span>
                <span className="item-shortcut">Ctrl+Shift+V</span>
              </div>
              <div className="menu-item" onClick={() => handlePaste("merge")}>
                <span className="item-label">
                  <Icon fafa="faPaste" width={12} color="#185abd" /> Colar
                  Mesclando Formatação
                </span>
                <span className="item-shortcut">Alt+V</span>
              </div>

              <div className="menu-item divider"></div>

              <div className="menu-item" onClick={translateSelection}>
                <span className="item-label">
                  <Icon fafa="faLanguage" width={12} color="#555" /> Traduzir
                </span>
              </div>

              <div
                className="menu-item"
                onClick={() =>
                  alert(
                    "Idioma selecionado para verificação ortográfica: Português (Brasil)"
                  )
                }
              >
                <span className="item-label">
                  <Icon fafa="faGlobe" width={12} color="#555" /> Idioma de
                  Revisão...
                </span>
              </div>

              <div
                className="menu-item"
                onClick={() => {
                  const spacing = prompt(
                    "Definir espaçamento entre linhas (ex: 1.0, 1.15, 1.5, 2.0):",
                    "1.15"
                  );
                  if (spacing) setLineSpacing(spacing);
                }}
              >
                <span className="item-label">
                  <Icon fafa="faSlidersH" width={12} color="#555" /> Opções de
                  Parágrafo...
                </span>
              </div>

              <div
                className="menu-item"
                onClick={() => {
                  const url = prompt("Digite o link da URL:", "https://");
                  if (url) execCmd("createLink", url);
                }}
              >
                <span className="item-label">
                  <Icon fafa="faLink" width={12} color="#555" /> Adicionar Link
                </span>
              </div>

              <div className="menu-item" onClick={addComment}>
                <span className="item-label">
                  <Icon fafa="faCommentMedical" width={12} color="#555" /> Novo
                  Comentário
                </span>
                <span className="item-shortcut">Ctrl+Alt+M</span>
              </div>
            </div>
          </div>
        )}

        {/* Zoom wrapper of A4 document page */}
        <div
          style={{
            zoom: zoom / 100,
            transformOrigin: "top center",
            width: "21cm",
            minHeight: "29.7cm",
            boxSizing: "border-box",
          }}
          className="word-page-zoom-container shadow-md"
        >
          <div
            ref={editorRef}
            className="word-page bg-white p-[2.54cm] focus:outline-none text-black font-['Aptos','Calibri',sans-serif] text-[11pt] min-h-[29.7cm]"
            contentEditable={true}
            style={{ boxSizing: "border-box", width: "100%", height: "100%" }}
            onMouseUp={handleEditorInteraction}
            onKeyUp={handleEditorInteraction}
            onFocus={updateActiveStyles}
            onInput={handleEditorInteraction}
            onClick={handleEditorClick}
            onMouseMove={handleEditorMouseMove}
          ></div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="word-status-bar flex items-center justify-between bg-[#f3f2f1] text-[#333] border-t border-gray-300 text-xs px-3 select-none">
        <div className="status-bar-left flex items-center space-x-2.5 py-1">
          <span>Página 1 de {pageCount}</span>
          <span className="text-gray-400">|</span>
          <span>{wordCount} palavras</span>
          <span className="text-gray-400">|</span>
          <span className="language-selector cursor-pointer hover:bg-gray-200 px-1 rounded">
            Português (Brasil)
          </span>
          <span className="text-gray-400">|</span>
          <span className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 px-1 rounded">
            <Icon fafa="faCheck" width={10} color="#107c41" /> Sugestões do
            Editor: Mostrando
          </span>
        </div>

        <div className="status-bar-right flex items-center space-x-2.5">
          <div className="view-modes flex items-center mr-2">
            <button
              className="view-mode-btn hover:bg-gray-200 p-1 rounded"
              title="Modo de Leitura"
            >
              <Icon fafa="faBookOpen" width={11} color="#555" />
            </button>
            <button
              className="view-mode-btn active hover:bg-gray-200 p-1 rounded bg-gray-200"
              title="Layout de Impressão"
            >
              <Icon fafa="faFileAlt" width={11} color="#185abd" />
            </button>
            <button
              className="view-mode-btn hover:bg-gray-200 p-1 rounded"
              title="Layout da Web"
            >
              <Icon fafa="faGlobe" width={11} color="#555" />
            </button>
          </div>

          <span className="text-gray-400">|</span>

          <div className="flex items-center">
            <button
              className="zoom-btn hover:bg-gray-200 px-1.5 rounded font-bold"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
            >
              -
            </button>
            <input
              type="range"
              min="50"
              max="150"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="zoom-slider mx-1 cursor-pointer w-20"
            />
            <button
              className="zoom-btn hover:bg-gray-200 px-1.5 rounded font-bold"
              onClick={() => setZoom(Math.min(150, zoom + 10))}
            >
              +
            </button>
            <span
              className="zoom-percent cursor-pointer hover:bg-gray-200 px-1.5 py-0.5 rounded font-semibold ml-1.5 min-w-[32px] text-right"
              onClick={() => setZoom(100)}
            >
              {zoom}%
            </span>
          </div>
        </div>
      </div>
    </AppWindow>
  );
};
