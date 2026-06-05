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
      }
    }
  }, [wnapp?.payload, files.data]);

  const prevDialogRef = useRef(null);
  useEffect(() => {
    const dialog = files.fileDialog;
    if (
      prevDialogRef.current &&
      prevDialogRef.current.caller === "word" &&
      prevDialogRef.current.mode === "save" &&
      dialog === null
    ) {
      const savedName = prevDialogRef.current.fileName || "Documento 1";
      setFileName(savedName.replace(/\.docx$/i, ""));
    }
    prevDialogRef.current = dialog;
  }, [files.fileDialog]);

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

  const handleSave = () => {
    if (currentFileId) {
      const fileItem = files.data.getId(currentFileId);
      if (fileItem) {
        fileItem.data = editorRef.current ? editorRef.current.innerHTML : "";
        dispatch({ type: "FILEDIR", payload: files.cdir }); // Triggers file save
        return;
      }
    }
    openSaveDialog();
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  const execCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  if (!wnapp) return null;

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name={`${fileName} - Word`}
      className="wordApp"
      rootProps={{
        onKeyDown: handleKeyDown,
      }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="h-full flex-grow relative flex flex-col bg-[#f3f2f1] dark:bg-[#202020]"
    >
      <div className="word-ribbon flex flex-col bg-white dark:bg-[#333333] border-b border-gray-200 dark:border-gray-700">
        <div className="flex text-xs pt-1 px-2 select-none space-x-4">
          <div className="pb-1 border-b-2 border-[#185abd] font-semibold cursor-pointer text-[#185abd] dark:text-blue-400">Página Inicial</div>
          <div className="pb-1 cursor-pointer hover:text-[#185abd]">Inserir</div>
          <div className="pb-1 cursor-pointer hover:text-[#185abd]">Layout</div>
        </div>
        <div className="flex flex-wrap items-center px-2 py-2 gap-2 bg-[#f3f2f1] dark:bg-[#2b2b2b]">
          <div className="flex items-center space-x-1 pr-2 border-r border-gray-300 dark:border-gray-600">
            <button title="Novo (Ctrl+N)" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={() => {
              if (editorRef.current) editorRef.current.innerHTML = "";
              setFileName("Documento 1");
              setCurrentFileId(null);
            }}>
               <Icon fafa="faFileAlt" width={14} />
            </button>
            <button title="Salvar (Ctrl+S)" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={handleSave}>
               <Icon fafa="faSave" width={14} />
            </button>
          </div>

          <div className="flex items-center space-x-1 pr-2 border-r border-gray-300 dark:border-gray-600">
            <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-[#444] dark:text-white" onChange={(e) => execCmd('fontName', e.target.value)}>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Calibri">Calibri</option>
              <option value="Courier New">Courier</option>
            </select>
            <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-[#444] dark:text-white" onChange={(e) => execCmd('fontSize', e.target.value)}>
              <option value="1">Pequeno</option>
              <option value="3">Médio</option>
              <option value="5">Grande</option>
              <option value="7">Gigante</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 pr-2 border-r border-gray-300 dark:border-gray-600">
            <button title="Negrito" className="w-7 h-7 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-800 dark:text-gray-200" onClick={() => execCmd('bold')}>N</button>
            <button title="Itálico" className="w-7 h-7 italic font-serif hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-800 dark:text-gray-200" onClick={() => execCmd('italic')}>I</button>
            <button title="Sublinhado" className="w-7 h-7 underline hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-800 dark:text-gray-200" onClick={() => execCmd('underline')}>S</button>
            <button title="Tachado" className="w-7 h-7 line-through hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-800 dark:text-gray-200" onClick={() => execCmd('strikeThrough')}>ab</button>
            
            <div className="flex flex-col ml-1">
              <input type="color" title="Cor do Texto" className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" onChange={(e) => execCmd('foreColor', e.target.value)} />
            </div>
            <div className="flex flex-col ml-1">
              <input type="color" title="Cor do Fundo" className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" defaultValue="#ffffff" onChange={(e) => execCmd('hiliteColor', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center space-x-1 pr-2 border-r border-gray-300 dark:border-gray-600">
            <button title="Alinhar à Esquerda" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={() => execCmd('justifyLeft')}>
               <Icon fafa="faAlignLeft" width={14} />
            </button>
            <button title="Centralizar" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={() => execCmd('justifyCenter')}>
               <Icon fafa="faAlignCenter" width={14} />
            </button>
            <button title="Alinhar à Direita" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={() => execCmd('justifyRight')}>
               <Icon fafa="faAlignRight" width={14} />
            </button>
            <button title="Justificar" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={() => execCmd('justifyFull')}>
               <Icon fafa="faAlignJustify" width={14} />
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button title="Lista com Marcadores" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={() => execCmd('insertUnorderedList')}>
               <Icon fafa="faListUl" width={14} />
            </button>
            <button title="Lista Numerada" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-200" onClick={() => execCmd('insertOrderedList')}>
               <Icon fafa="faListOl" width={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto flex justify-center py-6 win11Scroll bg-[#e1dfdd] dark:bg-[#111]">
        <div 
          ref={editorRef}
          className="word-page bg-white dark:bg-[#1f1f1f] shadow-md w-[21cm] min-h-[29.7cm] p-[2.54cm] focus:outline-none dark:text-gray-100 font-[Calibri] text-[11pt]"
          contentEditable={true}
          style={{ boxSizing: "border-box" }}
        ></div>
      </div>
    </AppWindow>
  );
};
