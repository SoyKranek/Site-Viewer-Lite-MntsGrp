import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearAplicacion } from "../../src/api/servidor.js";

const aplicacion = crearAplicacion();

describe("Catálogo", () => {
  it("el staff ve los tres proyectos", async () => {
    const respuesta = await request(aplicacion).get("/api/projects").set("Authorization", "Bearer staff-token");
    expect(respuesta.body).toHaveLength(3);
    expect(respuesta.body[0]).toMatchObject({ id: "1201-30001", client: "Acme Builders" });
  });

  it("acme solo ve su cuenta", async () => {
    const respuesta = await request(aplicacion).get("/api/projects").set("Authorization", "Bearer acme-token");
    expect(respuesta.body.map((item: { id: string }) => item.id).sort()).toEqual(["1201-30001", "1201-30002"]);
  });

  it("el detalle no incluye internal", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/1201-30001").set("Authorization", "Bearer staff-token");
    expect(JSON.stringify(respuesta.body)).not.toContain("invoice");
    expect(respuesta.body.internal).toBeUndefined();
  });

  it("el staff ve email y teléfono", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/1201-30001").set("Authorization", "Bearer staff-token");
    expect(respuesta.body.contacts[0].email).toBe("sam@acme.example");
  });

  it("el cliente no ve email ni teléfono", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/1201-30001").set("Authorization", "Bearer acme-token");
    expect(respuesta.body.contacts[0].email).toBeUndefined();
    expect(respuesta.body.contacts[0].phone).toBeUndefined();
    expect(respuesta.body.contacts[0].name).toBe("Sam Lee");
  });

  it("un proyecto ajeno responde igual que uno inexistente", async () => {
    const ajeno = await request(aplicacion).get("/api/projects/0980-41007").set("Authorization", "Bearer acme-token");
    const ausente = await request(aplicacion).get("/api/projects/0000-00000").set("Authorization", "Bearer acme-token");
    expect(ajeno.status).toBe(404);
    expect(ausente.status).toBe(404);
    expect(ajeno.body).toEqual(ausente.body);
    expect(ajeno.body).toEqual({ error: "Not found" });
  });

  it("repite el detalle con 304 cuando el ETag coincide", async () => {
    const primero = await request(aplicacion).get("/api/projects/1201-30001").set("Authorization", "Bearer staff-token");
    expect(primero.headers["cache-control"]).toContain("private");
    expect(primero.headers["cache-control"]).toContain("no-store");
    const etag = primero.headers.etag;
    const segundo = await request(aplicacion)
      .get("/api/projects/1201-30001")
      .set("Authorization", "Bearer staff-token")
      .set("If-None-Match", etag);
    expect(segundo.status).toBe(304);
  });

  it("un id mal formado es 400", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/no-es-id").set("Authorization", "Bearer staff-token");
    expect(respuesta.status).toBe(400);
  });
});
