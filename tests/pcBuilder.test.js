import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  sanitizePcSelection,
  validatePcBuild,
} from "../server/domain/pcBuilderRules.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pcBuilderRoutes = require("../server/routes/pcBuilder.cjs");

const validBuild = {
  case: "case-airflow-510",
  motherboard: "mb-b650-atx",
  cpu: "cpu-ryzen-7700",
  cooler: "cooler-tower-180",
  ram: "ram-16-ddr5-5200",
  gpu: "gpu-3060",
  storage: "storage-nvme-gen4",
  psu: "psu-atx-750",
  cooling: "fans-kit-2",
  os: "os-windows-11-education",
};

describe("Montagem de PC - regras de compatibilidade", () => {
  it("aprova uma montagem completa, com energia e refrigeração suficientes", () => {
    const result = validatePcBuild(validBuild);

    expect(result.isValid).toBe(true);
    expect(result.outcome).toBe("success");
    expect(result.errors).toEqual([]);
    expect(result.metrics.psuWattage).toBeGreaterThanOrEqual(
      result.metrics.recommendedWattage
    );
    expect(result.metrics.airflowAvailable).toBeGreaterThanOrEqual(
      result.metrics.airflowRequired
    );
    expect(result.metrics.performanceScore).toBeGreaterThan(60);
  });

  it("reprova processador e placa-mãe com soquetes diferentes", () => {
    const result = validatePcBuild({
      ...validBuild,
      motherboard: "mb-b550m",
    });

    expect(result.isValid).toBe(false);
    expect(result.outcome).toBe("explosion");
    expect(result.errors.map((error) => error.code)).toContain("CPU_SOCKET");
  });

  it("reprova fonte abaixo do mínimo pedido pela placa de vídeo", () => {
    const result = validatePcBuild({ ...validBuild, psu: "psu-atx-450" });

    expect(result.errors.map((error) => error.code)).toContain("GPU_MIN_PSU");
  });

  it("não produz vídeo integrado quando a CPU não oferece esse recurso", () => {
    const result = validatePcBuild({
      ...validBuild,
      motherboard: "mb-b550m",
      cpu: "cpu-ryzen-5600",
      cooler: "cooler-air-95",
      ram: "ram-16-ddr4-3200",
      gpu: "gpu-integrated",
      storage: "storage-nvme-gen3",
      psu: "psu-atx-450",
      cooling: "fans-none",
    });

    expect(result.errors.map((error) => error.code)).toContain(
      "NO_VIDEO_OUTPUT"
    );
  });

  it("reprova uma montagem quente sem fluxo de ar suficiente", () => {
    const result = validatePcBuild({
      ...validBuild,
      motherboard: "mb-z790-atx",
      cpu: "cpu-i7-13700kf",
      cooler: "cooler-liquid-240",
      ram: "ram-32-ddr5-6000",
      gpu: "gpu-4070",
      cooling: "fans-none",
    });

    expect(result.errors.map((error) => error.code)).toContain("AIRFLOW");
  });

  it("avisa sobre redução de frequência sem impedir a inicialização", () => {
    const result = validatePcBuild({
      ...validBuild,
      ram: "ram-32-ddr5-6000",
    });

    expect(result.isValid).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "RAM_DOWNCLOCK"
    );
  });

  it("rejeita IDs de peças fora do catálogo compartilhado", () => {
    const result = sanitizePcSelection({
      ...validBuild,
      cpu: "cpu-inventada",
    });

    expect(result.invalid).toHaveLength(1);
    expect(result.selection.cpu).toBeUndefined();
  });
});

describe("Montagem de PC - persistência e isolamento", () => {
  const migration = fs.readFileSync(
    path.resolve(__dirname, "../server/db/migrations/0003_pc_builder.sql"),
    "utf8"
  );
  const route = fs.readFileSync(
    path.resolve(__dirname, "../server/routes/pcBuilder.cjs"),
    "utf8"
  );
  const api = fs.readFileSync(
    path.resolve(__dirname, "../src/lib/api.js"),
    "utf8"
  );

  it("persiste montagem e resultado calculado no PostgreSQL", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS pc_builds");
    expect(migration).toContain("components JSONB NOT NULL");
    expect(migration).toContain("validation JSONB NOT NULL");
    expect(migration).toContain("outcome IN ('success', 'explosion')");
    expect(migration).toContain("REFERENCES users(id) ON DELETE CASCADE");
  });

  it("limita leitura e exclusão ao usuário autenticado", () => {
    expect(route).toContain("WHERE user_id = $1");
    expect(route).toContain("WHERE id = $1 AND user_id = $2");
    expect(route).toContain(
      "DELETE FROM pc_builds WHERE id = $1 AND user_id = $2"
    );
    expect(route).toContain("validatePcBuild(sanitized.selection)");
  });

  it("rejeita identificadores inválidos antes de consultar o PostgreSQL", () => {
    expect(() =>
      pcBuilderRoutes.validators.normalizeBuildId("fora-do-padrao")
    ).toThrow("Identificador de montagem inválido.");
    expect(
      pcBuilderRoutes.validators.normalizeBuildId(
        "6c47b673-62a5-4a4c-95ef-7c705f17cb03"
      )
    ).toBe("6c47b673-62a5-4a4c-95ef-7c705f17cb03");
  });

  it("expõe operações de galeria no cliente autenticado", () => {
    expect(api).toContain(
      'getPcBuilds: () => request("/api/pc-builder/builds")'
    );
    expect(api).toContain("savePcBuild: (payload)");
    expect(api).toContain("deletePcBuild: (id)");
  });
});
