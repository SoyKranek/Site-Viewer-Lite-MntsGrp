/** Lectura del kit y escritura atómica de reportes. */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { Espacio, Proyecto, Reporte, Usuario } from "./tipos.js";

export const raizProyecto = path.resolve(process.cwd());
export const carpetaKit = path.join(raizProyecto, "site-viewer-lite-starter", "data");
export const archivoReportes = path.join(raizProyecto, "data", "issues.json");

export function leerJson<T>(ruta: string): T {
  return JSON.parse(readFileSync(ruta, "utf8")) as T;
}

export function cargarUsuarios(): Usuario[] {
  return leerJson<Usuario[]>(path.join(carpetaKit, "users.json"));
}

export function cargarProyectos(): Proyecto[] {
  return leerJson<Proyecto[]>(path.join(carpetaKit, "projects.json"));
}

export function rutaEspacios(id: string): string {
  const destino = path.resolve(carpetaKit, "spaces", `${id}.json`);
  const base = path.resolve(carpetaKit, "spaces");
  if (!destino.startsWith(base + path.sep)) {
    throw new Error("ruta fuera de spaces");
  }
  return destino;
}

export function cargarEspacios(id: string): Espacio[] | null {
  const ruta = rutaEspacios(id);
  if (!existsSync(ruta)) return null;
  return leerJson<Espacio[]>(ruta);
}

export function rutaNube(nombre: string): string | null {
  if (nombre.includes("..") || nombre.includes("/") || nombre.includes("\\")) return null;
  const destino = path.resolve(carpetaKit, "clouds", nombre);
  const base = path.resolve(carpetaKit, "clouds");
  if (!destino.startsWith(base + path.sep) && destino !== base) return null;
  return destino;
}

export function etagDe(valor: unknown): string {
  const hash = createHash("sha256").update(JSON.stringify(valor)).digest("hex").slice(0, 16);
  return `"${hash}"`;
}

export function idValido(id: string): boolean {
  return /^[0-9]{4}-[0-9]{5}$/.test(id);
}

export function leerReportes(): Reporte[] {
  if (!existsSync(archivoReportes)) return [];
  return leerJson<Reporte[]>(archivoReportes);
}

export function agregarReporte(reporte: Reporte): void {
  mkdirSync(path.dirname(archivoReportes), { recursive: true });
  const actuales = leerReportes();
  actuales.push(reporte);
  const temporal = `${archivoReportes}.${process.pid}.tmp`;
  writeFileSync(temporal, JSON.stringify(actuales, null, 2));
  renameSync(temporal, archivoReportes);
}
