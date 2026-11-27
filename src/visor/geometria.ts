/** Cajas, colores y área. El área en m² es ancho por fondo. */

export interface Caja {
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

const PALETA = ["#2f6fed", "#1f9d55", "#d97706", "#be185d", "#0f766e", "#7c3aed"];

export function colorDeNivel(nivel: string, niveles: string[]): string {
  const indice = Math.max(0, niveles.indexOf(nivel));
  return PALETA[indice % PALETA.length];
}

export function areaMetros(caja: Caja): number {
  return caja.w * caja.d;
}

export function areaPies(caja: Caja): string {
  return (areaMetros(caja) * 10.7639).toFixed(1);
}

export function filtrarNivel(cajas: Caja[], nivel: string): Caja[] {
  if (nivel === "" || nivel === "all") return cajas;
  return cajas.filter((caja) => caja.level === nivel);
}
