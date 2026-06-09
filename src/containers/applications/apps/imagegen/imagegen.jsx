import "./imagegen.scss";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";

const ASPECTS = [
  { id: "1:1", label: "Quadrado · 1:1" },
  { id: "16:9", label: "Paisagem · 16:9" },
  { id: "9:16", label: "Retrato · 9:16" },
  { id: "4:3", label: "Clássico · 4:3" },
  { id: "3:4", label: "Vertical · 3:4" },
];

const HISTORY_MAX = 50;
const INLINE_HISTORY = 5;

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "imagem-gerada";

export const ImageGen = () => {
  const wnapp = useSelector((state) => state.apps.imagegen);
  const lastClosedDialog = useSelector((state) => state.files.lastClosedDialog);
  const dispatch = useDispatch();
  const hide = wnapp.hide;

  const [view, setView] = useState("generate"); // "generate" | "history"
  const [config, setConfig] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [enhance, setEnhance] = useState(true);
  const [aspect, setAspect] = useState("1:1");
  const [current, setCurrent] = useState(null); // { url, prompt }
  const [history, setHistory] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const lastSavedDialogRef = useRef(null);
  const savedTimer = useRef(null);

  useEffect(() => {
    if (hide) return;
    api
      .getImageGenConfig()
      .then(setConfig)
      .catch(() => setConfig({ configured: false }));
  }, [hide]);

  // Detecta apenas salvamentos confirmados pelo FileDialog.
  useEffect(() => {
    if (
      lastClosedDialog &&
      lastClosedDialog !== lastSavedDialogRef.current &&
      lastClosedDialog.caller === "imagegen" &&
      lastClosedDialog.mode === "save" &&
      lastClosedDialog.saved
    ) {
      setSavedMsg("Imagem salva nos Arquivos.");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedMsg(""), 3500);
    }
    lastSavedDialogRef.current = lastClosedDialog;
  }, [lastClosedDialog]);

  useEffect(
    () => () => savedTimer.current && clearTimeout(savedTimer.current),
    []
  );

  const buildPrompt = (text) =>
    enhance ? `${text}, highly detailed, sharp focus, high quality` : text;

  const generate = async (event) => {
    event?.preventDefault?.();
    const text = prompt.trim();
    if (!text || generating) return;
    setError("");
    setGenerating(true);
    try {
      const { image } = await api.generateImage({
        prompt: buildPrompt(text),
        aspect,
      });
      const result = { url: image, prompt: text };
      setCurrent(result);
      setHistory((prev) => [result, ...prev].slice(0, HISTORY_MAX));
    } catch (err) {
      setError(err.message || "Não foi possível gerar a imagem.");
    } finally {
      setGenerating(false);
    }
  };

  // "Baixar" = salvar dentro do simulador, escolhendo a pasta no Explorer
  const saveToFiles = () => {
    if (!current) return;
    dispatch({
      type: "FILEDIALOG_OPEN",
      payload: {
        mode: "save",
        fileName: slugify(current.prompt),
        caller: "imagegen",
        startDir: "%user%",
        content: current.url,
        ext: "png",
      },
    });
  };

  const openFromHistory = (item) => {
    setError("");
    setCurrent(item);
    setView("generate");
  };

  const notConfigured = config && !config.configured;

  const renderGenerate = () => (
    <>
      <div className="imgGenPreview">
        {current ? (
          <img src={current.url} alt={current.prompt} data-dim={generating} />
        ) : !generating && !error ? (
          <div className="imgGenEmpty">
            <Icon src="imagegen" width={52} />
            <strong>Descreva uma imagem e clique em "Gerar"</strong>
            <span>A imagem aparecerá aqui.</span>
          </div>
        ) : null}

        {generating ? (
          <div className="imgGenStatus">
            <span className="imgGenSpinner" />
            <span>Gerando imagem...</span>
          </div>
        ) : null}

        {error && !generating ? (
          <div className="imgGenStatus imgGenError">
            <Icon fafa="faTriangleExclamation" width={16} />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {history.length > 0 ? (
        <div className="imgGenHistory">
          {history.slice(0, INLINE_HISTORY).map((item) => (
            <button
              type="button"
              key={item.url}
              className={`imgGenThumb ${
                current?.url === item.url ? "active" : ""
              }`}
              title={item.prompt}
              onClick={() => openFromHistory(item)}
            >
              <img src={item.url} alt={item.prompt} />
            </button>
          ))}
          {history.length > INLINE_HISTORY ? (
            <button
              type="button"
              className="imgGenThumb imgGenThumbMore"
              onClick={() => setView("history")}
              title="Ver todo o histórico"
            >
              +{history.length - INLINE_HISTORY}
            </button>
          ) : null}
        </div>
      ) : null}

      <form className="imgGenForm" onSubmit={generate}>
        <textarea
          className="imgGenPrompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex.: um gato astronauta flutuando sobre a Terra, arte digital"
          rows={2}
        />

        <label className="imgGenToggle">
          <input
            type="checkbox"
            checked={enhance}
            onChange={(e) => setEnhance(e.target.checked)}
          />
          <span>Aprimorar prompt automaticamente</span>
        </label>

        <div className="imgGenRow">
          <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
            {ASPECTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="imgGenGenerate"
            disabled={!prompt.trim() || generating}
          >
            <Icon fafa="faWandMagicSparkles" width={14} />
            {generating ? "Gerando..." : "Gerar imagem"}
          </button>
        </div>
      </form>

      <div className="imgGenActions">
        <button type="button" onClick={saveToFiles} disabled={!current}>
          <Icon fafa="faDownload" width={13} /> Baixar
        </button>
        <button
          type="button"
          onClick={generate}
          disabled={!prompt.trim() || generating}
        >
          <Icon fafa="faRotate" width={13} /> Variar
        </button>
      </div>

      {savedMsg ? <p className="imgGenSaved">{savedMsg}</p> : null}
    </>
  );

  const renderHistory = () =>
    history.length === 0 ? (
      <div className="imgGenNotice">
        <Icon src="imagegen" width={48} />
        <strong>Nenhuma imagem gerada ainda</strong>
        <span>As imagens que você gerar nesta sessão aparecerão aqui.</span>
      </div>
    ) : (
      <div className="imgGenGallery">
        {history.map((item) => (
          <button
            type="button"
            key={item.url}
            className="imgGenGalleryItem"
            title={item.prompt}
            onClick={() => openFromHistory(item)}
          >
            <img src={item.url} alt={item.prompt} />
            <span>{item.prompt}</span>
          </button>
        ))}
      </div>
    );

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="Gerador de Imagens"
      className="wnImageGen"
      toolbarProps={{ bg: "#ffffff", noinvert: true }}
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="imgGenLayout win11Scroll">
        {notConfigured ? (
          <div className="imgGenNotice">
            <Icon src="imagegen" width={48} />
            <strong>Gerador de imagens indisponível</strong>
            <span>
              O serviço de geração não está configurado no servidor. Avise o
              administrador.
            </span>
          </div>
        ) : (
          <>
            <div className="imgGenTabs">
              <button
                type="button"
                className={view === "generate" ? "active" : ""}
                onClick={() => setView("generate")}
              >
                <Icon fafa="faWandMagicSparkles" width={12} /> Gerar
              </button>
              <button
                type="button"
                className={view === "history" ? "active" : ""}
                onClick={() => setView("history")}
              >
                <Icon fafa="faClockRotateLeft" width={12} /> Histórico
                {history.length > 0 ? ` (${history.length})` : ""}
              </button>
            </div>

            {view === "history" ? renderHistory() : renderGenerate()}
          </>
        )}
      </div>
    </AppWindow>
  );
};
