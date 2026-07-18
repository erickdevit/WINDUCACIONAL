import React, { useEffect, useState } from "react";

export const PowerResultModal = ({ build, onClose, onOpenGallery }) => {
  const [phase, setPhase] = useState("powering");
  const success = build.outcome === "success";
  const errors = build.validation?.errors || [];
  const metrics = build.validation?.metrics || {};

  useEffect(() => {
    setPhase("powering");
    const resultTimer = setTimeout(
      () => setPhase(success ? "booting" : "exploded"),
      650
    );
    const readyTimer = success
      ? setTimeout(() => setPhase("ready"), 2450)
      : null;
    return () => {
      clearTimeout(resultTimer);
      if (readyTimer) clearTimeout(readyTimer);
    };
  }, [build.id, success]);

  return (
    <div className="pcModalBackdrop pcPowerBackdrop">
      <section
        className={`pcPowerResult ${success ? "success" : "failure"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-power-title"
      >
        <div className="pcPowerAnimation" data-phase={phase}>
          <div className="pcResultTower">
            <i className="pcResultPowerLight" />
            <span className="pcResultFan" />
            <span className="pcResultBurst burstOne" />
            <span className="pcResultBurst burstTwo" />
            <span className="pcResultBurst burstThree" />
          </div>
          <div className="pcResultMonitor">
            <div className="pcResultScreen">
              {phase === "powering" && <span className="pcBootCursor">_</span>}
              {success && phase === "booting" && (
                <div className="pcWindowsBoot">
                  <span className="pcWindowsLogo">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>Windows</strong>
                  <span className="pcBootDots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
              {success && phase === "ready" && (
                <div className="pcWindowsDesktop">
                  <span className="pcDesktopLogo" />
                  <strong>Bem-vindo</strong>
                  <small>{build.name}</small>
                  <i className="pcDesktopTaskbar" />
                </div>
              )}
              {!success && phase === "exploded" && (
                <div className="pcNoSignal">
                  <strong>SEM SINAL</strong>
                  <small>Proteção de bancada acionada</small>
                </div>
              )}
            </div>
            <span className="pcResultStand" />
          </div>
          {!success && phase === "exploded" && (
            <div className="pcExplosionLabel">FALHA CRÍTICA</div>
          )}
        </div>

        <div className="pcResultContent">
          <span className="pcEyebrow">Teste de inicialização concluído</span>
          <h2 id="pc-power-title">
            {success
              ? "Montagem aprovada: o Windows iniciou"
              : "A montagem falhou ao receber energia"}
          </h2>
          <p>
            {success
              ? `O monitor recebeu vídeo e o sistema iniciou em cerca de ${
                  metrics.bootSeconds || "poucos"
                } segundos.`
              : "A bancada simulou uma explosão e interrompeu a energia. Revise as incompatibilidades antes de tentar novamente."}
          </p>

          <div className="pcResultStats">
            <span>
              <small>Carga</small>
              <strong>{metrics.totalLoad || 0} W</strong>
            </span>
            <span>
              <small>Fonte</small>
              <strong>{metrics.psuWattage || 0} W</strong>
            </span>
            <span>
              <small>Desempenho</small>
              <strong>{metrics.performanceScore || 0}/100</strong>
            </span>
          </div>

          {!success && errors.length > 0 && (
            <div className="pcResultIssues">
              {errors.slice(0, 4).map((item) => (
                <div key={item.code}>
                  <i aria-hidden="true">!</i>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                  </span>
                </div>
              ))}
            </div>
          )}

          {build.persistError ? (
            <p className="pcPersistWarning">
              O teste foi executado, mas não entrou na galeria:{" "}
              {build.persistError}
            </p>
          ) : (
            <p className="pcSavedMessage">Montagem salva na sua galeria.</p>
          )}

          <div className="pcResultActions">
            <button type="button" className="pcResetButton" onClick={onClose}>
              {success ? "Fechar resultado" : "Voltar à bancada"}
            </button>
            {!build.persistError && (
              <button
                type="button"
                className="pcInstallButton"
                onClick={onOpenGallery}
              >
                Abrir galeria
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
