import React, { useMemo, useState } from "react";
import {
  PC_CATEGORIES,
  getPcPart,
} from "../../../../../server/domain/pcBuilderCatalog.mjs";
import { ComponentArtwork } from "./ComponentArtwork";

const ASSEMBLY_CATEGORIES = [
  "motherboard",
  "psu",
  "storage",
  "gpu",
  "ram",
  "cpu",
  "cooler",
  "cooling",
];

const VisualSlot = ({ category, part, onOpen }) => {
  const categoryInfo = PC_CATEGORIES.find((item) => item.id === category);
  const label = categoryInfo?.label || category;

  return (
    <button
      type="button"
      className={`pcBlueprintSlot pcBlueprint-${category}`}
      data-category={category}
      data-installed={Boolean(part)}
      onClick={() => onOpen(category)}
      aria-label={part ? `${label}: ${part.name}` : `Instalar ${label}`}
    >
      <ComponentArtwork category={category} part={part} />
      <span className="pcBlueprintSlotLabel">
        <small>{categoryInfo?.shortLabel}</small>
        <strong>{part?.name || `Instalar ${label.toLowerCase()}`}</strong>
      </span>
      <i aria-hidden="true">{part ? "✓" : "+"}</i>
    </button>
  );
};

const MonitorPreview = ({ evaluation, os, gpu }) => (
  <div className="pcStudioMonitor" data-ready={evaluation.isValid}>
    <div className="pcStudioMonitorScreen">
      <span className="pcStudioMonitorGlow" aria-hidden="true" />
      {evaluation.isValid ? (
        <>
          <ComponentArtwork category="os" part={os} />
          <strong>VÍDEO PRONTO</strong>
          <small>{os?.name || "Sistema detectado"}</small>
        </>
      ) : (
        <>
          <span className="pcNoSignalGlyph" aria-hidden="true">
            !
          </span>
          <strong>SEM SINAL</strong>
          <small>{gpu?.name || "Saída de vídeo pendente"}</small>
        </>
      )}
    </div>
    <span className="pcStudioMonitorNeck" />
    <span className="pcStudioMonitorBase" />
  </div>
);

const BlueprintView = ({ evaluation, parts, onOpenCategory }) => (
  <div className="pcBlueprintView">
    <div className="pcBlueprintLegend">
      <span>
        <i className="installed" /> Peça instalada
      </span>
      <span>
        <i /> Slot disponível
      </span>
    </div>
    <div className="pcBlueprintDesk">
      <div className="pcBlueprintGrid" aria-hidden="true" />
      <div className="pcBlueprintCase">
        <div className="pcBlueprintCaseHeader">
          <span>{parts.case?.name || "Escolha um gabinete"}</span>
          <button type="button" onClick={() => onOpenCategory("case")}>
            {parts.case ? "Trocar" : "Instalar"}
          </button>
        </div>
        {ASSEMBLY_CATEGORIES.map((category) => (
          <VisualSlot
            key={category}
            category={category}
            part={parts[category]}
            onOpen={onOpenCategory}
          />
        ))}
        <svg
          className="pcBlueprintWires"
          viewBox="0 0 600 420"
          aria-hidden="true"
        >
          <path d="M430 320C390 290 388 210 344 185S255 160 230 116" />
          <path d="M430 340C360 348 310 322 266 292S180 280 130 300" />
          <path d="M450 300C430 230 464 186 410 142" />
        </svg>
      </div>
      <MonitorPreview evaluation={evaluation} os={parts.os} gpu={parts.gpu} />
    </div>
  </div>
);

const ThreeDimensionalView = ({
  evaluation,
  exploded,
  parts,
  rotation,
  onOpenCategory,
}) => (
  <div className="pcThreeDimensionalView" data-exploded={exploded}>
    <div className="pcThreeSceneFloor" aria-hidden="true" />
    <div
      className="pcThreeRig"
      style={{ "--pc-three-rotation": `${rotation}deg` }}
    >
      <div className="pcThreeCase">
        <div className="pcThreePanel pcThreePanelBack" />
        <div className="pcThreePanel pcThreePanelBottom" />
        <div className="pcThreePanel pcThreePanelTop" />
        <div className="pcThreePanel pcThreePanelFront">
          <span className="pcThreePowerLight" data-ready={evaluation.isValid} />
          <span className="pcThreeFrontMesh" />
        </div>
        <div className="pcThreePanel pcThreePanelGlass" />

        {ASSEMBLY_CATEGORIES.map((category, index) => {
          const part = parts[category];
          const categoryInfo = PC_CATEGORIES.find(
            (item) => item.id === category
          );
          return (
            <button
              type="button"
              key={category}
              className={`pcThreePart pcThree-${category}`}
              data-category={category}
              data-installed={Boolean(part)}
              style={{ "--pc-layer": index }}
              onClick={() => onOpenCategory(category)}
              aria-label={
                part
                  ? `${categoryInfo.label}: ${part.name}`
                  : `Instalar ${categoryInfo.label}`
              }
            >
              <span className="pcThreePartArt">
                <ComponentArtwork category={category} part={part} />
              </span>
              <span className="pcThreePartTag">
                <small>{categoryInfo.shortLabel}</small>
                <strong>{part?.name || "Slot vazio"}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </div>

    <button
      type="button"
      className="pcThreeCaseSelector"
      onClick={() => onOpenCategory("case")}
    >
      <ComponentArtwork category="case" part={parts.case} />
      <span>
        <small>CHASSI</small>
        <strong>{parts.case?.name || "Selecionar gabinete"}</strong>
      </span>
    </button>

    <MonitorPreview evaluation={evaluation} os={parts.os} gpu={parts.gpu} />
  </div>
);

export const PcCaseVisual = ({ evaluation, selection, onOpenCategory }) => {
  const [viewMode, setViewMode] = useState("3d");
  const [rotation, setRotation] = useState(-22);
  const [exploded, setExploded] = useState(false);
  const parts = useMemo(
    () =>
      Object.fromEntries(
        PC_CATEGORIES.map(({ id }) => [id, getPcPart(selection[id])])
      ),
    [selection]
  );

  const rotate = (amount) => {
    setRotation((current) => Math.max(-58, Math.min(25, current + amount)));
  };

  return (
    <div className="pcVisualExperience" data-view={viewMode}>
      <div className="pcCameraToolbar">
        <div className="pcViewSwitcher" aria-label="Modo de visualização">
          <button
            type="button"
            aria-pressed={viewMode === "2d"}
            onClick={() => setViewMode("2d")}
          >
            <span aria-hidden="true">▦</span>
            Vista 2D
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "3d"}
            onClick={() => setViewMode("3d")}
          >
            <span aria-hidden="true">◇</span>
            Vista 3D
          </button>
        </div>

        {viewMode === "3d" && (
          <div className="pcThreeControls">
            <button
              type="button"
              onClick={() => rotate(-12)}
              aria-label="Girar para a esquerda"
            >
              ↶
            </button>
            <button
              type="button"
              aria-pressed={exploded}
              onClick={() => setExploded((current) => !current)}
            >
              {exploded ? "Agrupar peças" : "Explodir peças"}
            </button>
            <button
              type="button"
              onClick={() => rotate(12)}
              aria-label="Girar para a direita"
            >
              ↷
            </button>
          </div>
        )}
      </div>

      <div className="pcCameraReadout" aria-hidden="true">
        <span>CAM 01</span>
        <i />
        <span>{viewMode === "3d" ? `${rotation}°` : "PLANTA"}</span>
      </div>

      {viewMode === "2d" ? (
        <BlueprintView
          evaluation={evaluation}
          parts={parts}
          onOpenCategory={onOpenCategory}
        />
      ) : (
        <ThreeDimensionalView
          evaluation={evaluation}
          exploded={exploded}
          parts={parts}
          rotation={rotation}
          onOpenCategory={onOpenCategory}
        />
      )}
    </div>
  );
};
