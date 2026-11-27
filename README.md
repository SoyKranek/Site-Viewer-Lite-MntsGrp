# Site Viewer Lite

## Arranque

Un solo comando, después de clonar:

```bash
npm install && npm run build && npm start
```

Abre http://localhost:3000. En desarrollo, `npm start` y `npm run dev:web` en dos terminales. Las pruebas: `npm test`.

Las nubes no van en Git. Se generan con `npm run clouds` (2 000 000 y 400 000 puntos).

Para probar el archivo cortado: `node site-viewer-lite-starter/tools/make-cloud.js 1201-30001 2000000 --truncate` crea `1201-30001-truncated.pts` en `data/clouds/`. Renómbralo temporalmente a `1201-30001.pts`, carga la nube y luego vuelve a ejecutar `npm run clouds`.

## Hecho

API con token Bearer, lista y detalle, espacios, rango de la nube y reportes en `data/issues.json`. El campo `internal` no sale. Un proyecto ajeno responde como si no existiera. La página en inglés lista proyectos, dibuja cajas, carga la nube en un worker con progreso y cancelación, y envía reportes.

## Nube de 2 millones

- El worker lee el archivo completo y toma una muestra uniforme: hasta 1 000 000 de puntos con mouse y 500 000 en pantallas táctiles (para el kit: 1 de cada 2 y 1 de cada 4). La pantalla indica cuántos se muestran.
- Mientras la cámara se mueve se dibuja un cuarto de la muestra; al soltar, toda. Los puntos van intercalados para que ese cuarto cubra todo el edificio.
- Posiciones en `Float32Array` y color en 3 bytes por punto. Solo se renderiza cuando algo cambia.
- La descarga usa un único buffer cuando hay `Content-Length`. Cancel, o cambiar de proyecto, aborta la red y termina el worker.

## Falta

No está medido en un iPad físico (ni los cuadros por segundo ni la memoria). No hay despliegue.

## Un día más

Mediría órbita y memoria en un iPad y ajustaría los topes. Interpretaría el archivo por tramos dentro del worker para no tenerlo entero en memoria.

## Decisiones

Express y TypeScript para la API. El detalle usa `Cache-Control: private, no-cache`, `Vary: Authorization` y ETag: el navegador puede revalidar y las cachés compartidas no lo guardan. Los assets con hash se cachean un año y el HTML se revalida siempre. Vite y three.js para la página. Los datos siguen en el JSON del kit. El área en metros es ancho por fondo; en pies se multiplica por 10.7639.

## IA

Usé Cursor con el modelo Grok para el diseño, el código, las pruebas y estos textos. Usé Claude (Anthropic) para revisar la entrega contra el enunciado y corregir API, visor, estilos, pruebas y README.
