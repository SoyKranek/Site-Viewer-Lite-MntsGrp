# Reglas de u1-api

Salen del enunciado. Un fallo de validación es 4xx, nunca 500.

- **BR1.1** Sin `Authorization: Bearer <token>` o con token que no está en `users.json`: 401 y cuerpo `{ "error": "Unauthorized" }`.
- **BR2.1** Lista vacía si no hay proyectos visibles: 200 y `[]`.
- **BR3.1** `internal` no aparece en ninguna respuesta, ni en errores.
- **BR3.2** Un `client` no recibe `email` ni `phone` de los contactos. `staff` sí.
- **BR3.3** Un id que existe y no es de la cuenta del cliente responde igual que un id que no existe: 404 y `{ "error": "Not found" }`. Vale para detalle, espacios, nube y alta de reporte.
- **BR3.4** Detalle con `If-None-Match` igual al ETag actual: 304 sin cuerpo. `Cache-Control: private, no-store`.
- **BR4.1** Espacios solo si el proyecto es visible. Archivo ausente: 404. No se lee fuera de `data/spaces`.
- **BR5.1** `Range: bytes=0-15` en una nube existente: 206, 16 bytes, `Content-Range` y `Accept-Ranges: bytes`.
- **BR5.2** Proyecto visible con `cloud: null` o archivo ausente: 404.
- **BR5.3** Rango con inicio mayor que el tamaño: 416.
- **BR6.1** `title` de 1 a 120 caracteres. `level` existe en el proyecto. `spaceId`, si viene, es un espacio de ese proyecto. JSON roto o id mal formado: 400, nunca 500.
- **BR6.2** Alta válida: 201 y `{ "id": "<id>" }`. Se agrega a `data/issues.json` con escritura atómica.
- **BR6.3** Dos altas no comparten id.
