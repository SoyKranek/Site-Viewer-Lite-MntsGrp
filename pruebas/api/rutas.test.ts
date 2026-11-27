import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearAplicacion } from "../../src/api/servidor.js";

const aplicacion = crearAplicacion();

describe("Rutas", () => {
  it("lista, detalle, espacios, nube y alta con los tres tokens", async () => {
    const staff = await request(aplicacion).get("/api/projects").set("Authorization", "Bearer staff-token");
    const acme = await request(aplicacion).get("/api/projects/1201-30001").set("Authorization", "Bearer acme-token");
    const brick = await request(aplicacion).get("/api/projects/0980-41007/spaces").set("Authorization", "Bearer brick-token");
    const nube = await request(aplicacion).get("/api/projects/0980-41007/cloud").set("Authorization", "Bearer brick-token");
    const alta = await request(aplicacion)
      .post("/api/projects/0980-41007/issues")
      .set("Authorization", "Bearer brick-token")
      .send({ title: "Nota de obra", level: "Roof" });
    expect(staff.status).toBe(200);
    expect(acme.status).toBe(200);
    expect(brick.status).toBe(200);
    expect(nube.status).toBe(404);
    expect(alta.status).toBe(201);
  });
});
