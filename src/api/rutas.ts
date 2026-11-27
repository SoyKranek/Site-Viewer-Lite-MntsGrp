/** Rutas de la parte A. Un fallo de validación responde 4xx, nunca 500. */

import { existsSync } from "node:fs";
import { Router, type Request, type Response } from "express";
import { exigirUsuario } from "./acceso.js";
import {
  cargarEspacios,
  cargarProyectos,
  etagDe,
  idValido,
  leerReportes,
  rutaNube,
} from "./almacen.js";
import { buscarVisible, detallePara, listar } from "./catalogo.js";
import { enviarArchivo } from "./nube.js";
import { crearReporte } from "./reportes.js";
import type { Usuario } from "./tipos.js";

function usuario(res: Response): Usuario {
  return res.locals.usuario as Usuario;
}

function noEncontrado(res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function crearRutas(): Router {
  const rutas = Router();
  rutas.use("/api", exigirUsuario);

  rutas.get("/api/projects", (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json(listar(cargarProyectos(), usuario(res)));
  });

  rutas.get("/api/projects/:id", (req, res) => {
    if (!idValido(req.params.id)) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const proyecto = buscarVisible(cargarProyectos(), req.params.id, usuario(res));
    if (!proyecto) {
      noEncontrado(res);
      return;
    }
    const detalle = detallePara(proyecto, usuario(res));
    const etag = etagDe(detalle);
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, no-store");
    if (req.header("if-none-match") === etag) {
      res.status(304).end();
      return;
    }
    res.json(detalle);
  });

  rutas.get("/api/projects/:id/spaces", (req, res) => {
    if (!idValido(req.params.id)) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const proyecto = buscarVisible(cargarProyectos(), req.params.id, usuario(res));
    if (!proyecto) {
      noEncontrado(res);
      return;
    }
    const espacios = cargarEspacios(proyecto.id);
    if (!espacios) {
      noEncontrado(res);
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json(espacios);
  });

  rutas.get("/api/projects/:id/cloud", (req: Request, res: Response) => {
    if (!idValido(req.params.id)) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const proyecto = buscarVisible(cargarProyectos(), req.params.id, usuario(res));
    if (!proyecto || !proyecto.cloud) {
      noEncontrado(res);
      return;
    }
    const ruta = rutaNube(proyecto.cloud);
    if (!ruta || !existsSync(ruta)) {
      noEncontrado(res);
      return;
    }
    enviarArchivo(res, ruta, req.header("range"));
  });

  rutas.get("/api/projects/:id/issues", (req, res) => {
    if (!idValido(req.params.id)) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const proyecto = buscarVisible(cargarProyectos(), req.params.id, usuario(res));
    if (!proyecto) {
      noEncontrado(res);
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json(
      leerReportes()
        .filter((reporte) => reporte.projectId === proyecto.id)
        .map(({ id, title, level, spaceId }) => ({ id, title, level, ...(spaceId ? { spaceId } : {}) })),
    );
  });

  rutas.post("/api/projects/:id/issues", (req, res) => {
    if (!idValido(req.params.id)) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const proyecto = buscarVisible(cargarProyectos(), req.params.id, usuario(res));
    if (!proyecto) {
      noEncontrado(res);
      return;
    }
    const resultado = crearReporte(proyecto, req.body);
    if (!resultado.ok) {
      res.status(resultado.fallo.status).json({ error: resultado.fallo.error });
      return;
    }
    res.status(201).json({ id: resultado.reporte.id });
  });

  return rutas;
}
