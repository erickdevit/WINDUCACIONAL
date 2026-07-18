import React from "react";
import {
  PC_CATEGORIES,
  getPcPart,
} from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { ComponentArtwork } from "./ComponentArtwork";
import { PcCaseVisual } from "./PcCaseVisual";

const clampPercentage = (value) =>
  Math.max(0, Math.min(100, Math.round(value)));

const TelemetryDial = ({ label, value, display, tone }) => (
  <div
    className="pcTelemetryDial"
    data-tone={tone}
    style={{ "--pc-dial-value": `${clampPercentage(value)}%` }}
  >
    <span className="pcTelemetryDialArc">
      <i />
    </span>
    <span className="pcTelemetryDialText">
      <strong>{display}</strong>
      <small>{label}</small>
    </span>
  </div>
);

export const BuilderView = ({
  buildName,
  evaluation,
  saving,
  selection,
  onBuildNameChange,
  onOpenCategory,
  onPowerOn,
  onReset,
}) => {
  const installedCount = PC_CATEGORIES.filter(({ id }) => selection[id]).length;
  const progress = Math.round((installedCount / PC_CATEGORIES.length) * 100);
  const powerLoad = evaluation.metrics.psuWattage
    ? (evaluation.metrics.totalLoad / evaluation.metrics.psuWattage) * 100
    : 0;
  const airflowEfficiency = evaluation.metrics.airflowRequired
    ? (evaluation.metrics.airflowAvailable /
        evaluation.metrics.airflowRequired) *
      100
    : 0;

  return (
    <main className="pcBuilderView">
      <section className="pcMissionHeader">
        <div className="pcMissionCopy">
          <span className="pcMissionBadge">
            <i aria-hidden="true">01</i>
            Missão de montagem
          </span>
          <h1>Construa uma máquina que realmente liga.</h1>
          <p>
            Explore as peças, encaixe cada conexão e acompanhe energia,
            desempenho e temperatura antes do grande teste.
          </p>
        </div>

        <div
          className="pcMissionProgress"
          aria-label={`${progress}% da montagem concluída`}
        >
          <div
            className="pcMissionProgressRing"
            style={{ "--pc-progress": `${progress}%` }}
          >
            <span>
              <strong>{installedCount}</strong>
              <small>de {PC_CATEGORIES.length}</small>
            </span>
          </div>
          <div>
            <strong>
              {progress === 100 ? "Checklist completo" : "Em construção"}
            </strong>
            <small>{progress}% das peças instaladas</small>
          </div>
        </div>

        <label className="pcBuildName">
          <span>Nome do projeto</span>
          <div>
            <i aria-hidden="true">✦</i>
            <input
              type="text"
              value={buildName}
              maxLength={80}
              onChange={(event) => onBuildNameChange(event.target.value)}
              aria-label="Nome do computador"
            />
          </div>
        </label>
      </section>

      <div className="pcWorkbench">
        <aside className="pcPartsDock" aria-label="Componentes da montagem">
          <div className="pcDockHeading">
            <div>
              <span>Inventário</span>
              <strong>Escolha as peças</strong>
            </div>
            <span className="pcDockCounter">
              {installedCount}/{PC_CATEGORIES.length}
            </span>
          </div>
          <div className="pcPartsList">
            {PC_CATEGORIES.map((category, index) => {
              const part = getPcPart(selection[category.id]);
              return (
                <button
                  type="button"
                  className="pcPartSlot"
                  data-category={category.id}
                  data-installed={Boolean(part)}
                  key={category.id}
                  onClick={() => onOpenCategory(category.id)}
                >
                  <span className="pcPartThumbnail">
                    <ComponentArtwork category={category.id} part={part} />
                    <i>{part ? "✓" : String(index + 1).padStart(2, "0")}</i>
                  </span>
                  <span className="pcPartSlotText">
                    <small>{category.label}</small>
                    <strong>{part?.name || "Escolher componente"}</strong>
                  </span>
                  <span className="pcPartArrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="pcAssemblyStage" aria-label="Estúdio de montagem">
          <header className="pcStageHeader">
            <div>
              <span className="pcLiveDot" />
              <span>Estúdio de montagem</span>
              <small>clique em uma peça para trocar</small>
            </div>
            <div className="pcStageStatus" data-valid={evaluation.isValid}>
              <i aria-hidden="true">{evaluation.isValid ? "✓" : "!"}</i>
              <span>
                <small>Status da bancada</small>
                <strong>
                  {evaluation.isValid
                    ? "Pronto para ligar"
                    : `${evaluation.errors.length} ajuste(s) necessário(s)`}
                </strong>
              </span>
            </div>
          </header>

          <PcCaseVisual
            evaluation={evaluation}
            selection={selection}
            onOpenCategory={onOpenCategory}
          />

          <footer className="pcStageActions">
            <button type="button" className="pcResetButton" onClick={onReset}>
              <span aria-hidden="true">↺</span>
              Limpar bancada
            </button>
            <div className="pcPowerHint">
              <span className="pcPowerHintLights" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <small>
                {evaluation.isValid
                  ? "Todos os sistemas respondendo"
                  : "O teste continuará mesmo com falhas"}
              </small>
            </div>
            <button
              type="button"
              className="pcPowerButton"
              disabled={saving}
              onClick={onPowerOn}
            >
              <span className="pcPowerIcon" aria-hidden="true" />
              <span>
                <small>{saving ? "Salvando projeto" : "Teste final"}</small>
                <strong>{saving ? "Preparando..." : "Ligar computador"}</strong>
              </span>
            </button>
          </footer>
        </section>

        <aside className="pcDiagnostics" aria-label="Telemetria e diagnóstico">
          <div className="pcTelemetryHero">
            <span className="pcEyebrow">Telemetria ao vivo</span>
            <h2>Saúde da máquina</h2>
            <p>Os medidores reagem às escolhas feitas na bancada.</p>
            <div className="pcTelemetryDials">
              <TelemetryDial
                label="Desempenho"
                value={evaluation.metrics.performanceScore}
                display={evaluation.metrics.performanceScore}
                tone="performance"
              />
              <TelemetryDial
                label="Carga da fonte"
                value={powerLoad}
                display={`${Math.round(powerLoad)}%`}
                tone="power"
              />
              <TelemetryDial
                label="Refrigeração"
                value={airflowEfficiency}
                display={`${Math.round(airflowEfficiency)}%`}
                tone="thermal"
              />
            </div>
          </div>

          <div className="pcEnergyChart">
            <div className="pcEnergyChartHeading">
              <span>Orçamento de energia</span>
              <strong>
                {evaluation.metrics.totalLoad} /{" "}
                {evaluation.metrics.psuWattage || 0} W
              </strong>
            </div>
            <div className="pcEnergyTrack">
              <i style={{ width: `${clampPercentage(powerLoad)}%` }} />
              <span
                style={{
                  left: `${clampPercentage(
                    evaluation.metrics.psuWattage
                      ? (evaluation.metrics.recommendedWattage /
                          evaluation.metrics.psuWattage) *
                          100
                      : 0
                  )}%`,
                }}
              />
            </div>
            <div className="pcEnergyLegend">
              <small>
                <i /> Carga atual
              </small>
              <small>
                <i /> Margem recomendada
              </small>
            </div>
          </div>

          <section className="pcIssueSection">
            <div className="pcIssueHeading">
              <span>
                <small>Scanner de compatibilidade</small>
                <strong>
                  {evaluation.errors.length > 0
                    ? "Atenção necessária"
                    : "Tudo conectado"}
                </strong>
              </span>
              <i data-clear={evaluation.errors.length === 0}>
                {evaluation.errors.length}
              </i>
            </div>
            <div className="pcIssueList">
              {evaluation.errors.slice(0, 5).map((item) => (
                <button
                  type="button"
                  key={item.code}
                  className="pcIssue error"
                  onClick={() =>
                    item.related[0] && onOpenCategory(item.related[0])
                  }
                >
                  <i aria-hidden="true">!</i>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                  </span>
                  <b aria-hidden="true">›</b>
                </button>
              ))}
              {evaluation.errors.length === 0 && (
                <div className="pcAllClear">
                  <i aria-hidden="true">✓</i>
                  <span>
                    <strong>Montagem aprovada</strong>
                    <small>Energia, conexões e temperatura conferidas.</small>
                  </span>
                </div>
              )}
            </div>
          </section>

          {evaluation.warnings.length > 0 && (
            <section className="pcIssueSection pcWarningsSection">
              <div className="pcIssueHeading">
                <span>
                  <small>Otimizações opcionais</small>
                  <strong>Ganhe mais desempenho</strong>
                </span>
                <i>{evaluation.warnings.length}</i>
              </div>
              {evaluation.warnings.slice(0, 3).map((item) => (
                <div className="pcIssue warning" key={item.code}>
                  <i aria-hidden="true">i</i>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                  </span>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
};
