import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import "./ouroModerno.scss";

const normalizeSafeUrl = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    if (parsed.username || parsed.password) return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

export const OuroModerno = () => {
  const wnapp = useSelector((state) => state.apps.itbOuroModerno);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadUrl = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getOuroModernoConfig();
      const safeUrl = normalizeSafeUrl(result.url);
      if (!safeUrl) throw new Error("A URL configurada não é segura.");
      setUrl(safeUrl);
    } catch (loadError) {
      setError(loadError.message);
      setUrl("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wnapp?.hide) loadUrl();
  }, [wnapp?.hide]);

  useEffect(() => {
    const handleUrlUpdate = (event) => {
      const safeUrl = normalizeSafeUrl(event.detail?.url);
      if (safeUrl) {
        setUrl(safeUrl);
        setError("");
      }
    };
    window.addEventListener("ouro-moderno:url-updated", handleUrlUpdate);
    return () =>
      window.removeEventListener("ouro-moderno:url-updated", handleUrlUpdate);
  }, []);

  if (!wnapp) return null;

  return (
    <AppWindow
      wnapp={wnapp}
      app={wnapp.action}
      icon={wnapp.icon}
      name="ITB Ouro Moderno"
      className="ouroModernoApp lightWindow"
      windowScreenClassName="flex flex-col"
      restWindowClassName="flex-grow flex flex-col"
    >
      <div className="ouroModernoBar">
        <span>{url ? new URL(url).hostname : "Integração externa"}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            Abrir em nova aba
          </a>
        )}
      </div>
      <div className="ouroModernoContent">
        {loading && <p>Carregando o ITB Ouro Moderno...</p>}
        {!loading && error && (
          <div className="ouroModernoState" role="alert">
            <strong>Não foi possível abrir o aplicativo.</strong>
            <span>{error}</span>
            <button type="button" onClick={loadUrl}>
              Tentar novamente
            </button>
          </div>
        )}
        {!loading && !error && url && (
          <iframe
            src={url}
            allow="camera; microphone"
            referrerPolicy="strict-origin-when-cross-origin"
            title="ITB Ouro Moderno"
          />
        )}
      </div>
    </AppWindow>
  );
};

export { normalizeSafeUrl };
