import "./notepad.scss";
import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";

export const Notepad = () => {
  const wnapp = useSelector((state) => state.apps.notepad);
  const files = useSelector((state) => state.files);
  const dispatch = useDispatch();

  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("Sem Título");
  // ID do arquivo atualmente aberto (null = novo arquivo não salvo)
  const [currentFileId, setCurrentFileId] = useState(null);

  // Quando o notepad é aberto com payload (ID de arquivo), carrega conteúdo
  useEffect(() => {
    if (
      wnapp.payload &&
      typeof wnapp.payload === "string" &&
      wnapp.payload !== "full"
    ) {
      const fileItem = files.data.getId(wnapp.payload);
      if (fileItem) {
        setText(fileItem.data || "");
        setFileName(fileItem.name.replace(/\.txt$/i, ""));
        setCurrentFileId(fileItem.id);
      }
    }
  }, [wnapp.payload]);

  // Detecta quando o FileDialog fecha após um save (caller === 'notepad')
  // para atualizar o título com o nome salvo
  const prevDialogRef = useRef(null);
  useEffect(() => {
    const dialog = files.fileDialog;
    if (
      prevDialogRef.current &&
      prevDialogRef.current.caller === "notepad" &&
      prevDialogRef.current.mode === "save" &&
      dialog === null
    ) {
      // Arquivo foi salvo: atualiza o título do Bloco de Notas
      const savedName = prevDialogRef.current.fileName || "Sem Título";
      setFileName(savedName.replace(/\.txt$/i, ""));
    }
    prevDialogRef.current = dialog;
  }, [files.fileDialog]);

  const openSaveDialog = () => {
    dispatch({
      type: "FILEDIALOG_OPEN",
      payload: {
        mode: "save",
        fileName: fileName,
        caller: "notepad",
        startDir: "%user%",
        content: text, // Passa o conteúdo atual para ser salvo
      },
    });
  };

  // Ctrl+S: salva direto se já tem arquivo aberto, senão abre diálogo
  const handleSave = () => {
    if (currentFileId) {
      const fileItem = files.data.getId(currentFileId);
      if (fileItem) {
        fileItem.data = text;
        dispatch({ type: "FILEDIR", payload: files.cdir });
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

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name={`${fileName} - Bloco de Notas`}
      className="notepad"
      rootProps={{
        onKeyDown: handleKeyDown,
      }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="h-full flex-grow relative"
      screenTop={
        <div className="flex text-xs py-1.5 topBar bg-white dark:bg-[#1f1f1f] select-none">
          {/* Menu Arquivo */}
          <div className="mx-1 relative group">
            <div className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 px-2 py-1 rounded">
              Arquivo
            </div>
            <div className="hidden group-hover:flex absolute top-full left-0 z-50 flex-col bg-white dark:bg-[#2a2a2a] shadow-xl border border-gray-200 dark:border-gray-700 rounded-md min-w-[180px] py-1 text-xs">
              <div
                className="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer flex justify-between items-center"
                onClick={() => {
                  setText("");
                  setFileName("Sem Título");
                  setCurrentFileId(null);
                }}
              >
                <span>Novo</span>
                <span className="text-gray-400 ml-6">Ctrl+N</span>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
              <div
                className="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer flex justify-between items-center"
                onClick={handleSave}
              >
                <span>Salvar</span>
                <span className="text-gray-400 ml-6">Ctrl+S</span>
              </div>
              <div
                className="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
                onClick={openSaveDialog}
              >
                Salvar Como...
              </div>
            </div>
          </div>
          <div className="mx-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 px-2 py-1 rounded">
            Editar
          </div>
          <div className="mx-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 px-2 py-1 rounded">
            Exibir
          </div>
        </div>
      }
    >
      <div className="w-full h-full overflow-hidden">
        <textarea
          className="noteText win11Scroll bg-white dark:bg-[#202020] dark:text-white"
          id="textpad"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </AppWindow>
  );
};
