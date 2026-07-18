import React from "react";
import {
  PC_CATEGORIES,
  getPcPartsByCategory,
} from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { validatePcBuild } from "../../../../../server/domain/pcBuilderRules.mjs";

export const PartCatalogModal = ({
  category,
  selection,
  onClose,
  onSelect,
}) => {
  const categoryInfo = PC_CATEGORIES.find((item) => item.id === category);
  const parts = getPcPartsByCategory(category);

  return (
    <div className="pcModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="pcPartModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-part-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="pcEyebrow">Catálogo de componentes</span>
            <h2 id="pc-part-modal-title">{categoryInfo?.label}</h2>
            <p>{categoryInfo?.description}</p>
          </div>
          <button type="button" className="pcModalClose" onClick={onClose}>
            Fechar
          </button>
        </header>
        <div className="pcPartCatalogGrid">
          {parts.map((part) => {
            const preview = validatePcBuild({
              ...selection,
              [category]: part.id,
            });
            const conflicts = preview.errors.filter(
              (item) =>
                item.related.includes(category) &&
                !item.code.startsWith("MISSING_")
            );
            const selected = selection[category] === part.id;

            return (
              <article
                className={`pcCatalogCard ${selected ? "selected" : ""}`}
                key={part.id}
              >
                <div className="pcCatalogCardTop">
                  <span>{part.badge}</span>
                  {selected && <strong>Instalado</strong>}
                </div>
                <h3>{part.name}</h3>
                <p>{part.description}</p>
                <div className="pcSpecChips">
                  {part.displaySpecs.map((spec) => (
                    <span key={spec}>{spec}</span>
                  ))}
                </div>
                <div className="pcConnectionNote">
                  <strong>Conexão</strong>
                  <span>{part.connection}</span>
                </div>
                <div
                  className={`pcCompatibilityPreview ${
                    conflicts.length > 0 ? "conflict" : "compatible"
                  }`}
                >
                  <i aria-hidden="true">{conflicts.length > 0 ? "!" : "✓"}</i>
                  <span>
                    <strong>
                      {conflicts.length > 0
                        ? conflicts[0].title
                        : "Sem conflito com as peças instaladas"}
                    </strong>
                    {conflicts.length > 0 && (
                      <small>{conflicts[0].message}</small>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  className="pcInstallButton"
                  onClick={() => onSelect(category, part.id)}
                >
                  {selected ? "Manter esta peça" : "Instalar componente"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
