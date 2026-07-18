import React, { useEffect, useMemo, useState } from "react";
import {
  PC_CATEGORIES,
  getPcPartsByCategory,
} from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { validatePcBuild } from "../../../../../server/domain/pcBuilderRules.mjs";
import { ComponentArtwork } from "./ComponentArtwork";

const getConflicts = (category, partId, selection) =>
  validatePcBuild({ ...selection, [category]: partId }).errors.filter(
    (item) =>
      item.related.includes(category) && !item.code.startsWith("MISSING_")
  );

export const PartCatalogModal = ({
  category,
  selection,
  onClose,
  onSelect,
}) => {
  const categoryInfo = PC_CATEGORIES.find((item) => item.id === category);
  const parts = getPcPartsByCategory(category);
  const initialPartId = selection[category] || parts[0]?.id;
  const [previewPartId, setPreviewPartId] = useState(initialPartId);

  useEffect(() => {
    setPreviewPartId(selection[category] || parts[0]?.id);
  }, [category, selection[category]]);

  const previewPart =
    parts.find((part) => part.id === previewPartId) || parts[0];
  const previewConflicts = useMemo(
    () =>
      previewPart ? getConflicts(category, previewPart.id, selection) : [],
    [category, previewPart?.id, selection]
  );
  const selected = selection[category] === previewPart?.id;

  return (
    <div className="pcModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="pcPartModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-part-modal-title"
        data-category={category}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pcCatalogHeader">
          <div className="pcCatalogBreadcrumb">
            <span className="pcCatalogCategoryIndex">
              {String(
                PC_CATEGORIES.findIndex((item) => item.id === category) + 1
              ).padStart(2, "0")}
            </span>
            <span>
              <small>Laboratório de componentes</small>
              <strong id="pc-part-modal-title">
                Escolha: {categoryInfo?.label}
              </strong>
            </span>
          </div>
          <div className="pcCatalogStepTrack" aria-hidden="true">
            {PC_CATEGORIES.map((item) => (
              <i
                key={item.id}
                data-current={item.id === category}
                data-complete={Boolean(selection[item.id])}
              />
            ))}
          </div>
          <button type="button" className="pcModalClose" onClick={onClose}>
            <span aria-hidden="true">×</span>
            Fechar
          </button>
        </header>

        <div className="pcCatalogBody">
          <aside className="pcCatalogSpotlight">
            <div className="pcSpotlightBackdrop" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="pcSpotlightArt">
              <span className="pcSpotlightBadge">{previewPart?.badge}</span>
              <ComponentArtwork category={category} part={previewPart} />
              <span className="pcSpotlightOrbit" aria-hidden="true" />
            </div>
            <div className="pcSpotlightCopy">
              <span className="pcEyebrow">Em destaque</span>
              <h2>{previewPart?.name}</h2>
              <p>{previewPart?.description}</p>
              <div className="pcSpotlightConnection">
                <span aria-hidden="true">↯</span>
                <div>
                  <small>Como esta peça se conecta</small>
                  <strong>{previewPart?.connection}</strong>
                </div>
              </div>
            </div>

            <div
              className="pcCompatibilityPreview"
              data-compatible={previewConflicts.length === 0}
            >
              <i aria-hidden="true">
                {previewConflicts.length > 0 ? "!" : "✓"}
              </i>
              <span>
                <strong>
                  {previewConflicts.length > 0
                    ? previewConflicts[0].title
                    : "Compatível com sua montagem"}
                </strong>
                <small>
                  {previewConflicts.length > 0
                    ? previewConflicts[0].message
                    : "Nenhum conflito detectado com as peças já instaladas."}
                </small>
              </span>
            </div>

            <button
              type="button"
              className="pcInstallButton pcSpotlightInstall"
              onClick={() => onSelect(category, previewPart.id)}
            >
              <span aria-hidden="true">{selected ? "✓" : "+"}</span>
              <span>
                <small>
                  {selected ? "Já está na bancada" : "Adicionar ao projeto"}
                </small>
                <strong>
                  {selected ? "Manter esta peça" : "Instalar componente"}
                </strong>
              </span>
            </button>
          </aside>

          <section className="pcCatalogOptions">
            <div className="pcCatalogOptionsHeading">
              <div>
                <span className="pcEyebrow">Catálogo visual</span>
                <h3>{parts.length} opções disponíveis</h3>
              </div>
              <p>{categoryInfo?.description}</p>
            </div>

            <div className="pcPartCatalogGrid">
              {parts.map((part) => {
                const conflicts = getConflicts(category, part.id, selection);
                const isSelected = selection[category] === part.id;
                const isPreview = previewPart?.id === part.id;

                return (
                  <button
                    type="button"
                    className="pcCatalogCard"
                    data-selected={isSelected}
                    data-preview={isPreview}
                    data-compatible={conflicts.length === 0}
                    key={part.id}
                    onClick={() => setPreviewPartId(part.id)}
                  >
                    <span className="pcCatalogCardVisual">
                      <ComponentArtwork category={category} part={part} />
                      <i aria-hidden="true">
                        {isSelected ? "INSTALADO" : part.badge}
                      </i>
                    </span>
                    <span className="pcCatalogCardCopy">
                      <strong>{part.name}</strong>
                      <small>{part.displaySpecs.slice(0, 2).join(" · ")}</small>
                    </span>
                    <span className="pcCatalogCardStatus">
                      <i aria-hidden="true">
                        {conflicts.length > 0 ? "!" : "✓"}
                      </i>
                      <small>
                        {conflicts.length > 0 ? "Requer atenção" : "Compatível"}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pcSpecRibbon">
              <span>Especificações de {previewPart?.name}</span>
              <div>
                {previewPart?.displaySpecs.map((spec) => (
                  <strong key={spec}>{spec}</strong>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
