# Site Viewer Lite

## Arranque

Un solo comando, después de clonar:

```bash
npm install && npm run build && npm start
```

Abre http://localhost:3000. En desarrollo, `npm start` y `npm run dev:web` en dos terminales. Las pruebas: `npm test`.

La nube grande se genera con el kit: `node site-viewer-lite-starter/tools/make-cloud.js 1201-30001`.

## Hecho

API con token Bearer, lista y detalle, espacios, rango de la nube y reportes en `data/issues.json`. El campo `internal` no sale. Un proyecto ajeno responde como si no existiera. La página en inglés lista proyectos, dibuja cajas, carga la nube en un worker con progreso y cancelación, y envía reportes.

## Falta

No medí la órbita de 2 millones de puntos en un computador ni en un iPad. El repositorio no incluye esos binarios grandes: hay que generarlos. No hay despliegue.

## Un día más

Mediría los 2 millones de puntos y, si hiciera falta, bajaría densidad en el worker. Añadiría hashes a los estáticos para que un deploy no deje la versión vieja en caché.

## Decisiones

Express y TypeScript para la API. Vite y three.js para la página. Los datos siguen en el JSON del kit. El área en metros es ancho por fondo; en pies se multiplica por 10.7639.

## IA

Usé Cursor con el modelo Grok para el diseño, el código, las pruebas y estos textos. Revisé las reglas del enunciado y las pruebas automáticas.
