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

## Nube de 2 millones

`node site-viewer-lite-starter/tools/make-cloud.js 1201-30001` escribe `site-viewer-lite-starter/data/clouds/1201-30001.pts` (2 000 000 puntos, unos 32 MB). Ese binario no va en Git.

El worker lee el archivo completo y dibuja como máximo 250 000 puntos, uno de cada ocho, en `Float32Array`. Dos millones de objetos en el hilo principal congelarían la pestaña; la muestra uniforme mantiene la forma del edificio y deja orbitar. La barra dice cuántos puntos se anuncian y cuántos se dibujan.

## Falta

No lo probé en un iPad físico. No hay despliegue.

## Un día más

Mediría la órbita en un iPad y, si hiciera falta, bajaría el tope de 250 000. Añadiría hashes a los estáticos para que un deploy no deje la versión vieja en caché.

## Decisiones

Express y TypeScript para la API. Vite y three.js para la página. Los datos siguen en el JSON del kit. El área en metros es ancho por fondo; en pies se multiplica por 10.7639.

## IA

Usé Cursor con el modelo Grok para el diseño, el código, las pruebas y estos textos. Revisé las reglas del enunciado y las pruebas automáticas.
