# Respuestas

## 1

En el iPad miraría la memoria de la pestaña y si Safari la mata al pasar de unos cientos de megabytes. El computador aguanta el ArrayBuffer entero; el iPad no. Bajaría la densidad en el worker antes de crear la geometría, pediría la nube por rangos y liberaría el buffer al terminar. Cancel debe seguir abortando la descarga para no dejar la pestaña creciendo.

## 2

El navegador guarda `index.html` y los JS con la caché larga, así que el HTML viejo sigue apuntando a los bundles viejos. El servidor nuevo no importa si el cliente no lo pide. Los estáticos van con hash en el nombre y caché larga; el HTML va con `no-cache`. Así el siguiente load toma el HTML nuevo y ese HTML nombra los archivos nuevos.

## 3

Cada herramienta devuelve un resultado observado, no la intención. «Abrir el inspector» solo puede responder éxito si el panel quedó visible y el modelo lee ese estado. Si la acción no ocurrió, la herramienta devuelve el fallo y el modelo no tiene texto de éxito que inventar. Un paso que no comprueba el DOM no puede decir que terminó.

## 4

Busco la lista y el detalle: un cliente no debe recibir ids ni nombres de otra cuenta. La causa suele ser una lista sin filtro, una caché compartida o un 404 que confirma que el id existe. La regla es resolver la visibilidad en un solo sitio y responder igual para ajeno e inexistente, con `Cache-Control: private, no-store`.

## 5

Primero bajaría puntos en el worker: es el cambio que más alivia la GPU y se explica en el README. Después un solo `BufferGeometry` con colores en el vértice, sin recrearlo al orbitar. Al final, dibujar un subconjunto mientras la cámara se mueve y el resto al soltar. Mediría cuadros antes de tocar el sombreador.
