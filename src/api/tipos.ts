/** Tipos del enunciado: usuario, proyecto, contacto, espacio y reporte. */

export type Rol = "staff" | "client";

export interface Usuario {
  token: string;
  name: string;
  role: Rol;
  account?: string;
}

export interface Contacto {
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface FechasProyecto {
  signed: string | null;
  scan: string | null;
  estimatedDelivery: string | null;
  delivered: string | null;
}

export interface InternoProyecto {
  price: number;
  invoice: string;
  margin: number;
  notes: string;
}

export interface Proyecto {
  id: string;
  name: string;
  address: string;
  account: string;
  client: { name: string; contacts: Contacto[] };
  status: string;
  dates: FechasProyecto;
  levels: string[];
  cloud: string | null;
  internal: InternoProyecto;
}

export interface Espacio {
  id: string;
  name: string;
  use: string;
  level: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface Reporte {
  id: string;
  projectId: string;
  title: string;
  level: string;
  spaceId?: string;
}

export interface ResumenProyecto {
  id: string;
  name: string;
  address: string;
  status: string;
  client: string;
}
