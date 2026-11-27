/** Valida y anexa un reporte. El id es único. */

import { randomUUID } from "node:crypto";
import { agregarReporte, cargarEspacios } from "./almacen.js";
import type { Proyecto, Reporte } from "./tipos.js";

export type ErrorReporte = { status: 400; error: string };

export function crearReporte(
  proyecto: Proyecto,
  cuerpo: unknown,
): { ok: true; reporte: Reporte } | { ok: false; fallo: ErrorReporte } {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return { ok: false, fallo: { status: 400, error: "Bad request" } };
  }
  const datos = cuerpo as { title?: unknown; level?: unknown; spaceId?: unknown };
  if (typeof datos.title !== "string" || datos.title.length < 1 || datos.title.length > 120) {
    return { ok: false, fallo: { status: 400, error: "Bad request" } };
  }
  if (typeof datos.level !== "string" || !proyecto.levels.includes(datos.level)) {
    return { ok: false, fallo: { status: 400, error: "Bad request" } };
  }
  if (datos.spaceId !== undefined) {
    if (typeof datos.spaceId !== "string") {
      return { ok: false, fallo: { status: 400, error: "Bad request" } };
    }
    const espacios = cargarEspacios(proyecto.id) ?? [];
    if (!espacios.some((espacio) => espacio.id === datos.spaceId)) {
      return { ok: false, fallo: { status: 400, error: "Bad request" } };
    }
  }
  const reporte: Reporte = {
    id: randomUUID(),
    projectId: proyecto.id,
    title: datos.title,
    level: datos.level,
    ...(typeof datos.spaceId === "string" ? { spaceId: datos.spaceId } : {}),
  };
  agregarReporte(reporte);
  return { ok: true, reporte };
}
