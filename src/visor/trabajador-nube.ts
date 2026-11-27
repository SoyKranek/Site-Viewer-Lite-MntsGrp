/** Worker: convierte el binario en puntos y no toca la escena. */

import { muestrearPts } from "./parser-pts";

self.onmessage = (evento: MessageEvent<{ buffer: ArrayBuffer; maximo: number }>) => {
  try {
    const nube = muestrearPts(evento.data.buffer, evento.data.maximo);
    self.postMessage({ ok: true, nube }, { transfer: [nube.posiciones.buffer, nube.colores.buffer] });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "truncated";
    self.postMessage({ ok: false, mensaje });
  }
};
