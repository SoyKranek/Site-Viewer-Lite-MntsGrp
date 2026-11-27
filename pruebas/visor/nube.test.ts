import { describe, expect, it } from "vitest";
import { cargarNube, descargarNube } from "../../src/visor/carga-nube";
import { muestrearPts, parsearPts } from "../../src/visor/parser-pts";

function pts(cantidad: number, cortado = false): ArrayBuffer {
  const bytes = cortado ? 20 : 16 + cantidad * 16;
  const buffer = new ArrayBuffer(bytes);
  const vista = new DataView(buffer);
  vista.setUint8(0, 80);
  vista.setUint8(1, 84);
  vista.setUint8(2, 83);
  vista.setUint8(3, 49);
  vista.setUint32(4, cantidad, true);
  if (!cortado) vista.setFloat32(16, 1.5, true);
  return buffer;
}

describe("Nube", () => {
  it("lee un punto", () => {
    const puntos = parsearPts(pts(1));
    expect(puntos).toHaveLength(1);
    expect(puntos[0].x).toBeCloseTo(1.5);
  });

  it("rechaza un archivo truncado", () => {
    expect(() => parsearPts(pts(2, true))).toThrow(/truncated/);
  });

  it("rechaza una cabecera distinta", () => {
    const buffer = pts(1);
    new DataView(buffer).setUint8(0, 65);
    expect(() => parsearPts(buffer)).toThrow(/truncated/);
  });

  it("un 404 se informa", async () => {
    const descarga = descargarNube("/cloud", "staff-token", () => undefined, async () => new Response("", { status: 404 }));
    await expect(descarga.promesa).rejects.toThrow(/missing/);
  });

  it("cancelar aborta la lectura", async () => {
    const flujo = new ReadableStream({
      start(controlador) {
        controlador.enqueue(new Uint8Array([1]));
      },
    });
    const descarga = descargarNube("/cloud", "t", () => undefined, async () => new Response(flujo, { status: 200, headers: { "content-length": "10" } }));
    descarga.abortar();
    await expect(descarga.promesa).rejects.toThrow();
  });

  it("la muestra respeta el máximo", () => {
    const nube = muestrearPts(pts(10), 4);
    expect(nube.dibujados).toBeLessThanOrEqual(4);
    expect(nube.total).toBe(10);
  });

  it("cancelar durante el análisis no entrega puntos", async () => {
    let detenido = false;
    const tarea = cargarNube("/cloud", "t", 10, () => undefined, async () => new Response(pts(1)), () => {
      let entregar: () => void = () => undefined;
      const promesa = new Promise<never>((_, rechazar) => (entregar = () => rechazar(new DOMException("Aborted", "AbortError"))));
      return { promesa, abortar: () => { detenido = true; entregar(); } };
    });
    await new Promise((r) => setTimeout(r, 10));
    tarea.abortar();
    await expect(tarea.promesa).rejects.toThrow(/Aborted/);
    expect(detenido).toBe(true);
  });
});
