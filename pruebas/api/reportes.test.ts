import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { crearAplicacion } from "../../src/api/servidor.js";
import { archivoReportes } from "../../src/api/almacen.js";

const aplicacion = crearAplicacion();
const respaldo = existsSync(archivoReportes) ? readFileSync(archivoReportes, "utf8") : "[]";

afterEach(() => {
  writeFileSync(archivoReportes, respaldo);
});

describe("Reportes", () => {
  it("crea un reporte y responde 201", async () => {
    const respuesta = await request(aplicacion)
      .post("/api/projects/1201-30001/issues")
      .set("Authorization", "Bearer acme-token")
      .send({ title: "Puerta descuadrada", level: "Level 1", spaceId: "s1" });
    expect(respuesta.status).toBe(201);
    expect(typeof respuesta.body.id).toBe("string");
    const guardados = JSON.parse(readFileSync(archivoReportes, "utf8")) as { id: string }[];
    expect(guardados.some((item) => item.id === respuesta.body.id)).toBe(true);
  });

  it("rechaza un título vacío", async () => {
    const respuesta = await request(aplicacion)
      .post("/api/projects/1201-30001/issues")
      .set("Authorization", "Bearer staff-token")
      .send({ title: "", level: "Level 1" });
    expect(respuesta.status).toBe(400);
  });

  it("rechaza un título de más de 120 caracteres", async () => {
    const respuesta = await request(aplicacion)
      .post("/api/projects/1201-30001/issues")
      .set("Authorization", "Bearer staff-token")
      .send({ title: "a".repeat(121), level: "Level 1" });
    expect(respuesta.status).toBe(400);
  });

  it("rechaza un nivel que no existe", async () => {
    const respuesta = await request(aplicacion)
      .post("/api/projects/1201-30001/issues")
      .set("Authorization", "Bearer staff-token")
      .send({ title: "Hueco", level: "Sótano" });
    expect(respuesta.status).toBe(400);
  });

  it("rechaza un espacio de otro proyecto", async () => {
    const respuesta = await request(aplicacion)
      .post("/api/projects/1201-30002/issues")
      .set("Authorization", "Bearer acme-token")
      .send({ title: "Cruce", level: "Ground", spaceId: "s1" });
    expect(respuesta.status).toBe(400);
  });

  it("un proyecto ajeno es 404", async () => {
    const respuesta = await request(aplicacion)
      .post("/api/projects/0980-41007/issues")
      .set("Authorization", "Bearer acme-token")
      .send({ title: "No", level: "Level 1" });
    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ error: "Not found" });
  });

  it("dos altas reciben ids distintos", async () => {
    const primera = await request(aplicacion)
      .post("/api/projects/1201-30001/issues")
      .set("Authorization", "Bearer staff-token")
      .send({ title: "Uno", level: "Level 2" });
    const segunda = await request(aplicacion)
      .post("/api/projects/1201-30001/issues")
      .set("Authorization", "Bearer staff-token")
      .send({ title: "Dos", level: "Level 2" });
    expect(primera.body.id).not.toBe(segunda.body.id);
  });

  it("el JSON roto es 400", async () => {
    const respuesta = await request(aplicacion)
      .post("/api/projects/1201-30001/issues")
      .set("Authorization", "Bearer staff-token")
      .set("Content-Type", "application/json")
      .send("{");
    expect(respuesta.status).toBe(400);
  });
});
