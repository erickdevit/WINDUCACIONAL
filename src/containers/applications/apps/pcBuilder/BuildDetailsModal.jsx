import React from "react";
import {
  PC_CATEGORIES,
  getPcPart,
} from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { ComponentArtwork } from "./ComponentArtwork";

const formatDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));

export const BuildDetailsModal = ({ build, onClose, onDelete }) => {
  const success = build.outcome === "success";
  const issues = build.validation?.errors || [];
  const warnings = build.validation?.warnings || [];
  const metrics = build.validation?.metrics || {};
  const pcCase = getPcPart(build.components?.case);
  const gpu = getPcPart(build.components?.gpu);

  return (
    <div className="pcModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="pcDetailsModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-build-details-title"
        data-success={success}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pcDetailsHero">
          <div className="pcDetailsHeroArt">
            <ComponentArtwork category="case" part={pcCase} />
            <span>
              <ComponentArtwork category="gpu" part={gpu} />
            </span>
            <i aria-hidden="true">{success ? "✓" : "!"}</i>
          </div>
          <div className="pcDetailsHeroCopy">
            <span className="pcEyebrow">Projeto salvo na galeria</span>
            <h2 id="pc-build-details-title">{build.name}</h2>
            <p>{formatDate(build.createdAt)}</p>
            <span className="pcDetailsOutcome">
              <i aria-hidden="true" />
              {success
                ? "Windows iniciado com sucesso"
                : "Falha no teste de energia"}
            </span>
          </div>
          <button type="button" className="pcModalClose" onClick={onClose}>
            <span aria-hidden="true">×</span>
            Fechar
          </button>
        </header>

        <div className="pcDetailsBody">
          <section className="pcDetailsParts">
            <div className="pcDetailsSectionHeading">
              <span>
                <small>Configuração completa</small>
                <h3>Peças instaladas</h3>
              </span>
              <strong>{Object.keys(build.components || {}).length}/10</strong>
            </div>
            <div className="pcDetailsPartsGrid">
              {PC_CATEGORIES.map((category) => {
                const part = getPcPart(build.components?.[category.id]);
                return (
                  <article
                    key={category.id}
                    data-category={category.id}
                    data-installed={Boolean(part)}
                  >
                    <span className="pcDetailsPartArt">
                      <ComponentArtwork category={category.id} part={part} />
                    </span>
                    <span>
                      <small>{category.label}</small>
                      <strong>{part?.name || "Não instalado"}</strong>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="pcDetailsReport">
            <div className="pcDetailsSectionHeading">
              <span>
                <small>Leitura da bancada</small>
                <h3>Relatório do teste</h3>
              </span>
            </div>

            <div className="pcDetailsMetrics">
              <span>
                <i
                  style={{
                    "--metric": `${Math.min(
                      100,
                      (metrics.totalLoad / (metrics.psuWattage || 1)) * 100
                    )}%`,
                  }}
                />
                <small>Carga elétrica</small>
                <strong>{metrics.totalLoad || 0} W</strong>
              </span>
              <span>
                <i
                  style={{ "--metric": `${metrics.performanceScore || 0}%` }}
                />
                <small>Desempenho</small>
                <strong>{metrics.performanceScore || 0}/100</strong>
              </span>
              <span>
                <i
                  style={{
                    "--metric": `${Math.min(
                      100,
                      ((metrics.airflowAvailable || 0) /
                        (metrics.airflowRequired || 1)) *
                        100
                    )}%`,
                  }}
                />
                <small>Refrigeração</small>
                <strong>
                  {metrics.airflowAvailable || 0}/{metrics.airflowRequired || 0}
                </strong>
              </span>
            </div>

            {[...issues, ...warnings].length > 0 ? (
              <div className="pcDetailsIssues">
                <div className="pcDetailsIssuesHeading">
                  <strong>Diagnósticos encontrados</strong>
                  <span>
                    {issues.length} falhas · {warnings.length} alertas
                  </span>
                </div>
                {[...issues, ...warnings].map((item) => (
                  <article
                    key={item.code}
                    data-level={issues.includes(item) ? "error" : "warning"}
                  >
                    <i aria-hidden="true">
                      {issues.includes(item) ? "!" : "i"}
                    </i>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.message}</small>
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="pcDetailsAllClear">
                <i aria-hidden="true">✓</i>
                <span>
                  <strong>Projeto impecável</strong>
                  <small>Nenhuma incompatibilidade encontrada.</small>
                </span>
              </div>
            )}
          </aside>
        </div>
        <footer>
          <button type="button" className="pcDeleteButton" onClick={onDelete}>
            Excluir da galeria
          </button>
          <button type="button" className="pcInstallButton" onClick={onClose}>
            Concluir revisão
          </button>
        </footer>
      </section>
    </div>
  );
};
