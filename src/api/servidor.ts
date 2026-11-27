/** Servidor Express. El JSON mal formado llega como 400. */

import express from "express";
import { crearRutas } from "./rutas.js";

export function crearAplicacion() {
  const aplicacion = express();
  aplicacion.use(
    express.json({
      type: "application/json",
    }),
  );
  aplicacion.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    next(error);
  });
  aplicacion.use(crearRutas());
  return aplicacion;
}

const esPrincipal = process.argv[1]?.replace(/\\/g, "/").endsWith("src/api/servidor.ts");
if (esPrincipal) {
  const puerto = Number(process.env.PORT ?? 3000);
  crearAplicacion().listen(puerto, () => {
    console.log(`API en http://localhost:${puerto}`);
  });
}
