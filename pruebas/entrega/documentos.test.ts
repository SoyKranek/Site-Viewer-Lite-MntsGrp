import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync("README.md", "utf8");
const answers = readFileSync("ANSWERS.md", "utf8");

function palabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

describe("Entrega", () => {
  it("el README explica el arranque y npm test", () => {
    expect(readme).toContain("npm install && npm run clouds && npm run build && npm start");
    expect(readme).toContain("npm test");
    expect(readme.toLowerCase()).toContain("cursor");
  });

  it("hay cinco respuestas", () => {
    const bloques = answers.split(/^## /m).slice(1);
    expect(bloques).toHaveLength(5);
  });

  it("ninguna respuesta pasa de 120 palabras", () => {
    const bloques = answers.split(/^## /m).slice(1);
    for (const bloque of bloques) {
      expect(palabras(bloque)).toBeLessThanOrEqual(120);
    }
  });

  it("el README dice qué falta", () => {
    expect(readme).toContain("Falta");
  });

  it("el README dice qué se haría con un día más", () => {
    expect(readme).toContain("Un día más");
  });
});
