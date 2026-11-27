import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearAplicacion } from "../../src/api/servidor.js";

const aplicacion = crearAplicacion();

describe("Acceso", () => {
  it("acepta el token de staff", async () => {
    const respuesta = await request(aplicacion).get("/api/projects").set("Authorization", "Bearer staff-token");
    expect(respuesta.status).toBe(200);
  });

  it("acepta el token de acme", async () => {
    const respuesta = await request(aplicacion).get("/api/projects").set("Authorization", "Bearer acme-token");
    expect(respuesta.status).toBe(200);
  });

  it("rechaza la petición sin token", async () => {
    const respuesta = await request(aplicacion).get("/api/projects");
    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual({ error: "Unauthorized" });
  });

  it("rechaza un token desconocido", async () => {
    const respuesta = await request(aplicacion).get("/api/projects").set("Authorization", "Bearer no-existe");
    expect(respuesta.status).toBe(401);
  });

  it("rechaza un esquema distinto de Bearer", async () => {
    const respuesta = await request(aplicacion).get("/api/projects").set("Authorization", "Basic staff-token");
    expect(respuesta.status).toBe(401);
  });

  it("rechaza un Bearer vacío", async () => {
    const respuesta = await request(aplicacion).get("/api/projects").set("Authorization", "Bearer ");
    expect(respuesta.status).toBe(401);
  });
});
