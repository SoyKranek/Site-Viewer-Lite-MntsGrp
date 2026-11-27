import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearAplicacion } from "../../src/api/servidor.js";

const aplicacion = crearAplicacion();
const comoStaff = { Authorization: "Bearer staff-token" };

describe("Entradas malas", () => {
  it("sin token, un JSON roto sigue siendo 401", async () => {
    const r = await request(aplicacion).post("/api/projects/1201-30001/issues").set("Content-Type", "application/json").send("{");
    expect(r.status).toBe(401);
  });

  it("un cuerpo demasiado grande es 413", async () => {
    const r = await request(aplicacion).post("/api/projects/1201-30001/issues").set(comoStaff).send({ title: "a".repeat(20_000) });
    expect(r.status).toBe(413);
  });

  it("una URL mal codificada es 400 sin traza", async () => {
    const r = await request(aplicacion).get("/api/projects/%E0%A4%A").set(comoStaff);
    expect(r.status).toBe(400);
    expect(r.text).not.toContain("node_modules");
  });

  it("un título de solo espacios es 400", async () => {
    const r = await request(aplicacion).post("/api/projects/1201-30001/issues").set(comoStaff).send({ title: "   ", level: "Level 1" });
    expect(r.status).toBe(400);
  });

  it("internal no aparece en ninguna respuesta de lectura", async () => {
    for (const ruta of ["", "/1201-30001", "/1201-30001/spaces", "/0980-41007"]) {
      const r = await request(aplicacion).get(`/api/projects${ruta}`).set(comoStaff);
      expect(r.text).not.toMatch(/internal|invoice|margin|INV-/);
    }
  });
});
