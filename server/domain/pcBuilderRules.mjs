import {
  PC_CATEGORIES,
  PC_PARTS_BY_ID,
  getPcPart,
} from "./pcBuilderCatalog.mjs";

const issue = (code, title, message, related = []) => ({
  code,
  title,
  message,
  related,
});

const categoryIds = new Set(PC_CATEGORIES.map((category) => category.id));

export const sanitizePcSelection = (value) => {
  const selection = {};
  const invalid = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { selection, invalid: ["A montagem deve ser um objeto."] };
  }

  for (const [category, rawId] of Object.entries(value)) {
    if (!categoryIds.has(category)) continue;
    if (typeof rawId !== "string" || rawId.length > 80) {
      invalid.push(`A peça informada para ${category} é inválida.`);
      continue;
    }
    const part = PC_PARTS_BY_ID.get(rawId);
    if (!part || part.category !== category) {
      invalid.push(`A peça ${rawId} não pertence à categoria ${category}.`);
      continue;
    }
    selection[category] = rawId;
  }

  return { selection, invalid };
};

const getCpuMemoryLimit = (cpu, memoryType) => {
  if (!cpu) return 0;
  if (cpu.maxMemorySpeedByType) {
    return Number(cpu.maxMemorySpeedByType[memoryType] || 0);
  }
  return Number(cpu.maxMemorySpeed || 0);
};

export const validatePcBuild = (rawSelection = {}) => {
  const { selection, invalid } = sanitizePcSelection(rawSelection);
  const parts = Object.fromEntries(
    PC_CATEGORIES.map(({ id }) => [id, getPcPart(selection[id])])
  );
  const errors = invalid.map((message, index) =>
    issue(`INVALID_${index}`, "Peça desconhecida", message)
  );
  const warnings = [];

  for (const category of PC_CATEGORIES) {
    if (!parts[category.id]) {
      errors.push(
        issue(
          `MISSING_${category.id.toUpperCase()}`,
          `${category.label} ausente`,
          `Instale ${category.label.toLowerCase()} antes de ligar o computador.`,
          [category.id]
        )
      );
    }
  }

  const pcCase = parts.case;
  const motherboard = parts.motherboard;
  const cpu = parts.cpu;
  const cooler = parts.cooler;
  const ram = parts.ram;
  const gpu = parts.gpu;
  const storage = parts.storage;
  const psu = parts.psu;
  const cooling = parts.cooling;
  const os = parts.os;

  if (
    pcCase &&
    motherboard &&
    !pcCase.formFactors.includes(motherboard.formFactor)
  ) {
    errors.push(
      issue(
        "CASE_MOTHERBOARD",
        "Placa-mãe não cabe",
        `O gabinete aceita ${pcCase.formFactors.join(
          ", "
        )}, mas a placa-mãe é ${motherboard.formFactor}.`,
        ["case", "motherboard"]
      )
    );
  }

  if (motherboard && cpu) {
    if (motherboard.socket !== cpu.socket) {
      errors.push(
        issue(
          "CPU_SOCKET",
          "Soquetes incompatíveis",
          `A CPU usa ${cpu.socket}, enquanto a placa-mãe oferece ${motherboard.socket}.`,
          ["cpu", "motherboard"]
        )
      );
    } else if (!motherboard.cpuGenerations.includes(cpu.generation)) {
      errors.push(
        issue(
          "CPU_GENERATION",
          "Firmware sem suporte",
          "A geração do processador não é reconhecida pelo firmware desta placa-mãe.",
          ["cpu", "motherboard"]
        )
      );
    }
  }

  if (motherboard && ram) {
    if (motherboard.memoryType !== ram.memoryType) {
      errors.push(
        issue(
          "RAM_TYPE",
          "Tipo de memória incompatível",
          `A placa-mãe usa ${motherboard.memoryType}, mas o kit escolhido é ${ram.memoryType}.`,
          ["ram", "motherboard"]
        )
      );
    }
    if (ram.modules > motherboard.memorySlots) {
      errors.push(
        issue(
          "RAM_SLOTS",
          "Slots de memória insuficientes",
          `O kit usa ${ram.modules} módulos e a placa-mãe possui ${motherboard.memorySlots} slots.`,
          ["ram", "motherboard"]
        )
      );
    }
    if (ram.capacity > motherboard.maxMemory) {
      errors.push(
        issue(
          "RAM_CAPACITY",
          "Capacidade acima do limite",
          `A placa-mãe suporta até ${motherboard.maxMemory} GB de memória.`,
          ["ram", "motherboard"]
        )
      );
    }
  }

  if (cpu && ram && !cpu.memoryTypes.includes(ram.memoryType)) {
    errors.push(
      issue(
        "CPU_RAM_TYPE",
        "Controlador de memória incompatível",
        `O processador não trabalha com memória ${ram.memoryType}.`,
        ["cpu", "ram"]
      )
    );
  }

  if (motherboard && cpu && ram && motherboard.memoryType === ram.memoryType) {
    const cpuLimit = getCpuMemoryLimit(cpu, ram.memoryType);
    const effectiveSpeed = Math.min(
      ram.speed,
      motherboard.maxMemorySpeed,
      cpuLimit || ram.speed
    );
    if (effectiveSpeed < ram.speed) {
      warnings.push(
        issue(
          "RAM_DOWNCLOCK",
          "Memória reduzirá a velocidade",
          `O kit de ${ram.speed} MT/s funcionará a aproximadamente ${effectiveSpeed} MT/s pelos limites da plataforma.`,
          ["ram", "cpu", "motherboard"]
        )
      );
    }
    if (ram.modules === 1) {
      warnings.push(
        issue(
          "RAM_SINGLE_CHANNEL",
          "Memória em canal único",
          "Um único módulo reduz a largura de banda. Um kit com dois módulos aproveita o canal duplo.",
          ["ram"]
        )
      );
    }
  }

  if (cpu && cooler) {
    if (!cooler.sockets.includes(cpu.socket)) {
      errors.push(
        issue(
          "COOLER_SOCKET",
          "Cooler sem suporte ao soquete",
          `O cooler não inclui fixação para ${cpu.socket}.`,
          ["cooler", "cpu"]
        )
      );
    }
    if (cooler.maxPower < cpu.boostPower) {
      errors.push(
        issue(
          "COOLER_POWER",
          "Cooler subdimensionado",
          `A CPU pode chegar a ${cpu.boostPower} W, acima dos ${cooler.maxPower} W suportados pelo cooler.`,
          ["cooler", "cpu"]
        )
      );
    }
  }

  if (pcCase && cooler) {
    if (cooler.type === "air" && cooler.height > pcCase.maxCoolerHeight) {
      errors.push(
        issue(
          "COOLER_HEIGHT",
          "Cooler alto demais",
          `O cooler mede ${cooler.height} mm e o gabinete aceita até ${pcCase.maxCoolerHeight} mm.`,
          ["cooler", "case"]
        )
      );
    }
    if (
      cooler.type === "liquid" &&
      !pcCase.radiators.includes(cooler.radiator)
    ) {
      errors.push(
        issue(
          "RADIATOR_SIZE",
          "Radiador não cabe",
          `O gabinete não possui posição para radiador de ${cooler.radiator} mm.`,
          ["cooler", "case"]
        )
      );
    }
  }

  if (gpu && cpu && gpu.kind === "integrated" && !cpu.integratedGraphics) {
    errors.push(
      issue(
        "NO_VIDEO_OUTPUT",
        "Nenhuma saída de vídeo ativa",
        "O processador escolhido não possui vídeo integrado. Instale uma placa de vídeo dedicada.",
        ["gpu", "cpu"]
      )
    );
  }

  if (gpu?.kind === "dedicated" && pcCase && gpu.length > pcCase.maxGpuLength) {
    errors.push(
      issue(
        "GPU_LENGTH",
        "Placa de vídeo não cabe",
        `A placa mede ${gpu.length} mm e o gabinete aceita até ${pcCase.maxGpuLength} mm.`,
        ["gpu", "case"]
      )
    );
  }

  if (gpu?.kind === "dedicated" && motherboard) {
    if (gpu.pcieGeneration > motherboard.pcieGeneration) {
      warnings.push(
        issue(
          "GPU_PCIE_DOWNGRADE",
          "PCIe operará em geração anterior",
          `A placa de vídeo é PCIe ${gpu.pcieGeneration}.0 e funcionará no limite PCIe ${motherboard.pcieGeneration}.0 da placa-mãe.`,
          ["gpu", "motherboard"]
        )
      );
    }
  }

  if (storage && motherboard) {
    if (storage.interface === "M2" && motherboard.m2Slots < 1) {
      errors.push(
        issue(
          "STORAGE_M2_SLOT",
          "Slot M.2 ausente",
          "O SSD NVMe precisa de um slot M.2 disponível na placa-mãe.",
          ["storage", "motherboard"]
        )
      );
    }
    if (storage.interface === "SATA" && motherboard.sataPorts < 1) {
      errors.push(
        issue(
          "STORAGE_SATA_PORT",
          "Porta SATA ausente",
          "O disco SATA precisa de uma porta SATA disponível na placa-mãe.",
          ["storage", "motherboard"]
        )
      );
    }
    if (
      storage.interface === "M2" &&
      storage.generation > motherboard.m2Generation
    ) {
      warnings.push(
        issue(
          "STORAGE_DOWNGRADE",
          "SSD operará em geração anterior",
          `O SSD PCIe ${storage.generation}.0 ficará limitado ao PCIe ${motherboard.m2Generation}.0 do slot M.2.`,
          ["storage", "motherboard"]
        )
      );
    }
  }

  if (pcCase && psu && !pcCase.psuFormats.includes(psu.format)) {
    errors.push(
      issue(
        "PSU_FORMAT",
        "Formato de fonte incompatível",
        `O gabinete aceita fonte ${pcCase.psuFormats.join(
          " ou "
        )}, mas a fonte é ${psu.format}.`,
        ["psu", "case"]
      )
    );
  }

  if (psu && gpu?.kind === "dedicated") {
    if (psu.wattage < gpu.minPsu) {
      errors.push(
        issue(
          "GPU_MIN_PSU",
          "Fonte abaixo do mínimo da GPU",
          `A placa de vídeo pede fonte de pelo menos ${gpu.minPsu} W.`,
          ["psu", "gpu"]
        )
      );
    }
    for (const connector of gpu.connectors) {
      if (!psu.connectors[connector]) {
        errors.push(
          issue(
            `PSU_CONNECTOR_${connector.toUpperCase()}`,
            "Conector de energia ausente",
            `A fonte não possui o conector ${connector.toUpperCase()} exigido pela placa de vídeo.`,
            ["psu", "gpu"]
          )
        );
      }
    }
  }

  if (psu && storage?.interface === "SATA" && !psu.connectors.sata) {
    errors.push(
      issue(
        "PSU_SATA_CONNECTOR",
        "Energia SATA ausente",
        "O disco SATA precisa de um conector de energia SATA da fonte.",
        ["psu", "storage"]
      )
    );
  }

  if (
    pcCase &&
    cooling &&
    pcCase.includedFans + cooling.count > pcCase.maxFans
  ) {
    errors.push(
      issue(
        "FAN_CAPACITY",
        "Ventoinhas demais",
        `O gabinete comporta ${
          pcCase.maxFans
        } ventoinhas no total, mas a montagem usaria ${
          pcCase.includedFans + cooling.count
        }.`,
        ["cooling", "case"]
      )
    );
  }

  const cpuPower = Number(cpu?.boostPower || 0);
  const gpuPower = Number(gpu?.power || 0);
  const boardPower = motherboard ? 55 : 0;
  const memoryPower = Number(ram?.power || 0);
  const storagePower = Number(storage?.power || 0);
  const coolingPower =
    Number(cooling?.power || 0) + Number(pcCase?.includedFans || 0) * 2;
  const totalLoad =
    cpuPower +
    gpuPower +
    boardPower +
    memoryPower +
    storagePower +
    coolingPower;
  const recommendedWattage = Math.ceil((totalLoad * 1.3) / 10) * 10;

  if (psu && totalLoad > 0 && psu.wattage < recommendedWattage) {
    errors.push(
      issue(
        "PSU_HEADROOM",
        "Fonte sem margem segura",
        `A carga estimada é ${totalLoad} W. Use pelo menos ${recommendedWattage} W para manter 30% de margem.`,
        ["psu", "cpu", "gpu"]
      )
    );
  }

  const airflowAvailable =
    Number(pcCase?.airflow || 0) +
    Number(pcCase?.includedFans || 0) +
    Number(cooling?.airflow || 0);
  const airflowRequired =
    cpu || gpu ? Math.max(2, Math.ceil((cpuPower + gpuPower) / 55)) : 0;

  if (pcCase && cooling && airflowAvailable < airflowRequired) {
    errors.push(
      issue(
        "AIRFLOW",
        "Fluxo de ar insuficiente",
        `A montagem exige nível de fluxo ${airflowRequired}, mas o conjunto oferece ${airflowAvailable}.`,
        ["case", "cooling", "cpu", "gpu"]
      )
    );
  }

  if (os && storage && storage.capacity < os.minStorage) {
    errors.push(
      issue(
        "OS_STORAGE",
        "Disco pequeno para o sistema",
        `O sistema exige ao menos ${os.minStorage} GB de armazenamento.`,
        ["os", "storage"]
      )
    );
  }
  if (os && ram && ram.capacity < os.minMemory) {
    errors.push(
      issue(
        "OS_MEMORY",
        "Memória insuficiente para o sistema",
        `O sistema exige ao menos ${os.minMemory} GB de RAM.`,
        ["os", "ram"]
      )
    );
  }
  if (os && motherboard) {
    if (os.requiresUefi && !motherboard.uefi) {
      errors.push(
        issue(
          "OS_UEFI",
          "UEFI ausente",
          "O sistema exige inicialização UEFI.",
          ["os", "motherboard"]
        )
      );
    }
    if (os.requiresTpm && !motherboard.tpm) {
      errors.push(
        issue("OS_TPM", "TPM 2.0 ausente", "O sistema exige TPM 2.0 ativo.", [
          "os",
          "motherboard",
        ])
      );
    }
    if (os.requiresSecureBoot && !motherboard.secureBoot) {
      errors.push(
        issue(
          "OS_SECURE_BOOT",
          "Inicialização segura ausente",
          "O sistema exige Secure Boot disponível no firmware.",
          ["os", "motherboard"]
        )
      );
    }
  }

  if (cpu && gpu?.kind === "dedicated") {
    const difference = Math.abs(cpu.performance - gpu.performance);
    if (difference >= 4) {
      warnings.push(
        issue(
          "PERFORMANCE_BALANCE",
          "Desempenho desequilibrado",
          cpu.performance < gpu.performance
            ? "A CPU pode limitar a placa de vídeo em tarefas intensivas."
            : "A placa de vídeo pode limitar o potencial do processador em aplicações gráficas.",
          ["cpu", "gpu"]
        )
      );
    }
  }

  if (ram && ram.capacity < 16) {
    warnings.push(
      issue(
        "LOW_MEMORY",
        "Pouca memória para multitarefa",
        "O computador liga, mas 16 GB ou mais oferecem uma experiência mais confortável.",
        ["ram"]
      )
    );
  }

  const gpuPerformance =
    gpu?.kind === "integrated"
      ? Math.max(2, Number(cpu?.performance || 2) - 4)
      : Number(gpu?.performance || 0);
  const performanceScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number(cpu?.performance || 0) * 4.5 +
          gpuPerformance * 3.5 +
          Number(ram?.performance || 0) * 1.2 +
          Number(storage?.performance || 0) * 0.8
      )
    )
  );
  const bootSeconds = storage
    ? Math.max(7, Math.round(42 - Math.log10(storage.speed + 1) * 9))
    : 0;
  const thermalMargin = airflowAvailable - airflowRequired;

  return {
    isValid: errors.length === 0,
    outcome: errors.length === 0 ? "success" : "explosion",
    selection,
    parts,
    errors,
    warnings,
    metrics: {
      totalLoad,
      recommendedWattage,
      psuWattage: Number(psu?.wattage || 0),
      headroom: Number(psu?.wattage || 0) - totalLoad,
      airflowAvailable,
      airflowRequired,
      thermalMargin,
      performanceScore,
      bootSeconds,
    },
  };
};

export const getPcBuildSummary = (selection) => {
  const evaluation = validatePcBuild(selection);
  return {
    outcome: evaluation.outcome,
    errors: evaluation.errors,
    warnings: evaluation.warnings,
    metrics: evaluation.metrics,
  };
};
