/** Lee PTS1 little-endian. Un archivo corto se rechaza. */

export interface Punto {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
}

export function parsearPts(buffer: ArrayBuffer): Punto[] {
  if (buffer.byteLength < 16) throw new Error("truncated");
  const vista = new DataView(buffer);
  const marca = String.fromCharCode(vista.getUint8(0), vista.getUint8(1), vista.getUint8(2), vista.getUint8(3));
  if (marca !== "PTS1") throw new Error("truncated");
  const cantidad = vista.getUint32(4, true);
  const necesario = 16 + cantidad * 16;
  if (buffer.byteLength < necesario) throw new Error("truncated");
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
