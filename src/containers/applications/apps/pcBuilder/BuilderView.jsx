import React from "react";
import {
  PC_CATEGORIES,
  getPcPart,
} from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { PcCaseVisual } from "./PcCaseVisual";

const Metric = ({ label, value, suffix = "" }) => (
  <div className="pcMetric">
    <span>{label}</span>
    <strong>
      {value}
      {suffix}
    </strong>
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
}) => (
  <main className="pcBuilderView">
    <section className="pcBuilderHeading">
      <div>
        <span className="pcEyebrow">Bancada 01</span>
        <h1>Monte, verifique e ligue</h1>
        <p>
          Selecione cada peça e acompanhe as conexões, a energia e a temperatura
          em tempo real.
        </p>
      </div>
      <label className="pcBuildName">
        <span>Nome do computador</span>
        <input
          type="text"
          value={buildName}
          maxLength={80}
          onChange={(event) => onBuildNameChange(event.target.value)}
          aria-label="Nome do computador"
        />
      </label>
    </section>

    <div className="pcBuilderWorkspace">
      <aside className="pcPartsRail" aria-label="Componentes da montagem">
        <div className="pcPanelTitle">
          <span>Componentes</span>
          <strong>
            {Object.keys(selection).length}/{PC_CATEGORIES.length}
          </strong>
        </div>
        <div className="pcPartsList">
          {PC_CATEGORIES.map((category, index) => {
            const part = getPcPart(selection[category.id]);
            return (
              <button
                type="button"
                className={`pcPartSlot ${part ? "filled" : ""}`}
                key={category.id}
                onClick={() => onOpenCategory(category.id)}
              >
                <span className="pcPartIndex">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pcPartSlotText">
                  <small>{category.label}</small>
                  <strong>{part?.name || "Selecionar peça"}</strong>
                </span>
                <span className="pcPartState" aria-hidden="true">
                  {part ? "OK" : "+"}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="pcAssemblyStage" aria-label="Gabinete em montagem">
        <div className="pcStageHeader">
          <span>Vista interna</span>
          <div className="pcStageStatus" data-valid={evaluation.isValid}>
            <i />
            {evaluation.isValid
              ? "Pronto para teste"
              : `${evaluation.errors.length} verificação(ões)`}
          </div>
        </div>
        <PcCaseVisual
          evaluation={evaluation}
          selection={selection}
          onOpenCategory={onOpenCategory}
        />
        <div className="pcStageActions">
          <button type="button" className="pcResetButton" onClick={onReset}>
            Limpar bancada
          </button>
          <button
            type="button"
            className="pcPowerButton"
            disabled={saving}
            onClick={onPowerOn}
          >
            <span className="pcPowerIcon" aria-hidden="true" />
            {saving ? "Registrando teste..." : "Ligar computador"}
          </button>
        </div>
      </section>

      <aside className="pcDiagnostics" aria-label="Diagnóstico da montagem">
        <div className="pcPanelTitle">
          <span>Diagnóstico ao vivo</span>
          <strong data-valid={evaluation.isValid}>
            {evaluation.isValid ? "APROVADO" : "REVISAR"}
          </strong>
        </div>
        <div className="pcMetricsGrid">
          <Metric
            label="Carga estimada"
            value={evaluation.metrics.totalLoad}
            suffix=" W"
          />
          <Metric
            label="Fonte instalada"
            value={evaluation.metrics.psuWattage || "—"}
            suffix={evaluation.metrics.psuWattage ? " W" : ""}
          />
          <Metric
            label="Fluxo de ar"
            value={`${evaluation.metrics.airflowAvailable}/${evaluation.metrics.airflowRequired}`}
          />
          <Metric
            label="Desempenho"
            value={evaluation.metrics.performanceScore}
            suffix="/100"
          />
        </div>

        <div className="pcIssueSection">
          <div className="pcIssueHeading">
            <span>Falhas críticas</span>
            <strong>{evaluation.errors.length}</strong>
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
              </button>
            ))}
            {evaluation.errors.length === 0 && (
              <div className="pcAllClear">
                <i aria-hidden="true">✓</i>
                <span>
                  <strong>Todas as conexões conferidas</strong>
                  <small>O teste de energia pode ser iniciado.</small>
                </span>
              </div>
            )}
          </div>
        </div>

        {evaluation.warnings.length > 0 && (
          <div className="pcIssueSection warnings">
            <div className="pcIssueHeading">
              <span>Ajustes de desempenho</span>
              <strong>{evaluation.warnings.length}</strong>
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
          </div>
        )}
      </aside>
    </div>
  </main>
);
