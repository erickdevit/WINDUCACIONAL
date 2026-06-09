import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Fotos", () => {
  it("deve usar AppWindow e abrir imagens recebidas pelo payload do Explorer", () => {
    const source = fs.readFileSync(
      new URL(
        "../src/containers/applications/apps/photos/photos.jsx",
        import.meta.url
      ),
      "utf8"
    );

    expect(source).toContain("state.apps.photos");
    expect(source).toContain("<AppWindow");
    expect(source).toContain("files.data.getId(wnapp.payload)");
    expect(source).toContain("IMAGE_TYPES");
  });
});
