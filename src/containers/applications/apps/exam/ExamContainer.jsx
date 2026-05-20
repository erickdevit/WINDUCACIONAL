import React, { useMemo, useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { allReducers } from "../../../../reducers";
import { Background } from "../../../background";
import { DesktopApp } from "../../../../components/start";
import Taskbar from "../../../../components/taskbar";
import * as Applications from "../../../applications";
import { FileDialog } from "../../../applications/apps/FileDialog";
import { getGlobalShortcutAction } from "../../../../lib/keyboardShortcuts";

/**
 * Ações de apps que devem ser rastreadas automaticamente quando disparadas
 * por qualquer meio (atalho, clique no ícone, menu iniciar, etc.).
 */
const TRACKABLE_APP_ACTIONS = new Set([
  "EXPLORER",
  "NOTEPAD",
  "TERMINAL",
  "SETTINGS",
  "CALCUAPP",
  "CAMERA",
  "WHITEBOARD",
  "CHATAPP",
  "MSEDGE",
  "TASKMANAGER",
]);

/**
 * Ações de arquivo que devem ser rastreadas.
 */
const FILE_ACTIONS = new Set([
  "ADDFILE", "ADDDIR", "DELFILE", "RENAME", "FILEDIALOG_CLOSE",
]);

/**
 * Labels legíveis para cada ação rastreada.
 */
const ACTION_LABELS = {
  EXPLORER: "Explorador de Arquivos",
  NOTEPAD: "Bloco de Notas",
  TERMINAL: "Terminal",
  SETTINGS: "Configurações",
  CALCUAPP: "Calculadora",
  CAMERA: "Câmera",
  WHITEBOARD: "Quadro Branco",
  CHATAPP: "Chat",
  MSEDGE: "Navegador",
  TASKMANAGER: "Gerenciador de Tarefas",
};

/**
 * Middleware que intercepta dispatches na store isolada para rastrear
 * aberturas/fechamentos de apps e operações de arquivo com timestamps.
 */
const createTrackingMiddleware = () => {
  const startTime = Date.now();

  return (store) => (next) => (action) => {
    const elapsed = Date.now() - startTime;

    // Rastrear abertura de apps
    if (
      TRACKABLE_APP_ACTIONS.has(action.type) &&
      action.payload !== "close" &&
      action.payload !== "mnmz"
    ) {
      next({
        type: "TRACK_ACTION",
        payload: {
          type: "app_open",
          name: action.type,
          label: ACTION_LABELS[action.type] || action.type,
          timestamp: elapsed,
        },
      });
    }

    // Rastrear fechamento de apps
    if (
      TRACKABLE_APP_ACTIONS.has(action.type) &&
      action.payload === "close"
    ) {
      next({
        type: "TRACK_ACTION",
        payload: {
          type: "app_close",
          name: action.type,
          label: ACTION_LABELS[action.type] || action.type,
          timestamp: elapsed,
        },
      });
    }

    // Rastrear operações de arquivo
    if (FILE_ACTIONS.has(action.type)) {
      next({
        type: "TRACK_ACTION",
        payload: {
          type: "file_op",
          name: action.type,
          label: action.type === "ADDFILE" ? "Arquivo criado"
            : action.type === "ADDDIR" ? "Pasta criada"
            : action.type === "DELFILE" ? "Arquivo excluído"
            : action.type === "RENAME" ? "Arquivo renomeado"
            : action.type,
          detail: action.payload?.name || action.payload?.path || "",
          timestamp: elapsed,
        },
      });
    }

    return next(action);
  };
};

export const ExamContainer = ({ initialState, onFinish, instructions, finishSignal = 0, onFinishClick }) => {
  const handledFinishSignal = useRef(0);
  // Criar uma store isolada com middleware de rastreamento
  const isolatedStore = useMemo(() => {
    const trackingMiddleware = createTrackingMiddleware();
    return createStore(allReducers, initialState, applyMiddleware(trackingMiddleware));
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

  const handleFinishClick = () => {
    if (onFinishClick) {
      // O pai gerencia a confirmação; passa uma função que dispara o finish
      onFinishClick(() => onFinish(isolatedStore.getState()));
    } else {
      onFinish(isolatedStore.getState());
    }
  };

  return (
    <div className="exam-container-root flex h-full w-full overflow-hidden bg-gray-900 fixed inset-0 z-[9999]">

      {/* Painel de Instruções Lateral */}
      <div className="w-80 flex-shrink-0 bg-gray-100 border-r flex flex-col shadow-xl z-20">
        <div className="p-4 bg-blue-700 text-white font-bold flex justify-between items-center">
          <span>PARTE PRÁTICA</span>
          <button 
            onClick={handleFinishClick}
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
