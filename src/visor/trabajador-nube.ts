/** Worker: convierte el binario en puntos y no toca la escena. */

import { parsearPts } from "./parser-pts";

self.onmessage = (evento: MessageEvent<ArrayBuffer>) => {
  try {
    const puntos = parsearPts(evento.data);
    self.postMessage({ ok: true, puntos });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "truncated";
    self.postMessage({ ok: false, mensaje });
  }
};
