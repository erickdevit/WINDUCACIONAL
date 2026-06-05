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
      className="wordApp light-office"
      rootProps={{
        onKeyDown: handleKeyDown,
      }}
      windowScreenClassName="flex flex-col bg-[#f3f2f1]"
      restWindowClassName="h-full flex-grow relative flex flex-col bg-[#f3f2f1]"
    >
      <div className="word-ribbon flex flex-col bg-[#f3f2f1] text-gray-800 select-none">
        {/* Header Fake Row (Search, User) */}
        <div className="flex items-center justify-between px-2 py-1 bg-white">
          <div className="flex items-center space-x-2 text-xs">
            <button className="hover:bg-gray-200 p-1.5 rounded cursor-pointer" onClick={() => {
              if (editorRef.current) editorRef.current.innerHTML = "";
              setFileName("Documento 1");
              setCurrentFileId(null);
            }} title="Novo Documento">
              <Icon fafa="faFileAlt" width={14} color="#555" />
            </button>
            <button className="hover:bg-gray-200 p-1.5 rounded cursor-pointer" onClick={handleSave} title="Salvar (Ctrl+S)">
              <Icon fafa="faSave" width={14} color="#555" />
            </button>
          </div>

          <div className="flex bg-gray-100 border border-gray-300 hover:bg-white rounded text-sm px-2 py-1 items-center space-x-2 w-1/3 max-w-[400px] cursor-text transition-colors">
            <Icon fafa="faSearch" width={12} color="#555" />
            <input type="text" placeholder="Pesquisar ferramentas, ajuda e mais (Alt + Q)" className="bg-transparent outline-none flex-grow text-xs placeholder-gray-500 text-gray-800" />
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 p-1 px-2 rounded">
              <div className="w-6 h-6 rounded-full bg-[#185abd] flex items-center justify-center text-white font-bold text-xs">EA</div>
            </div>
          </div>
        </div>

        {/* Ribbon Tabs */}
        <div className="flex items-center justify-between px-2 border-b border-gray-300 bg-white pt-1">
          <div className="flex text-xs space-x-1">
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">Arquivo</div>
            <div className="px-3 py-1.5 cursor-pointer bg-[#f3f2f1] border-b-2 border-[#185abd] font-semibold rounded-t text-[#185abd]">Página Inicial</div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">Inserir</div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">Layout</div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">Referências</div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">Revisão</div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">Exibir</div>
            <div className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 rounded-t text-gray-700">Ajuda</div>
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
            <button className="flex flex-col items-center justify-center p-1 hover:bg-gray-200 rounded w-12" title="Colar" onClick={() => execCmd('paste')}>
              <Icon fafa="faPaste" width={22} color="#e5a100" />
              <span className="mt-1 text-[11px] text-gray-700">Colar</span>
            </button>
            <div className="flex flex-col justify-center space-y-1">
              <button className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5" title="Recortar" onClick={() => execCmd('cut')}>
                <Icon fafa="faCut" width={12} color="#555" /><span className="text-gray-700">Recortar</span>
              </button>
              <button className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5" title="Copiar" onClick={() => execCmd('copy')}>
                <Icon fafa="faCopy" width={12} color="#555" /><span className="text-gray-700">Copiar</span>
              </button>
              <button className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5" title="Pincel de Formatação">
                <Icon fafa="faPaintBrush" width={12} color="#555" /><span className="text-gray-700">Pincel</span>
              </button>
            </div>
            <div className="flex items-end justify-center w-full mt-1 text-[10px] text-gray-500 pb-1">Área de Transferência</div>
          </div>

          {/* Font */}
          <div className="flex flex-col justify-between pr-2 border-r border-gray-300 shrink-0">
            <div className="flex items-center space-x-1 mb-1">
              <select className="bg-white border border-gray-300 hover:border-gray-400 rounded px-2 py-1 outline-none w-32 text-gray-800" onChange={(e) => execCmd('fontName', e.target.value)}>
                <option value="Aptos">Aptos (Corpo)</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Calibri">Calibri</option>
                <option value="Courier New">Courier</option>
              </select>
              <select className="bg-white border border-gray-300 hover:border-gray-400 rounded px-2 py-1 outline-none text-gray-800" onChange={(e) => execCmd('fontSize', e.target.value)}>
                <option value="1">10</option>
                <option value="2">11</option>
                <option value="3" selected>12</option>
                <option value="4">14</option>
                <option value="5">16</option>
                <option value="6">20</option>
                <option value="7">24</option>
              </select>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center text-gray-700 font-serif" title="Aumentar Tamanho da Fonte">A<sup className="text-[8px] ml-0.5">^</sup></button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center text-gray-700 font-serif text-[10px]" title="Diminuir Tamanho da Fonte">A<sup className="text-[8px] ml-0.5">v</sup></button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" onClick={() => execCmd('removeFormat')} title="Limpar Toda a Formatação">
                <Icon fafa="faEraser" width={12} color="#555" />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <button className="w-7 h-7 font-bold hover:bg-gray-200 rounded text-gray-800" onClick={() => execCmd('bold')} title="Negrito">N</button>
              <button className="w-7 h-7 italic hover:bg-gray-200 rounded font-serif text-gray-800" onClick={() => execCmd('italic')} title="Itálico">I</button>
              <button className="w-7 h-7 underline hover:bg-gray-200 rounded text-gray-800" onClick={() => execCmd('underline')} title="Sublinhado">S</button>
              <button className="w-7 h-7 line-through hover:bg-gray-200 rounded text-gray-800" onClick={() => execCmd('strikeThrough')} title="Tachado">ab</button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded text-[11px] flex items-center justify-center text-gray-800" onClick={() => execCmd('subscript')} title="Subscrito">X<sub>2</sub></button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded text-[11px] flex items-center justify-center text-gray-800" onClick={() => execCmd('superscript')} title="Sobrescrito">X<sup>2</sup></button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <div className="flex flex-col ml-1 hover:bg-gray-200 rounded p-0.5 border border-transparent">
                <input type="color" className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" defaultValue="#ffff00" onChange={(e) => execCmd('hiliteColor', e.target.value)} title="Cor de Realce do Texto" />
              </div>
              <div className="flex flex-col ml-1 hover:bg-gray-200 rounded p-0.5 border border-transparent">
                <input type="color" className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" defaultValue="#000000" onChange={(e) => execCmd('foreColor', e.target.value)} title="Cor da Fonte" />
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">Fonte</div>
          </div>

          {/* Paragraph */}
          <div className="flex flex-col justify-between pr-2 border-r border-gray-300 shrink-0">
            <div className="flex items-center space-x-1 mb-1">
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" onClick={() => execCmd('insertUnorderedList')} title="Marcadores"><Icon fafa="faListUl" width={12} color="#555"/></button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" onClick={() => execCmd('insertOrderedList')} title="Numeração"><Icon fafa="faListOl" width={12} color="#555"/></button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" title="Diminuir Recuo"><Icon fafa="faIndent" width={12} flip="horizontal" color="#555"/></button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" title="Aumentar Recuo"><Icon fafa="faIndent" width={12} color="#555"/></button>
            </div>
            <div className="flex items-center space-x-1">
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" onClick={() => execCmd('justifyLeft')} title="Alinhar à Esquerda"><Icon fafa="faAlignLeft" width={12} color="#555"/></button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" onClick={() => execCmd('justifyCenter')} title="Centralizar"><Icon fafa="faAlignCenter" width={12} color="#555"/></button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" onClick={() => execCmd('justifyRight')} title="Alinhar à Direita"><Icon fafa="faAlignRight" width={12} color="#555"/></button>
              <button className="w-7 h-7 hover:bg-gray-200 rounded flex items-center justify-center" onClick={() => execCmd('justifyFull')} title="Justificar"><Icon fafa="faAlignJustify" width={12} color="#555"/></button>
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">Parágrafo</div>
          </div>

          {/* Styles */}
          <div className="flex flex-col justify-between pr-2 border-r border-gray-300 shrink-0">
            <div className="flex items-center space-x-1 mb-1 bg-white p-1 rounded h-[50px] border border-gray-200">
              <div className="px-4 h-full border border-gray-300 bg-blue-50 flex flex-col justify-center items-center rounded cursor-pointer">
                <span className="text-[14px] text-gray-800 font-sans">AaBbCc</span>
                <span className="text-[10px] text-gray-600">Normal</span>
              </div>
              <div className="px-4 h-full border border-transparent hover:bg-gray-100 flex flex-col justify-center items-center rounded cursor-pointer">
                <span className="text-[14px] text-gray-800 font-sans leading-tight">AaBbCc</span>
                <span className="text-[10px] text-gray-600">Sem Espaçamento</span>
              </div>
              <div className="px-4 h-full border border-transparent hover:bg-gray-100 flex flex-col justify-center items-center rounded cursor-pointer">
                <span className="text-[16px] font-bold text-[#185abd] font-sans">AaBbCc</span>
                <span className="text-[10px] text-gray-600">Título 1</span>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">Estilos</div>
          </div>

          {/* Editing, Voice, Editor */}
          <div className="flex items-stretch space-x-2 shrink-0">
            <div className="flex flex-col justify-center space-y-1 pr-2 border-r border-gray-300">
              <button className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"><Icon fafa="faSearch" width={12} color="#555"/><span className="w-16 text-left text-gray-700">Localizar</span></button>
              <button className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"><Icon fafa="faExchangeAlt" width={12} color="#555"/><span className="w-16 text-left text-gray-700">Substituir</span></button>
              <button className="flex items-center space-x-2 hover:bg-gray-200 rounded px-1.5 py-0.5"><Icon fafa="faMousePointer" width={12} color="#555"/><span className="w-16 text-left text-gray-700">Selecionar</span></button>
              <div className="text-center w-full mt-1 text-[10px] text-gray-500 pb-1">Edição</div>
            </div>
            <div className="flex flex-col justify-between items-center pr-2 border-r border-gray-300 px-2">
              <div className="flex flex-col justify-center items-center hover:bg-gray-200 cursor-pointer rounded p-2 h-full w-full">
                <Icon fafa="faMicrophone" width={20} color="#555" />
                <span className="mt-1 text-gray-700">Ditar</span>
              </div>
              <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">Voz</div>
            </div>
            <div className="flex flex-col justify-between items-center px-2">
              <div className="flex flex-col justify-center items-center hover:bg-gray-200 cursor-pointer rounded p-2 h-full w-full">
                <Icon fafa="faPenSquare" width={22} color="#185abd" />
                <span className="mt-1 text-gray-700">Editor</span>
              </div>
              <div className="text-center text-[10px] text-gray-500 mt-1 pb-1">Editor</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto flex justify-center py-8 win11Scroll bg-[#e1dfdd]">
        <div 
          ref={editorRef}
          className="word-page bg-white shadow-md w-[21cm] min-h-[29.7cm] p-[2.54cm] focus:outline-none text-black font-['Aptos','Calibri',sans-serif] text-[11pt]"
          contentEditable={true}
          style={{ boxSizing: "border-box" }}
        ></div>
      </div>
    </AppWindow>
  );
};

