# Requisitos — Site Viewer Lite

Construir, de punta a punta, la prueba técnica Site Viewer Lite: una API y un visor web donde una persona elige un proyecto, ve sus espacios en 3D, carga la nube de puntos y reporta un problema. El éxito es que un cliente nunca vea datos de otro ni datos internos, que las entradas malas no tumben el servidor y que la carga 3D se pueda cancelar. El acabado visual pesa menos que eso.

## Functional requirements

### FR1 — Autenticación por token

Cada petición de la API exige `Authorization: Bearer <token>` con un token de `data/users.json`. Hay dos roles: `staff` ve todos los proyectos; `client` ve solo los de su `account`.

- **FR1.1** Sin token o con token inválido la API responde 401 y no devuelve datos de proyectos.

### FR2 — Lista de proyectos

`GET /api/projects` devuelve solo los proyectos que esa persona puede ver, con `id`, nombre, dirección, estado y nombre del cliente.

- **FR2.1** Si esa persona no tiene proyectos, la respuesta es 200 con una lista vacía, distinta de un 401.

### FR3 — Detalle de proyecto

`GET /api/projects/:id` devuelve lo de la lista más fechas, niveles y contactos, según el rol.

- **FR3.1** El bloque `internal` (precio, factura, margen, notas) nunca sale del servidor, para nadie, ni en lista ni en detalle ni en errores.
- **FR3.2** Un cliente no recibe correo ni teléfono de los contactos. El staff sí.
- **FR3.3** Un proyecto que existe y no es de ese cliente responde igual que uno que no existe (mismo código y la misma forma de cuerpo, sin revelar cuál de los dos fue).
- **FR3.4** El detalle se puede revalidar con ETag y 304 ante `If-None-Match`. La respuesta es por usuario: `Cache-Control` impide cachés compartidas.
- **FR3.5** Una fecha ausente no se inventa. En el visor se muestra el texto `Not recorded`.

### FR4 — Espacios

`GET /api/projects/:id/spaces` devuelve los cuartos del proyecto que esa persona puede ver. Cada cuarto es una caja: `x`, `y`, `z` esquina mínima en metros con Z hacia arriba; `w`, `d`, `h` tamaño.

- **FR4.1** Si el archivo de espacios no existe para un proyecto visible, la API responde 404. No interpreta como espacios archivos ajenos al directorio `data/spaces`.

### FR5 — Nube de puntos

`GET /api/projects/:id/cloud` entrega el binario PTS1 del proyecto.

- **FR5.1** `Range: bytes=0-15` responde 206 con los 16 bytes del encabezado y los encabezados de rango que correspondan.
- **FR5.2** Un proyecto visible sin nube responde 404.
- **FR5.3** Un rango imposible (inicio mayor que el tamaño) responde 416. Un archivo a medio escribir no se sirve como nube completa.

### FR6 — Reportes

`POST /api/projects/:id/issues` crea un reporte `{ title, level, spaceId? }` y responde 201 con su id.

- **FR6.1** Título de 1 a 120 caracteres. El nivel debe existir en el proyecto. `spaceId`, si viene, debe ser un espacio de ese proyecto. Ids mal formados, cuerpo inválido o JSON roto responden 4xx, nunca 500.
- **FR6.2** El reporte se agrega a `data/issues.json`. La escritura es atómica (escribir y renombrar). Si el disco está lleno o el archivo es de solo lectura, la API responde un error claro y el archivo anterior queda intacto.
- **FR6.3** Dos reportes no comparten id.

### FR7 — Visor: quién y qué proyecto

Una sola página, en inglés, consume la API. Un selector de token (`staff`, `acme`, `brick`) y la lista de proyectos de ese usuario. Al abrir uno, una ficha con nombre, cliente, estado y fechas.

- **FR7.1** Cambiar de token vacía la ficha, la escena y cualquier error del usuario anterior antes de mostrar lo nuevo.

### FR8 — Espacios en 3D

Cada cuarto es una caja con un color por nivel. Se orbita, se acerca y se desplaza con mouse y con dedos. Al tocar una caja, un panel muestra nombre, uso, nivel y área en ft² o m²; un botón alterna la unidad. Un filtro muestra un solo nivel.

- **FR8.1** Sin espacio seleccionado, el panel no inventa un cuarto. El filtro «todos los niveles» vuelve a mostrar todas las cajas.

### FR9 — Carga de la nube

Un botón `Load point cloud` descarga el archivo y lo interpreta en un Web Worker, con barra de progreso real y botón `Cancel`. Se dibuja con `THREE.Points` en la misma escena, alineada con las cajas.

- **FR9.1** Cancelar aborta la descarga y el worker, y no deja puntos parciales en la escena.

### FR10 — Cambio de proyecto a mitad de carga

Si la persona abre otro proyecto mientras la nube descarga, esa descarga se cancela y ningún punto del proyecto anterior aparece en el nuevo.

### FR11 — Errores honestos

Un archivo cortado (generado con `--truncate`), un 404 o la red caída muestran un mensaje claro con `Try again`. La página no queda en blanco ni deja una excepción sin capturar en consola.

### FR12 — Formulario de reporte

Formulario corto (título, nivel, espacio seleccionado) que llama al POST y muestra el resultado. No usa `alert()` ni `prompt()`.

- **FR12.1** Un 4xx del servidor se muestra en el formulario con el motivo, sin recargar la página.

### FR13 — iPad

Usable a 1180×820 y 820×1180: controles de al menos 44 px, sin scroll horizontal y sin zoom accidental al tocar un campo.

### FR14 — Respuestas escritas

`ANSWERS.md`, en español, responde las cinco preguntas del enunciado, cada una en 120 palabras como máximo.

### FR15 — README

El README, en español, explica cómo instalar y arrancar con un solo comando, qué quedó hecho, qué falta, qué se haría con un día más, las decisiones tomadas, qué asistentes de código se usaron y para qué, y, si se bajó la cantidad o la calidad de puntos para orbitar con fluidez, por qué.

## Non-functional requirements

- **NFR1** La nube de 2 millones de puntos orbita con fluidez en un computador normal. Si se reduce cantidad o calidad, el README lo explica (FR15).
- **NFR2** Ninguna respuesta de proyecto queda en una caché compartida. El ETag es por usuario.
- **NFR3** El repositorio no contiene secretos ni depende de servicios de pago. Los tokens del kit son datos de la prueba, no credenciales reales.
- **NFR4** `npm test` ejecuta pruebas automáticas que cubren al menos las reglas 2, 4 y 5 del enunciado: `internal` no sale, un proyecto ajeno se comporta como inexistente, y la validación de reportes responde 4xx.
- **NFR5** Un JSON de datos mal formado en el kit se reporta al arrancar y el proceso no responde 500 por esa causa en una petición posterior.
- **NFR6** La página y los textos que la prueba nombra (`Load point cloud`, `Not recorded`, `Try again`) van en inglés. Identificadores, comentarios y documentación van en español.

## Constraints

- Node.js 18 o superior. Servidor con Express, Fastify o `http` nativo. Navegador con JavaScript o TypeScript, con el framework que se elija o sin ninguno. `three.js` desde npm o CDN. Sin base de datos: los datos viven en JSON y en el binario PTS1.
- Límite de la prueba: 4 horas de trabajo sugeridas y entrega en las 48 horas siguientes a recibir el kit. Si algo no cupiera, el README dice qué falta. Esta pieza de trabajo cubre las partes A, B y C.
- Commits pequeños en `main`, con prefijos `feat`, `fix` o `update`, en https://github.com/SoyKranek/Site-Viewer-Lite-MntsGrp.git.
- Producción, si algún día se publica, exige aprobación manual. Esta prueba no incluye despliegue.

## Assumptions

- **A1** El servidor se implementa con Express y el visor con Vite, TypeScript y `three.js` desde npm. Razón: las tres opciones de servidor y el visor con o sin framework están permitidas por el enunciado; la persona pidió no elegir fuera de ese conjunto. Se puede cambiar dentro del conjunto sin reabrir el alcance.
- **A2** Un solo proceso sirve la API y la página. No hay varios servidores compartiendo `issues.json`.
- **A3** El área en m² es `w * d`. En ft² se multiplica por 10.7639 y se muestra con un decimal. El enunciado no fija el redondeo.
- **A4** Un proyecto ajeno y uno inexistente responden ambos 404 con el mismo cuerpo `{ "error": "Not found" }`.
- **A5** `data/issues.json` se crea vacío si no existe. No se commitea con reportes de prueba reales; sí puede existir un archivo vacío o de ejemplo sin datos de clientes.

## Out of scope

- Login, registro, recuperación de contraseña y pantalla distinta del selector de token.
- Base de datos, facturación, edición de proyectos y un visor BIM distinto de cajas más nube de puntos.
- Despliegue a staging o producción, CI y observabilidad de plataforma.
- Modelos de lenguaje que operen la interfaz. La pregunta 3 de la parte C se responde por escrito; no se implementa el asistente.

## Open questions

None.

## Sources

## Assumptions & Open Questions

Las suposiciones A1–A5 están en Assumptions. No quedan preguntas abiertas: None.
