import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/visor/estilos.css", "utf8");
const html = readFileSync("index.html", "utf8");

describe("Maqueta", () => {
  it("los controles miden al menos 44 px", () => {
    expect(css).toContain("min-height: 44px");
  });

  it("el texto de los campos es de 16 px", () => {
    expect(css).toContain("font-size: 16px");
  });

  it("no hay scroll horizontal", () => {
    expect(css).toContain("overflow-x: hidden");
  });

  it("el viewport impide el zoom accidental", () => {
    expect(html).toContain("maximum-scale=1");
  });

  it("los botones de la prueba están en inglés", () => {
    const pagina = readFileSync("src/visor/pagina.ts", "utf8");
    expect(pagina).toContain("Load point cloud");
    expect(pagina).toContain("Try again");
  });
});
