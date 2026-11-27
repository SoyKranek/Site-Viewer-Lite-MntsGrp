/** Una fecha ausente se muestra tal como pide la prueba. */

export function textoFecha(valor: string | null): string {
  return valor ?? "Not recorded";
}
