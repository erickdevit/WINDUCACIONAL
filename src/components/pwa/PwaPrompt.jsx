import React, { useState, useEffect, useCallback } from "react";
import "./pwa-prompt.scss";

const PwaPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already dismissed or installed
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    if (dismissed || isStandalone) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Small delay so it appears after the lock screen
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem("pwa-prompt-dismissed", "true");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    setInstalling(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="pwa-prompt-overlay" onClick={handleDismiss}>
      <div className="pwa-prompt-card" onClick={(e) => e.stopPropagation()}>
        <div className="pwa-prompt-header">
          <img src="favicon.png" alt="Win11 Icon" className="pwa-prompt-icon" />
          <div className="pwa-prompt-info">
            <div className="pwa-prompt-title">Instalar o simulador</div>
            <div className="pwa-prompt-subtitle">
              Adicione à tela inicial para uma experiência melhor
            </div>
          </div>
        </div>
        <div className="pwa-prompt-features">
          <div className="pwa-prompt-feature">
            <span className="pwa-feature-icon">⚡</span>
            <span>Acesso rápido pela tela inicial</span>
          </div>
          <div className="pwa-prompt-feature">
            <span className="pwa-feature-icon">📱</span>
            <span>Experiência em tela cheia</span>
          </div>
          <div className="pwa-prompt-feature">
            <span className="pwa-feature-icon">🔄</span>
            <span>Funciona offline</span>
          </div>
        </div>
        <div className="pwa-prompt-actions">
          <button className="pwa-btn pwa-btn-dismiss" onClick={handleDismiss}>
            Agora não
          </button>
          <button
            className="pwa-btn pwa-btn-install"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? "Instalando..." : "Instalar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaPrompt;
