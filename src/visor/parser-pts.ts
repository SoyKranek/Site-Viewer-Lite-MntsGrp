/** Lee PTS1 little-endian. Un archivo corto se rechaza. */

export interface Punto {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
}

export const MAX_PUNTOS = 250_000;

function cabecera(buffer: ArrayBuffer): { vista: DataView; cantidad: number } {
  if (buffer.byteLength < 16) throw new Error("truncated");
  const vista = new DataView(buffer);
  const marca = String.fromCharCode(vista.getUint8(0), vista.getUint8(1), vista.getUint8(2), vista.getUint8(3));
  if (marca !== "PTS1") throw new Error("truncated");
  const cantidad = vista.getUint32(4, true);
  if (buffer.byteLength < 16 + cantidad * 16) throw new Error("truncated");
  return { vista, cantidad };
}

export function muestrearPts(buffer: ArrayBuffer): { total: number; dibujados: number; posiciones: Float32Array; colores: Float32Array } {
  const { vista, cantidad } = cabecera(buffer);
  const paso = Math.max(1, Math.ceil(cantidad / MAX_PUNTOS));
  const dibujados = Math.ceil(cantidad / paso);
  const posiciones = new Float32Array(dibujados * 3);
  const colores = new Float32Array(dibujados * 3);
  let escrito = 0;
  for (let i = 0; i < cantidad; i += paso) {
    const base = 16 + i * 16;
    posiciones[escrito * 3] = vista.getFloat32(base, true);
    posiciones[escrito * 3 + 1] = vista.getFloat32(base + 4, true);
    posiciones[escrito * 3 + 2] = vista.getFloat32(base + 8, true);
    colores[escrito * 3] = vista.getUint8(base + 12) / 255;
    colores[escrito * 3 + 1] = vista.getUint8(base + 13) / 255;
    colores[escrito * 3 + 2] = vista.getUint8(base + 14) / 255;
    escrito += 1;
  }
  return { total: cantidad, dibujados, posiciones, colores };
}

export function parsearPts(buffer: ArrayBuffer): Punto[] {
  const { vista, cantidad } = cabecera(buffer);
  const puntos: Punto[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    const base = 16 + i * 16;
    puntos.push({
      x: vista.getFloat32(base, true),
      y: vista.getFloat32(base + 4, true),
      z: vista.getFloat32(base + 8, true),
      r: vista.getUint8(base + 12),
      g: vista.getUint8(base + 13),
      b: vista.getUint8(base + 14),
    });
  }
  return puntos;
}
