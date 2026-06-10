import { describe, expect, it } from "vitest"
import { formatFileSize, getBookletFileUrl } from "./bookletsFormat"

describe("formatFileSize", () => {
  it("mantém bytes abaixo de 1 KB", () => {
    expect(formatFileSize(512)).toBe("512 B")
  })

  it("converte para KB com uma casa decimal", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB")
  })

  it("converte para MB quando o arquivo é grande", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB")
  })
})

describe("getBookletFileUrl", () => {
  it("monta a URL absoluta a partir da origem atual", () => {
    expect(getBookletFileUrl("/api/booklets/modules/m1/files/f1/pdf")).toBe(
      `${window.location.origin}/api/booklets/modules/m1/files/f1/pdf`,
    )
  })
})
