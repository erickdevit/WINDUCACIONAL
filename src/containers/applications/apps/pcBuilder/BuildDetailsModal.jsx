import React from "react";
import {
  PC_CATEGORIES,
  getPcPart,
} from "../../../../../server/domain/pcBuilderCatalog.mjs";

const formatDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));

export const BuildDetailsModal = ({ build, onClose, onDelete }) => {
  const success = build.outcome === "success";
  const issues = build.validation?.errors || [];
  const warnings = build.validation?.warnings || [];

  return (
    <div className="pcModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="pcDetailsModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-build-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="pcEyebrow">Montagem salva</span>
            <h2 id="pc-build-details-title">{build.name}</h2>
            <p>{formatDate(build.createdAt)}</p>
          </div>
          <span className="pcDetailsOutcome" data-success={success}>
            {success ? "Windows iniciado" : "Falha de energia"}
          </span>
          <button type="button" className="pcModalClose" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="pcDetailsBody">
          <section className="pcDetailsParts">
            <h3>Peças instaladas</h3>
            <div>
              {PC_CATEGORIES.map((category) => {
                const part = getPcPart(build.components?.[category.id]);
                return (
                  <article key={category.id} data-installed={Boolean(part)}>
                    <span>{category.shortLabel}</span>
                    <div>
                      <small>{category.label}</small>
                      <strong>{part?.name || "Não instalado"}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="pcDetailsReport">
            <h3>Relatório do teste</h3>
            <div className="pcResultStats">
              <span>
                <small>Carga</small>
                <strong>{build.validation?.metrics?.totalLoad || 0} W</strong>
              </span>
              <span>
                <small>Fonte</small>
                <strong>{build.validation?.metrics?.psuWattage || 0} W</strong>
              </span>
              <span>
                <small>Nota</small>
                <strong>
                  {build.validation?.metrics?.performanceScore || 0}/100
                </strong>
              </span>
            </div>

            {[...issues, ...warnings].length > 0 ? (
              <div className="pcDetailsIssues">
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
                <strong>Nenhuma incompatibilidade encontrada.</strong>
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
