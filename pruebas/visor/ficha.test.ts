// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { textoFecha } from "../../src/visor/fechas";
import { montarPagina, type Cliente } from "../../src/visor/pagina";

function cliente(proyectos: { id: string; name: string }[]): Cliente {
  return {
    get: async (ruta) => new Response(JSON.stringify(ruta.endsWith("/projects") ? proyectos : {}), { status: 200 }),
    post: async () => new Response("{}", { status: 201 }),
  };
}

describe("Ficha", () => {
  it("escribe Not recorded cuando la fecha es null", () => {
    expect(textoFecha(null)).toBe("Not recorded");
    expect(textoFecha("2026-08-04")).toBe("2026-08-04");
  });

  it("lista los proyectos del token", async () => {
    const raiz = document.createElement("div");
    montarPagina(raiz, cliente([{ id: "1201-30001", name: "410 Harbor Ave" }]));
    (raiz.querySelector("[data-token=acme]") as HTMLButtonElement).click();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(raiz.querySelector("#lista")!.textContent).toContain("410 Harbor Ave");
  });

  it("cambiar de token vacía la ficha", async () => {
    const raiz = document.createElement("div");
    montarPagina(raiz, cliente([]));
    raiz.querySelector("#ficha")!.textContent = "410 Harbor Ave";
    (raiz.querySelector("[data-token=staff]") as HTMLButtonElement).click();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(raiz.querySelector("#ficha")!.textContent).toBe("");
    expect(raiz.querySelector("#error")!.textContent).toBe("");
  });

  it("una lista vacía no inventa proyectos", async () => {
    const raiz = document.createElement("div");
    montarPagina(raiz, cliente([]));
    (raiz.querySelector("[data-token=brick]") as HTMLButtonElement).click();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(raiz.querySelectorAll("#lista button")).toHaveLength(0);
  });

  it("el panel empieza sin un cuarto", () => {
    const raiz = document.createElement("div");
    montarPagina(raiz, cliente([]));
    expect(raiz.querySelector("#panel")!.textContent).toBe("");
  });
});
