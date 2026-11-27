/** Descarga e interpreta la nube. Abortar corta la red y el worker: nunca llega un resultado tarde. */

import type { Nube } from "./parser-pts";

export interface Tarea<T> {
  abortar: () => void;
  promesa: Promise<T>;
}

export type Descarga = Tarea<ArrayBuffer>;

const cancelada = () => new DOMException("Aborted", "AbortError");

export function descargarNube(
  url: string,
  token: string,
  alProgreso: (fraccion: number) => void,
  fetchImpl: typeof fetch = fetch,
): Descarga {
  const controlador = new AbortController();
  const { signal } = controlador;
  let rechazarAborto: (motivo: unknown) => void = () => undefined;
  const abortado = new Promise<never>((_, rechazar) => (rechazarAborto = rechazar));

  async function leer(): Promise<ArrayBuffer> {
    const respuesta = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, signal });
    if (respuesta.status === 404) throw new Error("missing");
    if (!respuesta.ok || !respuesta.body) throw new Error("network");
    const total = Number(respuesta.headers.get("content-length") ?? 0);
    const lector = respuesta.body.getReader();
    signal.addEventListener("abort", () => void lector.cancel().catch(() => undefined), { once: true });
    // Con tamaño conocido se escribe en un solo buffer y no se duplica la memoria (iPad).
    let destino = new Uint8Array(total);
    let recibido = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (signal.aborted) throw cancelada();
      if (done) break;
      if (recibido + value.byteLength > destino.byteLength) {
        const mayor = new Uint8Array(Math.max(recibido + value.byteLength, destino.byteLength * 2));
        mayor.set(destino.subarray(0, recibido));
        destino = mayor;
      }
      destino.set(value, recibido);
      recibido += value.byteLength;
      if (total > 0) alProgreso(Math.min(1, recibido / total));
    }
    if (total > 0 && recibido < total) throw new Error("network");
    return recibido === destino.byteLength ? destino.buffer : destino.buffer.slice(0, recibido);
  }

  return {
    abortar: () => {
      controlador.abort();
      rechazarAborto(cancelada());
    },
    promesa: Promise.race([leer(), abortado]),
  };
}

export type Interprete = (buffer: ArrayBuffer, maximo: number) => Tarea<Nube>;

export const interpretarEnWorker: Interprete = (buffer, maximo) => {
  const worker = new Worker(new URL("./trabajador-nube.ts", import.meta.url), { type: "module" });
  let rechazar: (motivo: unknown) => void = () => undefined;
  const promesa = new Promise<Nube>((resolver, fallar) => {
    rechazar = fallar;
    worker.onmessage = (evento: MessageEvent<{ ok: boolean; nube?: Nube; mensaje?: string }>) => {
      worker.terminate();
      if (evento.data.ok && evento.data.nube) resolver(evento.data.nube);
      else fallar(new Error(evento.data.mensaje ?? "truncated"));
    };
    worker.onerror = (evento) => {
      evento.preventDefault();
      worker.terminate();
      fallar(new Error("worker"));
    };
    worker.postMessage({ buffer, maximo }, [buffer]);
  });
  return {
    abortar: () => {
      worker.terminate();
      rechazar(cancelada());
    },
    promesa,
  };
};

export function cargarNube(
  url: string,
  token: string,
  maximo: number,
  alProgreso: (fraccion: number) => void,
  fetchImpl: typeof fetch = fetch,
  interpretar: Interprete = interpretarEnWorker,
): Tarea<Nube> {
  const descarga = descargarNube(url, token, alProgreso, fetchImpl);
  let analisis: Tarea<Nube> | null = null;
  let abortada = false;
  const promesa = (async () => {
    const buffer = await descarga.promesa;
    if (abortada) throw cancelada();
    analisis = interpretar(buffer, maximo);
    const nube = await analisis.promesa;
    if (abortada) throw cancelada();
    return nube;
  })();
  return {
    abortar: () => {
      abortada = true;
      descarga.abortar();
      analisis?.abortar();
    },
    promesa,
  };
}
