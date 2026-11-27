import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearAplicacion } from "../../src/api/servidor.js";

const aplicacion = crearAplicacion();

describe("Espacios", () => {
  it("devuelve las salas del proyecto visible", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/1201-30001/spaces").set("Authorization", "Bearer acme-token");
    expect(respuesta.status).toBe(200);
    expect(respuesta.body[0].name).toBe("Lobby");
  });

  it("oculta las salas de un proyecto ajeno", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/0980-41007/spaces").set("Authorization", "Bearer acme-token");
    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ error: "Not found" });
  });

  it("el staff lee Brickyard", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/0980-41007/spaces").set("Authorization", "Bearer staff-token");
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.length).toBeGreaterThan(0);
  });

  it("un id mal formado no lee el disco", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/no-es-id/spaces").set("Authorization", "Bearer staff-token");
    expect(respuesta.status).toBe(400);
  });

  it("brick no ve Harbor", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/1201-30001/spaces").set("Authorization", "Bearer brick-token");
    expect(respuesta.status).toBe(404);
  });
});
