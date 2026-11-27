# Decisiones

## ADR-001: Seis bloques, uno por archivo y por regla

- **Context** — La prueba mezcla tres preocupaciones que no cambian juntas: quién puede ver, qué datos salen del servidor, y cómo se dibuja el 3D. El kit ya separa usuarios, proyectos, espacios y la nube.
- **Decision** — Acceso, Catalogo, Espacios, Nube, Reportes y Visor. Cada entidad tiene un solo dueño. El Visor no guarda datos.
- **Consequences** — El bloque `internal` vive solo en Catalogo y no tiene una ruta propia. La nube puede fallar sin tumbar la ficha. Hay más nombres que en un único archivo de servidor.
- **Alternatives Rejected** — Un solo componente «API» más el Visor: más corto de escribir, y más fácil que un 403 de espacios revele un proyecto ajeno porque la regla quedaría repetida en cada ruta sin un dueño. Microservicios: la prueba es un proceso y un JSON local.

## ADR-002: El proyecto ajeno se resuelve en Catalogo

- **Context** — Espacios, Nube y Reportes no deben inventar otro código cuando el id es de otra cuenta.
- **Decision** — Esos bloques preguntan a Catalogo. Si Catalogo dice que no es visible, responden como si el id no existiera.
- **Consequences** — Una sola regla de ocultamiento. Catalogo es paso obligado.
- **Alternatives Rejected** — Que cada bloque lea `projects.json` y compare la cuenta: la regla de `internal` y la de «no existe» se copiarían tres veces.
