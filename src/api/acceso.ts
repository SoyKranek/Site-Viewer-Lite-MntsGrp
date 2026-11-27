/** Resuelve el Bearer contra users.json. Sin token o desconocido: 401. */

import type { Request, Response, NextFunction } from "express";
import { cargarUsuarios } from "./almacen.js";
import type { Usuario } from "./tipos.js";

export function usuarioDe(cabecera: string | undefined): Usuario | null {
  if (!cabecera || !cabecera.startsWith("Bearer ")) return null;
  const token = cabecera.slice("Bearer ".length).trim();
  if (!token) return null;
  return cargarUsuarios().find((usuario) => usuario.token === token) ?? null;
}

export function exigirUsuario(req: Request, res: Response, next: NextFunction): void {
  const usuario = usuarioDe(req.header("authorization"));
  if (!usuario) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.locals.usuario = usuario;
  next();
}
