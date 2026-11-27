/** Lee PTS1 little-endian. Un archivo corto se rechaza. */

export interface Punto {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
}

export const MAX_PUNTOS = 1_000_000;
export const MAX_PUNTOS_TACTIL = 500_000;
const FASES = 4;

// El material trabaja en color lineal; los bytes del archivo son sRGB.
const A_LINEAL = Uint8Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return Math.round(255 * (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
});

function cabecera(buffer: ArrayBuffer): { vista: DataView; cantidad: number } {
  if (buffer.byteLength < 16) throw new Error("truncated");
  const vista = new DataView(buffer);
  const marca = String.fromCharCode(vista.getUint8(0), vista.getUint8(1), vista.getUint8(2), vista.getUint8(3));
  if (marca !== "PTS1") throw new Error("truncated");
  const cantidad = vista.getUint32(4, true);
  if (buffer.byteLength < 16 + cantidad * 16) throw new Error("truncated");
  return { vista, cantidad };
}

export interface Nube {
  total: number;
  dibujados: number;
  posiciones: Float32Array;
  colores: Uint8Array;
}

/**
 * Muestra uniforme de hasta `maximo` puntos. Se escriben intercalados: el primer
 * cuarto del buffer ya cubre toda la nube y sirve para dibujar mientras se orbita.
 */
export function muestrearPts(buffer: ArrayBuffer, maximo: number = MAX_PUNTOS): Nube {
  const { vista, cantidad } = cabecera(buffer);
  const paso = Math.max(1, Math.ceil(cantidad / maximo));
  const dibujados = Math.ceil(cantidad / paso);
  const posiciones = new Float32Array(dibujados * 3);
  const colores = new Uint8Array(dibujados * 3);
  let escrito = 0;
  for (let fase = 0; fase < FASES; fase += 1) {
    for (let j = fase; j < dibujados; j += FASES) {
      const base = 16 + j * paso * 16;
      for (let eje = 0; eje < 3; eje += 1) {
        const valor = vista.getFloat32(base + eje * 4, true);
        if (!Number.isFinite(valor)) throw new Error("corrupt");
        posiciones[escrito * 3 + eje] = valor;
        colores[escrito * 3 + eje] = A_LINEAL[vista.getUint8(base + 12 + eje)];
      }
      escrito += 1;
    }
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
