import React from "react";
import { getPcPart } from "../../../../../server/domain/pcBuilderCatalog.mjs";

const VisualSlot = ({ category, className, label, part, onOpen }) => (
  <button
    type="button"
    className={`pcVisualSlot ${className} ${part ? "installed" : ""}`}
    onClick={() => onOpen(category)}
    title={part ? `${label}: ${part.name}` : `Instalar ${label.toLowerCase()}`}
  >
    <span>{part ? part.name : label}</span>
  </button>
);

export const PcCaseVisual = ({ evaluation, selection, onOpenCategory }) => {
  const parts = {
    case: getPcPart(selection.case),
    motherboard: getPcPart(selection.motherboard),
    cpu: getPcPart(selection.cpu),
    cooler: getPcPart(selection.cooler),
    ram: getPcPart(selection.ram),
    gpu: getPcPart(selection.gpu),
    storage: getPcPart(selection.storage),
    psu: getPcPart(selection.psu),
    cooling: getPcPart(selection.cooling),
  };

  return (
    <div className="pcVisualScene">
      <div className="pcWorkbenchLines" aria-hidden="true" />
      <div className="pcChassis" data-case={Boolean(parts.case)}>
        <div className="pcChassisTop">
          <span>{parts.case?.name || "Gabinete não instalado"}</span>
          <i className="pcStatusLight" data-valid={evaluation.isValid} />
        </div>
        <div className="pcCable cableOne" aria-hidden="true" />
        <div className="pcCable cableTwo" aria-hidden="true" />
        <VisualSlot
          category="motherboard"
          className="motherboard"
          label="Placa-mãe"
          part={parts.motherboard}
          onOpen={onOpenCategory}
        />
        <VisualSlot
          category="cpu"
          className="cpu"
          label="CPU"
          part={parts.cpu}
          onOpen={onOpenCategory}
        />
        <VisualSlot
          category="cooler"
          className="cooler"
          label="Cooler"
          part={parts.cooler}
          onOpen={onOpenCategory}
        />
        <VisualSlot
          category="ram"
          className="ram"
          label="RAM"
          part={parts.ram}
          onOpen={onOpenCategory}
        />
        <VisualSlot
          category="gpu"
          className="gpu"
          label="Vídeo"
          part={parts.gpu}
          onOpen={onOpenCategory}
        />
        <VisualSlot
          category="storage"
          className="storage"
          label="Disco"
          part={parts.storage}
          onOpen={onOpenCategory}
        />
        <VisualSlot
          category="psu"
          className="psu"
          label="Fonte"
          part={parts.psu}
          onOpen={onOpenCategory}
        />
        <VisualSlot
          category="cooling"
          className="fan fanOne"
          label="Fans"
          part={parts.cooling}
          onOpen={onOpenCategory}
        />
        <div className="pcChassisFeet" aria-hidden="true">
          <i />
          <i />
        </div>
      </div>

      <div className="pcMonitorPreview" data-ready={evaluation.isValid}>
        <div className="pcMonitorScreen">
          <span className="pcMonitorScan" aria-hidden="true" />
          <small>SAÍDA DE VÍDEO</small>
          <strong>{evaluation.isValid ? "SINAL PRONTO" : "SEM SINAL"}</strong>
          <i />
        </div>
        <div className="pcMonitorStand" />
      </div>
    </div>
  );
};
