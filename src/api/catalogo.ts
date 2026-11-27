/** Lista y detalle visibles según el rol. internal nunca sale. */

import type { Contacto, Proyecto, ResumenProyecto, Usuario } from "./tipos.js";

export function proyectoVisible(proyecto: Proyecto, usuario: Usuario): boolean {
  if (usuario.role === "staff") return true;
  return proyecto.account === usuario.account;
}

export function resumir(proyecto: Proyecto): ResumenProyecto {
  return {
    id: proyecto.id,
    name: proyecto.name,
    address: proyecto.address,
    status: proyecto.status,
    client: proyecto.client.name,
  };
}

function contactosPara(contactos: Contacto[], usuario: Usuario): Contacto[] {
  if (usuario.role === "staff") return contactos;
  return contactos.map(({ name, role }) => ({ name, role }));
}

export function detallePara(proyecto: Proyecto, usuario: Usuario) {
  return {
    ...resumir(proyecto),
    dates: proyecto.dates,
    levels: proyecto.levels,
    contacts: contactosPara(proyecto.client.contacts, usuario),
  };
}

export function listar(proyectos: Proyecto[], usuario: Usuario): ResumenProyecto[] {
  return proyectos.filter((proyecto) => proyectoVisible(proyecto, usuario)).map(resumir);
}

export function buscarVisible(proyectos: Proyecto[], id: string, usuario: Usuario): Proyecto | null {
  const proyecto = proyectos.find((item) => item.id === id);
  if (!proyecto || !proyectoVisible(proyecto, usuario)) return null;
  return proyecto;
}
