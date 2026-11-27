/** Servidor Express. El JSON mal formado llega como 400. */

import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import { exigirUsuario } from "./acceso.js";
import { crearRutas } from "./rutas.js";

// Cuerpo roto, enorme o URL mal codificada: se conserva el 4xx y no se filtra la traza.
function manejarError(error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  const estado = (error as { status?: unknown } | null)?.status;
  if (typeof estado === "number" && estado >= 400 && estado < 500) {
    res.status(estado).json({ error: "Bad request" });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal error" });
}

export function crearAplicacion() {
  const aplicacion = express();
  aplicacion.disable("x-powered-by");
  // La autenticación va antes de leer el cuerpo: sin token siempre es 401.
  aplicacion.use("/api", exigirUsuario, express.json({ limit: "10kb" }));
  aplicacion.use(crearRutas());
  const dist = path.resolve("dist");
  if (existsSync(dist)) {
    aplicacion.use(
      express.static(dist, {
        setHeaders(res, archivo) {
          // Los assets llevan hash en el nombre; el HTML se revalida siempre.
          const conHash = path.dirname(archivo) === path.join(dist, "assets");
          res.setHeader("Cache-Control", conHash ? "public, max-age=31536000, immutable" : "no-cache");
        },
      }),
    );
  }
  aplicacion.use(manejarError);
  return aplicacion;
}

const esPrincipal = process.argv[1]?.replace(/\\/g, "/").endsWith("src/api/servidor.ts");
if (esPrincipal) {
  const puerto = Number(process.env.PORT ?? 3000);
  crearAplicacion().listen(puerto, () => {
    console.log(`API en http://localhost:${puerto}`);
  });
}
