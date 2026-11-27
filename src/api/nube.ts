/** Sirve un tramo de la nube PTS1. El rango 0-15 devuelve la cabecera. */

import { createReadStream, statSync } from "node:fs";
import type { Response } from "express";

export interface RangoBytes {
  inicio: number;
  fin: number;
}

export function interpretarRango(cabecera: string | undefined, tamano: number): RangoBytes | "invalido" | "fuera" | null {
  if (!cabecera) return null;
  const coincidencia = /^bytes=(\d+)-(\d*)$/.exec(cabecera.trim());
  if (!coincidencia) return "invalido";
  const inicio = Number(coincidencia[1]);
  const fin = coincidencia[2] === "" ? tamano - 1 : Number(coincidencia[2]);
  if (inicio > fin) return "invalido";
  if (inicio >= tamano) return "fuera";
  return { inicio, fin: Math.min(fin, tamano - 1) };
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
    createReadStream(ruta).pipe(res);
    return;
  }
  const longitud = pedido.fin - pedido.inicio + 1;
  res.status(206);
  res.setHeader("Content-Range", `bytes ${pedido.inicio}-${pedido.fin}/${tamano}`);
  res.setHeader("Content-Length", String(longitud));
  createReadStream(ruta, { start: pedido.inicio, end: pedido.fin }).pipe(res);
}
