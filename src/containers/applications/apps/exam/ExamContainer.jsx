import React, { useMemo, useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { allReducers } from "../../../../reducers";
import { Background } from "../../../background";
import { DesktopApp } from "../../../../components/start";
import Taskbar from "../../../../components/taskbar";
import * as Applications from "../../../applications";
import { FileDialog } from "../../../applications/apps/FileDialog";
import { getGlobalShortcutAction } from "../../../../lib/keyboardShortcuts";

export const ExamContainer = ({ initialState, onFinish, instructions, finishSignal = 0 }) => {
  const handledFinishSignal = useRef(0);
  // Criar uma store isolada para este container
  const isolatedStore = useMemo(() => {
    // Mesclar o estado inicial se fornecido
    return createStore(allReducers, initialState);
  }, [initialState]);

  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Capturar atalhos para a store isolada
      const state = isolatedStore.getState();
      const shortcutAction = getGlobalShortcutAction(e, {
        apps: state.apps,
        fileDialogOpen: Boolean(state.files.fileDialog),
      });

      if (shortcutAction) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Impedir que o App.jsx (store principal) receba
        isolatedStore.dispatch(shortcutAction);
        
        // Rastrear a ação
        isolatedStore.dispatch({ 
          type: "TRACK_ACTION", 
          payload: { type: "shortcut", name: shortcutAction.type, key: e.key } 
        });
      }
    };

    // Usar capture phase e priority para interceptar antes do App.jsx
    window.addEventListener("keydown", handleGlobalKey, true);
    return () => window.removeEventListener("keydown", handleGlobalKey, true);
  }, [isolatedStore]);

  useEffect(() => {
    if (finishSignal > 0 && finishSignal !== handledFinishSignal.current) {
      handledFinishSignal.current = finishSignal;
      onFinish(isolatedStore.getState());
    }
  }, [finishSignal, isolatedStore, onFinish]);

  return (
    <div className="exam-container-root flex h-full w-full overflow-hidden bg-gray-900 fixed inset-0 z-[9999]">

      {/* Painel de Instruções Lateral */}
      <div className="w-80 flex-shrink-0 bg-gray-100 border-r flex flex-col shadow-xl z-20">
        <div className="p-4 bg-blue-700 text-white font-bold flex justify-between items-center">
          <span>PARTE PRÁTICA</span>
          <button 
            onClick={() => onFinish(isolatedStore.getState())}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-xs transition"
          >
            Finalizar Prova
          </button>
        </div>
        <div className="flex-grow overflow-auto p-4 prose prose-sm">
          <h3 className="text-blue-800 border-b pb-2 mb-4">Instruções</h3>
          <ul className="space-y-4 list-none p-0">
            {instructions.map((task, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                  {i + 1}
                </span>
                <span className="text-gray-700 leading-tight">{task.text}</span>
                {task.timeLimit > 0 && (
                  <span className="ml-auto whitespace-nowrap rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                    {task.timeLimit} min
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t bg-gray-50 text-[10px] text-gray-500 italic">
          Suas ações neste ambiente são monitoradas e não afetam seu computador real.
        </div>
      </div>

      {/* Simulador Isolado */}
      <div className="flex-grow relative h-full overflow-hidden">
        <Provider store={isolatedStore}>
          <div className="appwrap h-full w-full relative">
            <Background />
            <div className="desktop h-full w-full" data-menu="desk">
              <DesktopApp />
              {Object.keys(Applications).map((key, idx) => {
                const WinApp = Applications[key];
                // Evitar que o app de avaliação abra dentro de si mesmo (recursão)
                if (key === "ExamApp") return null;
                return <WinApp key={idx} />;
              })}
              <FileDialog />
            </div>
            <Taskbar />
          </div>
        </Provider>
      </div>
    </div>
  );
};
