/** Sirve un tramo de la nube PTS1. El rango 0-15 devuelve la cabecera. */

import { createReadStream, statSync } from "node:fs";
import { pipeline } from "node:stream";
import type { Response } from "express";

export interface RangoBytes {
  inicio: number;
  fin: number;
}

export function interpretarRango(cabecera: string | undefined, tamano: number): RangoBytes | "invalido" | "fuera" | null {
  if (!cabecera) return null;
  const sufijo = /^bytes=-(\d+)$/.exec(cabecera.trim());
  if (sufijo) {
    const ultimos = Number(sufijo[1]);
    if (ultimos === 0) return "fuera";
    return { inicio: Math.max(0, tamano - ultimos), fin: tamano - 1 };
  }
  const coincidencia = /^bytes=(\d+)-(\d*)$/.exec(cabecera.trim());
  if (!coincidencia) return "invalido";
  const inicio = Number(coincidencia[1]);
  const fin = coincidencia[2] === "" ? tamano - 1 : Number(coincidencia[2]);
  if (inicio > fin) return "invalido";
  if (inicio >= tamano) return "fuera";
  return { inicio, fin: Math.min(fin, tamano - 1) };
}

// pipeline cierra el archivo si el cliente cancela y no deja errores sin capturar.
function alTerminar(error: NodeJS.ErrnoException | null): void {
  if (error && error.code !== "ERR_STREAM_PREMATURE_CLOSE") console.error(error);
}

export function enviarArchivo(res: Response, ruta: string, rango: string | undefined): void {
  const tamano = statSync(ruta).size;
  const pedido = interpretarRango(rango, tamano);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, no-store");
  if (pedido === "invalido") {
    res.status(400).json({ error: "Bad range" });
    return;
  }
  if (pedido === "fuera") {
    res.status(416).setHeader("Content-Range", `bytes */${tamano}`).end();
    return;
  }
  if (!pedido) {
    res.status(200);
    res.setHeader("Content-Length", String(tamano));
    pipeline(createReadStream(ruta), res, alTerminar);
    return;
  }
  const longitud = pedido.fin - pedido.inicio + 1;
  res.status(206);
  res.setHeader("Content-Range", `bytes ${pedido.inicio}-${pedido.fin}/${tamano}`);
  res.setHeader("Content-Length", String(longitud));
  pipeline(createReadStream(ruta, { start: pedido.inicio, end: pedido.fin }), res, alTerminar);
}
