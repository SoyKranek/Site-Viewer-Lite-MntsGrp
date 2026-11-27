// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { montarPagina, type Cliente } from "../../src/visor/pagina";

const detalle = {
  id: "1201-30001",
  name: "410 Harbor Ave",
  client: "Acme Builders",
  status: "In production",
  dates: { signed: "2026-08-04", scan: null, estimatedDelivery: null, delivered: null },
  levels: ["Level 1"],
};

function cliente(estado: number, cuerpo: unknown): Cliente {
  return {
    get: async (ruta) => {
      if (ruta.endsWith("/projects")) return new Response(JSON.stringify([{ id: detalle.id, name: detalle.name }]));
      if (ruta.endsWith("/spaces")) return new Response("[]");
      return new Response(JSON.stringify(detalle));
    },
    post: async () => new Response(JSON.stringify(cuerpo), { status: estado }),
  };
}

async function abrir(raiz: HTMLElement, api: Cliente) {
  montarPagina(raiz, api);
  (raiz.querySelector("[data-token=acme]") as HTMLButtonElement).click();
  await new Promise((resolver) => setTimeout(resolver, 0));
  (raiz.querySelector("#lista button") as HTMLButtonElement).click();
  await new Promise((resolver) => setTimeout(resolver, 0));
}

describe("Formulario", () => {
  it("muestra Not recorded y el id guardado", async () => {
    const raiz = document.createElement("div");
    await abrir(raiz, cliente(201, { id: "rep-1" }));
    expect(raiz.querySelector("#ficha")!.textContent).toContain("Not recorded");
    (raiz.querySelector("#titulo") as HTMLInputElement).value = "Door";
    raiz.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(raiz.querySelector("#resultado")!.textContent).toContain("rep-1");
  });

  it("muestra el 400 en el formulario", async () => {
    const raiz = document.createElement("div");
    await abrir(raiz, cliente(400, { error: "Bad request" }));
    raiz.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(raiz.querySelector("#resultado")!.textContent).toBe("Bad request");
  });

  it("el formulario no llama a alert ni a prompt", async () => {
    const { readFileSync } = await import("node:fs");
    const fuente = readFileSync("src/visor/pagina.ts", "utf8");
    expect(fuente.includes("alert(")).toBe(false);
    expect(fuente.includes("prompt(")).toBe(false);
  });
});
