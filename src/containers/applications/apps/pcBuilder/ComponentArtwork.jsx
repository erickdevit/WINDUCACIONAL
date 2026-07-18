import React, { useId } from "react";

const CATEGORY_LABELS = {
  case: "Gabinete",
  motherboard: "Placa-mãe",
  cpu: "Processador",
  cooler: "Cooler",
  ram: "Memória RAM",
  gpu: "Placa de vídeo",
  storage: "Armazenamento",
  psu: "Fonte de alimentação",
  cooling: "Ventoinhas",
  os: "Sistema operacional",
};

const CircuitPaths = () => (
  <g className="pcArtCircuit" fill="none" stroke="currentColor">
    <path d="M16 24h18l8 8h18" />
    <path d="M15 68h22l8-8h22" />
    <path d="M61 17v12l8 8h16" />
    <path d="M65 74h20" />
    <circle cx="14" cy="24" r="2" />
    <circle cx="14" cy="68" r="2" />
    <circle cx="88" cy="37" r="2" />
    <circle cx="88" cy="74" r="2" />
  </g>
);

const Fan = ({ cx = 50, cy = 50, radius = 24 }) => (
  <g className="pcArtFan" transform={`translate(${cx} ${cy})`}>
    <circle r={radius} className="pcArtFanRing" />
    <g className="pcArtFanBlades">
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path
          key={angle}
          d={`M 0 -3 C ${radius * 0.12} ${-radius * 0.85}, ${radius * 0.58} ${
            -radius * 0.78
          }, ${radius * 0.62} ${-radius * 0.36} C ${radius * 0.42} ${
            -radius * 0.14
          }, ${radius * 0.16} -1, 0 -3 Z`}
          transform={`rotate(${angle})`}
        />
      ))}
    </g>
    <circle r="7" className="pcArtFanHub" />
    <circle r="2.5" className="pcArtFanCore" />
  </g>
);

const CaseArtwork = () => (
  <g className="pcArtCase">
    <path d="M26 12h50l9 8v61l-9 8H26l-9-8V20z" className="pcArtShell" />
    <path d="M26 18h43v63H26z" className="pcArtGlass" />
    <path d="M73 22h7v55h-7z" className="pcArtVent" />
    <Fan cx={49} cy={48} radius={19} />
    <circle cx="78" cy="17" r="2" className="pcArtLed" />
    <path d="M29 89v4M72 89v4" className="pcArtFeet" />
  </g>
);

const MotherboardArtwork = () => (
  <g className="pcArtMotherboard">
    <path d="M13 13h74v74H13z" className="pcArtBoard" />
    <CircuitPaths />
    <rect x="30" y="28" width="27" height="27" rx="3" className="pcArtSocket" />
    <rect x="34" y="32" width="19" height="19" rx="2" className="pcArtChip" />
    <path d="M66 22v39M72 22v39" className="pcArtRamSlots" />
    <path d="M24 71h52" className="pcArtPcie" />
    <rect x="17" y="18" width="7" height="29" rx="1" className="pcArtIo" />
    <circle cx="76" cy="77" r="5" className="pcArtBattery" />
  </g>
);

const CpuArtwork = () => (
  <g className="pcArtCpu">
    <rect
      x="19"
      y="19"
      width="62"
      height="62"
      rx="9"
      className="pcArtCpuBoard"
    />
    <rect
      x="28"
      y="28"
      width="44"
      height="44"
      rx="7"
      className="pcArtCpuPlate"
    />
    <path d="M35 44h30M35 51h30M40 58h20" className="pcArtCpuMark" />
    {[26, 38, 50, 62, 74].map((position) => (
      <React.Fragment key={position}>
        <path d={`M${position} 14v5M${position} 81v5`} className="pcArtPins" />
        <path d={`M14 ${position}h5M81 ${position}h5`} className="pcArtPins" />
      </React.Fragment>
    ))}
  </g>
);

const CoolerArtwork = ({ liquid }) =>
  liquid ? (
    <g className="pcArtCooler pcArtLiquid">
      <rect
        x="10"
        y="22"
        width="80"
        height="55"
        rx="6"
        className="pcArtRadiator"
      />
      <Fan cx={34} cy={49} radius={20} />
      <Fan cx={66} cy={49} radius={20} />
      <path
        d="M44 74c0 13 24 7 25 17M56 74c0 10 20 5 21 16"
        className="pcArtTube"
      />
      <circle cx="78" cy="89" r="9" className="pcArtPump" />
    </g>
  ) : (
    <g className="pcArtCooler pcArtAirCooler">
      <path d="M25 19h50v62H25z" className="pcArtHeatsink" />
      {[28, 36, 44, 52, 60, 68, 76].map((y) => (
        <path key={y} d={`M21 ${y}h58`} className="pcArtFin" />
      ))}
      <Fan cx={50} cy={50} radius={25} />
      <path d="M36 81v10M64 81v10" className="pcArtHeatpipe" />
    </g>
  );

const RamArtwork = ({ ddr5 }) => (
  <g className="pcArtRam">
    <path d="M8 31h84v38H8z" className="pcArtRamBoard" />
    <path d="M14 26h72l6 9H8z" className="pcArtRamSpine" />
    {[18, 33, 48, 63, 78].map((x) => (
      <rect
        key={x}
        x={x}
        y="41"
        width="11"
        height="17"
        rx="2"
        className="pcArtMemoryChip"
      />
    ))}
    <path
      d="M14 69v6M20 69v6M26 69v6M32 69v6M38 69v6M44 69v6M56 69v6M62 69v6M68 69v6M74 69v6M80 69v6M86 69v6"
      className="pcArtContacts"
    />
    <text x="50" y="38" textAnchor="middle" className="pcArtMicroLabel">
      {ddr5 ? "DDR5" : "DDR4"}
    </text>
  </g>
);

const GpuArtwork = ({ integrated }) =>
  integrated ? (
    <g className="pcArtIntegrated">
      <CpuArtwork />
      <path d="M32 65l8-10 8 7 9-15 12 18z" className="pcArtDisplayGraph" />
    </g>
  ) : (
    <g className="pcArtGpu">
      <path d="M7 24h82v52H7z" className="pcArtGpuBody" />
      <path d="M89 32h5v35h-5z" className="pcArtGpuBracket" />
      <Fan cx={33} cy={50} radius={20} />
      <Fan cx={66} cy={50} radius={17} />
      <path d="M18 76v7h48v-7M71 76v7h12" className="pcArtGpuContacts" />
      <path d="M15 29h64" className="pcArtGpuLight" />
    </g>
  );

const StorageArtwork = ({ part }) => {
  const isNvme = part?.interface === "M2";
  const isHdd = part?.id?.includes("hdd");
  if (isNvme) {
    return (
      <g className="pcArtNvme">
        <path d="M8 38h84v25H8z" className="pcArtStorageBoard" />
        <circle cx="85" cy="50.5" r="3" className="pcArtScrew" />
        <rect
          x="17"
          y="43"
          width="19"
          height="15"
          rx="2"
          className="pcArtStorageChip"
        />
        <rect
          x="41"
          y="43"
          width="14"
          height="15"
          rx="2"
          className="pcArtStorageChip"
        />
        <rect
          x="59"
          y="43"
          width="14"
          height="15"
          rx="2"
          className="pcArtStorageChip"
        />
        <path d="M8 40v21M13 40v21" className="pcArtContacts" />
        <text x="49" y="34" textAnchor="middle" className="pcArtMicroLabel">
          NVMe
        </text>
      </g>
    );
  }
  return (
    <g className={isHdd ? "pcArtHdd" : "pcArtSsd"}>
      <rect
        x="17"
        y="17"
        width="66"
        height="66"
        rx="8"
        className="pcArtDriveBody"
      />
      {isHdd ? (
        <>
          <circle cx="50" cy="49" r="23" className="pcArtPlatter" />
          <circle cx="50" cy="49" r="6" className="pcArtHub" />
          <path d="M72 66L55 52M72 66h8" className="pcArtDriveArm" />
        </>
      ) : (
        <>
          <path d="M31 36h38v28H31z" className="pcArtSsdPlate" />
          <path d="M37 43h26M37 50h19M37 57h23" className="pcArtSsdMark" />
        </>
      )}
      <path d="M33 83v5h28v-5" className="pcArtDrivePort" />
    </g>
  );
};

const PsuArtwork = () => (
  <g className="pcArtPsu">
    <path d="M14 21h72v61H14z" className="pcArtPsuBody" />
    <Fan cx={48} cy={50} radius={24} />
    <path d="M76 32h5v26h-5z" className="pcArtPsuSwitch" />
    <path d="M74 67h8M74 73h8" className="pcArtPsuPorts" />
    <path d="M20 82l-7 8M29 82l-2 10M38 82l4 9" className="pcArtPsuCables" />
  </g>
);

const CoolingArtwork = ({ count = 2 }) => (
  <g className="pcArtCooling">
    {count === 0 ? (
      <>
        <circle cx="50" cy="50" r="30" className="pcArtEmptyFan" />
        <path d="M29 29l42 42" className="pcArtEmptySlash" />
      </>
    ) : (
      Array.from({ length: Math.min(count, 4) }, (_, index) => {
        const positions = [
          [32, 32],
          [68, 32],
          [32, 68],
          [68, 68],
        ];
        const [cx, cy] = positions[index];
        return <Fan key={index} cx={cx} cy={cy} radius={19} />;
      })
    )}
  </g>
);

const OsArtwork = () => (
  <g className="pcArtOs">
    <path d="M15 17h70v66H15z" className="pcArtOsScreen" />
    <path
      d="M27 29l20-3v22H27zM51 25l23-4v27H51zM27 52h20v22l-20-3zM51 52h23v27l-23-4z"
      className="pcArtWindows"
    />
    <path d="M38 83v7M62 83v7M30 90h40" className="pcArtOsStand" />
  </g>
);

const renderArtwork = (category, part) => {
  switch (category) {
    case "case":
      return <CaseArtwork />;
    case "motherboard":
      return <MotherboardArtwork />;
    case "cpu":
      return <CpuArtwork />;
    case "cooler":
      return <CoolerArtwork liquid={part?.type === "liquid"} />;
    case "ram":
      return <RamArtwork ddr5={part?.memoryType === "DDR5"} />;
    case "gpu":
      return <GpuArtwork integrated={part?.kind === "integrated"} />;
    case "storage":
      return <StorageArtwork part={part} />;
    case "psu":
      return <PsuArtwork />;
    case "cooling":
      return <CoolingArtwork count={part?.count ?? 2} />;
    case "os":
      return <OsArtwork />;
    default:
      return <CircuitPaths />;
  }
};

export const ComponentArtwork = ({ category, part, className = "" }) => {
  const rawId = useId();
  const gradientId = `pc-art-${rawId.replace(/:/g, "")}`;
  const label = part?.name || CATEGORY_LABELS[category] || "Componente";

  return (
    <svg
      className={`pcComponentArtwork ${className}`.trim()}
      data-category={category}
      data-installed={Boolean(part)}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <g style={{ "--pc-art-gradient": `url(#${gradientId})` }}>
        {renderArtwork(category, part)}
      </g>
    </svg>
  );
};

export const getCategoryLabel = (category) =>
  CATEGORY_LABELS[category] || category;
