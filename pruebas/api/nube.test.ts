import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { crearAplicacion } from "../../src/api/servidor.js";
import { interpretarRango } from "../../src/api/nube.js";

const aplicacion = crearAplicacion();
const nube = path.resolve("site-viewer-lite-starter/data/clouds/1201-30002.pts");

function asegurarNubeMinima(): void {
  if (existsSync(nube) && existsSync(nube)) return;
  mkdirSync(path.dirname(nube), { recursive: true });
  if (!existsSync(nube)) {
    const cabecera = Buffer.alloc(32);
    cabecera.write("PTS1", 0, "ascii");
    cabecera.writeUInt32LE(1, 4);
    writeFileSync(nube, cabecera);
  }
}

describe("Nube", () => {
  it("interpreta bytes=0-15", () => {
    expect(interpretarRango("bytes=0-15", 32)).toEqual({ inicio: 0, fin: 15 });
  });

  it("marca el inicio fuera de tamaño", () => {
    expect(interpretarRango("bytes=40-50", 32)).toBe("fuera");
  });

  it("un rango invertido es inválido", () => {
    expect(interpretarRango("bytes=10-2", 32)).toBe("invalido");
  });

  it("sin cabecera Range no recorta", () => {
    expect(interpretarRango(undefined, 32)).toBeNull();
  });

  it("devuelve 206 con 16 bytes de cabecera", async () => {
    asegurarNubeMinima();
    const respuesta = await request(aplicacion)
      .get("/api/projects/1201-30002/cloud")
      .set("Authorization", "Bearer acme-token")
      .set("Range", "bytes=0-15")
      .buffer(true)
      .parse((res, callback) => {
        const trozos: Buffer[] = [];
        res.on("data", (trozo) => trozos.push(trozo as Buffer));
        res.on("end", () => callback(null, Buffer.concat(trozos)));
      });
    expect(respuesta.status).toBe(206);
    expect(respuesta.body).toHaveLength(16);
    expect(respuesta.headers["content-range"]).toMatch(/^bytes 0-15\//);
    expect(respuesta.headers["accept-ranges"]).toBe("bytes");
    expect(Buffer.from(respuesta.body).subarray(0, 4).toString("ascii")).toBe("PTS1");
  });

  it("un inicio mayor que el archivo es 416", async () => {
    asegurarNubeMinima();
    const respuesta = await request(aplicacion)
      .get("/api/projects/1201-30002/cloud")
      .set("Authorization", "Bearer staff-token")
      .set("Range", "bytes=999999999-999999999");
    expect(respuesta.status).toBe(416);
  });

  it("la nube ausente es 404", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/0980-41007/cloud").set("Authorization", "Bearer staff-token");
    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ error: "Not found" });
  });

  it("un cliente ajeno no distingue la nube", async () => {
    const respuesta = await request(aplicacion).get("/api/projects/1201-30002/cloud").set("Authorization", "Bearer brick-token");
    expect(respuesta.status).toBe(404);
  });
});
