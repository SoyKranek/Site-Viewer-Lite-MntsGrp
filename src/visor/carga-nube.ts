/** Descarga la nube. Cancel y un proyecto nuevo abortan antes de pintar. */

export interface Descarga {
  abortar: () => void;
  promesa: Promise<ArrayBuffer>;
}

export function descargarNube(
  url: string,
  token: string,
  alProgreso: (fraccion: number) => void,
  fetchImpl: typeof fetch = fetch,
): Descarga {
  const controlador = new AbortController();
  const promesa = (async () => {
    const respuesta = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controlador.signal,
    });
    if (respuesta.status === 404) throw new Error("missing");
    if (!respuesta.ok || !respuesta.body) throw new Error("network");
    const total = Number(respuesta.headers.get("content-length") ?? 0);
    const lector = respuesta.body.getReader();
    controlador.signal.addEventListener("abort", () => {
      void lector.cancel();
    });
    const trozos: Uint8Array[] = [];
    let recibido = 0;
    for (;;) {
      if (controlador.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const lectura = lector.read();
      const abortado = new Promise<never>((_, rechazar) => {
        controlador.signal.addEventListener("abort", () => rechazar(new DOMException("Aborted", "AbortError")));
      });
      const { done, value } = await Promise.race([lectura, abortado]);
      if (done) break;
      trozos.push(value);
      recibido += value.byteLength;
      if (total > 0) alProgreso(recibido / total);
    }
    const buffer = new Uint8Array(recibido);
    let offset = 0;
    for (const trozo of trozos) {
      buffer.set(trozo, offset);
      offset += trozo.byteLength;
    }
    return buffer.buffer;
  })();
  return { abortar: () => controlador.abort(), promesa };
}
