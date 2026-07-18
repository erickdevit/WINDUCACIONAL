import React, { useEffect, useState } from "react";
import { getPcPart } from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { ComponentArtwork } from "./ComponentArtwork";

export const PowerResultModal = ({ build, onClose, onOpenGallery }) => {
  const [phase, setPhase] = useState("powering");
  const success = build.outcome === "success";
  const errors = build.validation?.errors || [];
  const metrics = build.validation?.metrics || {};
  const pcCase = getPcPart(build.components?.case);
  const gpu = getPcPart(build.components?.gpu);

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
        className="pcPowerResult"
        data-success={success}
        data-phase={phase}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-power-title"
      >
        <div className="pcPowerShowcase">
          <div className="pcResultParticles" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <i
                key={index}
                style={{
                  "--particle-left": `${4 + ((index * 37) % 90)}%`,
                  "--particle-top": `${5 + ((index * 19) % 75)}%`,
                  "--particle-delay": `${index * 70}ms`,
                  "--spark-x": `${(index - 7) * 24}px`,
                  "--spark-y": `${(index % 4) * 55 - 110}px`,
                }}
              />
            ))}
          </div>
          <span className="pcResultKicker">
            <i aria-hidden="true" />
            TESTE DE ENERGIA
          </span>
          <div className="pcResultMachine">
            <span className="pcResultCaseArt">
              <ComponentArtwork category="case" part={pcCase} />
            </span>
            <span className="pcResultGpuArt">
              <ComponentArtwork category="gpu" part={gpu} />
            </span>
            <span className="pcResultShockwave" aria-hidden="true" />
          </div>
          <div className="pcResultMonitor">
            <div className="pcResultScreen">
              {phase === "powering" && (
                <div className="pcBootScanner">
                  <span />
                  <strong>POST</strong>
                  <small>verificando hardware...</small>
                </div>
              )}
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
                  <strong>Olá, montador!</strong>
                  <small>{build.name}</small>
                  <i className="pcDesktopTaskbar" />
                </div>
              )}
              {!success && phase === "exploded" && (
                <div className="pcNoSignal">
                  <i aria-hidden="true">!</i>
                  <strong>SEM SINAL</strong>
                  <small>Proteção da bancada acionada</small>
                </div>
              )}
            </div>
            <span className="pcResultStand" />
          </div>
          <div className="pcResultVerdict">
            <i aria-hidden="true">{success ? "✓" : "!"}</i>
            <span>
              <small>
                {success ? "MISSÃO CONCLUÍDA" : "MISSÃO INTERROMPIDA"}
              </small>
              <strong>
                {success ? "A MÁQUINA ESTÁ VIVA!" : "A BANCADA EXPLODIU!"}
              </strong>
            </span>
          </div>
        </div>

        <div className="pcResultContent">
          <button type="button" className="pcModalClose" onClick={onClose}>
            <span aria-hidden="true">×</span>
            Fechar
          </button>
          <span className="pcEyebrow">Relatório final do laboratório</span>
          <h2 id="pc-power-title">
            {success
              ? "Montagem aprovada. O Windows iniciou."
              : "Algo não encaixou como deveria."}
          </h2>
          <p>
            {success
              ? `O monitor recebeu vídeo e o sistema iniciou em cerca de ${
                  metrics.bootSeconds || "poucos"
                } segundos. Excelente trabalho!`
              : "A simulação interrompeu a energia para proteger as peças. Use o diagnóstico abaixo e tente uma configuração diferente."}
          </p>

          <div className="pcResultStats">
            <span>
              <small>Carga total</small>
              <strong>{metrics.totalLoad || 0} W</strong>
              <i
                style={{
                  width: `${Math.min(
                    100,
                    (metrics.totalLoad / (metrics.psuWattage || 1)) * 100
                  )}%`,
                }}
              />
            </span>
            <span>
              <small>Fonte instalada</small>
              <strong>{metrics.psuWattage || 0} W</strong>
              <i
                style={{
                  width: `${Math.min(
                    100,
                    ((metrics.psuWattage || 0) / 850) * 100
                  )}%`,
                }}
              />
            </span>
            <span>
              <small>Desempenho</small>
              <strong>{metrics.performanceScore || 0}/100</strong>
              <i style={{ width: `${metrics.performanceScore || 0}%` }} />
            </span>
          </div>

          {!success && errors.length > 0 && (
            <div className="pcResultIssues">
              <div className="pcResultIssuesHeading">
                <span>
                  <small>O scanner encontrou</small>
                  <strong>{errors.length} incompatibilidade(s)</strong>
                </span>
                <i>{errors.length}</i>
              </div>
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
            <p className="pcSavedMessage">
              <i aria-hidden="true">✓</i>
              Projeto salvo automaticamente na sua galeria.
            </p>
          )}

          <div className="pcResultActions">
            <button type="button" className="pcResetButton" onClick={onClose}>
              {success ? "Voltar à bancada" : "Corrigir montagem"}
            </button>
            {!build.persistError && (
              <button
                type="button"
                className="pcInstallButton"
                onClick={onOpenGallery}
              >
                Explorar na galeria
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
