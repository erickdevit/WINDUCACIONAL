/**
 * @vitest-environment jsdom
 */

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  PC_CATEGORIES,
  getPcPart,
} from "../server/domain/pcBuilderCatalog.mjs";
import { validatePcBuild } from "../server/domain/pcBuilderRules.mjs";
import { ComponentArtwork } from "../src/containers/applications/apps/pcBuilder/ComponentArtwork";
import { BuilderView } from "../src/containers/applications/apps/pcBuilder/BuilderView";
import { GalleryView } from "../src/containers/applications/apps/pcBuilder/GalleryView";
import { PartCatalogModal } from "../src/containers/applications/apps/pcBuilder/PartCatalogModal";
import { PcCaseVisual } from "../src/containers/applications/apps/pcBuilder/PcCaseVisual";

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

afterEach(() => cleanup());

describe("Montagem de PC - experiência visual", () => {
  it("oferece uma ilustração acessível para cada categoria de componente", () => {
    const { container } = render(
      <div>
        {PC_CATEGORIES.map((category) => (
          <ComponentArtwork
            key={category.id}
            category={category.id}
            part={getPcPart(validBuild[category.id])}
          />
        ))}
      </div>
    );

    expect(screen.getAllByRole("img")).toHaveLength(PC_CATEGORIES.length);
    expect(screen.getByRole("img", { name: "Ryzen 7 7700" })).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "SSD NVMe 2 TB Gen4" })
    ).toBeTruthy();
    expect(
      container.querySelectorAll("svg[data-installed='true']")
    ).toHaveLength(PC_CATEGORIES.length);
  });

  it("permite alternar entre as câmeras 2D e 3D e explodir as peças", () => {
    const evaluation = validatePcBuild(validBuild);
    const { container } = render(
      <PcCaseVisual
        evaluation={evaluation}
        selection={validBuild}
        onOpenCategory={vi.fn()}
      />
    );

    expect(
      screen
        .getByRole("button", { name: "Vista 3D" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    expect(container.querySelector(".pcThreeDimensionalView")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Explodir peças" }));
    expect(
      container
        .querySelector(".pcThreeDimensionalView")
        .getAttribute("data-exploded")
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Vista 2D" }));
    expect(
      screen
        .getByRole("button", { name: "Vista 2D" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    expect(container.querySelector(".pcBlueprintView")).toBeTruthy();
    expect(screen.getByText("Peça instalada")).toBeTruthy();
  });

  it("prioriza missão, bancada visual e telemetria na hierarquia", () => {
    const evaluation = validatePcBuild(validBuild);
    const { container } = render(
      <BuilderView
        buildName="PC Visual"
        evaluation={evaluation}
        saving={false}
        selection={validBuild}
        onBuildNameChange={vi.fn()}
        onOpenCategory={vi.fn()}
        onPowerOn={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: /Construa uma máquina/ })
    ).toBeTruthy();
    expect(screen.getByLabelText("Estúdio de montagem")).toBeTruthy();
    expect(screen.getByLabelText("Telemetria e diagnóstico")).toBeTruthy();
    expect(screen.getByText("Orçamento de energia")).toBeTruthy();
    expect(container.querySelectorAll(".pcPartSlot")).toHaveLength(10);
  });

  it("mostra imagens, compatibilidade e especificações no catálogo", () => {
    render(
      <PartCatalogModal
        category="storage"
        selection={validBuild}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "SSD NVMe 2 TB Gen4" })
    ).toBeTruthy();
    expect(screen.getByText("Como esta peça se conecta")).toBeTruthy();
    expect(
      screen.getByText(/Especificações de SSD NVMe 2 TB Gen4/)
    ).toBeTruthy();
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(5);
  });

  it("apresenta a galeria como coleção visual de projetos", () => {
    const evaluation = validatePcBuild(validBuild);
    render(
      <GalleryView
        builds={[
          {
            id: "build-1",
            name: "PC Nebulosa",
            components: validBuild,
            outcome: "success",
            validation: evaluation,
            createdAt: "2026-07-18T12:00:00.000Z",
          },
        ]}
        error=""
        loading={false}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
        onStartBuild={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Sua coleção de máquinas." })
    ).toBeTruthy();
    const card = screen.getByRole("article");
    expect(within(card).getByText("PC Nebulosa")).toBeTruthy();
    expect(within(card).getByText("WINDOWS INICIOU")).toBeTruthy();
    expect(within(card).getAllByRole("img").length).toBeGreaterThanOrEqual(5);
  });
});
