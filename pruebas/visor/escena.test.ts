import { describe, expect, it } from "vitest";
import { areaMetros, areaPies, filtrarNivel, type Caja } from "../../src/visor/geometria";

const cajas: Caja[] = [
  { id: "s1", name: "Lobby", use: "Circulation", level: "Level 1", x: 0, y: 0, z: 0, w: 8, d: 6, h: 3 },
  { id: "s5", name: "Conference A", use: "Meeting", level: "Level 2", x: 0, y: 0, z: 3, w: 7, d: 5, h: 3 },
];

describe("Escena", () => {
  it("sin filtro devuelve todas las cajas", () => {
    expect(filtrarNivel(cajas, "all")).toHaveLength(2);
  });

  it("el filtro deja un solo nivel", () => {
    expect(filtrarNivel(cajas, "Level 2").map((caja) => caja.name)).toEqual(["Conference A"]);
  });

  it("el área en metros es ancho por fondo", () => {
    expect(areaMetros(cajas[0])).toBe(48);
  });

  it("el área en pies tiene un decimal", () => {
    expect(areaPies(cajas[0])).toBe((48 * 10.7639).toFixed(1));
  });

  it("un nivel desconocido no devuelve cajas", () => {
    expect(filtrarNivel(cajas, "Roof")).toHaveLength(0);
  });
});
