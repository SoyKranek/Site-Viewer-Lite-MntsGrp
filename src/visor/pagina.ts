/** Página en inglés. Cambiar de token o de proyecto no deja la escena anterior. */

import { descargarNube, type Descarga } from "./carga-nube";
import { crearEscena, type Escena } from "./escena";
import { textoFecha } from "./fechas";
import { areaMetros, areaPies, type Caja } from "./geometria";
import { parsearPts, type Punto } from "./parser-pts";

const TOKENS: Record<string, string> = { staff: "staff-token", acme: "acme-token", brick: "brick-token" };

interface Detalle {
  id: string;
  name: string;
  status: string;
  client: string;
  dates: { signed: string | null; scan: string | null; estimatedDelivery: string | null; delivered: string | null };
  levels: string[];
}

export interface Cliente {
  get: (ruta: string, token: string) => Promise<Response>;
  post: (ruta: string, token: string, cuerpo: unknown) => Promise<Response>;
}

const clienteReal: Cliente = {
  get: (ruta, token) => fetch(ruta, { headers: { Authorization: `Bearer ${token}` } }),
  post: (ruta, token, cuerpo) =>
    fetch(ruta, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }),
};

export function montarPagina(raiz: HTMLElement, cliente: Cliente = clienteReal): void {
  raiz.innerHTML = `
    <aside class="columna">
      <div id="tokens"></div>
      <div id="lista"></div>
      <div id="ficha"></div>
      <label>Level <select id="filtro"><option value="all">All levels</option></select></label>
      <div id="panel" class="panel"></div>
      <button id="cargar" type="button">Load point cloud</button>
      <button id="cancelar" type="button">Cancel</button>
      <progress id="progreso" value="0" max="1"></progress>
      <p id="error" class="error"></p>
      <form id="reporte">
        <input id="titulo" name="title" maxlength="120" placeholder="Title" />
        <select id="nivel"></select>
        <button type="submit">Save issue</button>
        <p id="resultado"></p>
      </form>
      <button id="unidad" type="button">ft²</button>
    </aside>
    <canvas id="lienzo" class="lienzo"></canvas>`;

  let token = "";
  let proyecto = "";
  let generacion = 0;
  let unidad: "m" | "ft" = "ft";
  let seleccion: Caja | null = null;
  let cajas: Caja[] = [];
  let detalle: Detalle | null = null;
  let descarga: Descarga | null = null;
  let escena: Escena | null = null;
  const lienzo = raiz.querySelector<HTMLCanvasElement>("#lienzo")!;

  function error(texto: string) {
    const nodo = raiz.querySelector("#error")!;
    nodo.textContent = texto;
  }

  function pintarPanel() {
    const panel = raiz.querySelector("#panel")!;
    if (!seleccion) {
      panel.textContent = "";
      return;
    }
    const area = unidad === "m" ? `${areaMetros(seleccion).toFixed(1)} m²` : `${areaPies(seleccion)} ft²`;
    panel.textContent = `${seleccion.name} · ${seleccion.use} · ${seleccion.level} · ${area}`;
  }

  function limpiarEscena() {
    descarga?.abortar();
    descarga = null;
    seleccion = null;
    cajas = [];
    detalle = null;
    proyecto = "";
    escena?.limpiarPuntos();
    escena?.fijarCajas([], [], "all");
    pintarPanel();
    error("");
    raiz.querySelector("#ficha")!.textContent = "";
    raiz.querySelector("#resultado")!.textContent = "";
    (raiz.querySelector("#progreso") as HTMLProgressElement).value = 0;
  }

  function pintarFicha() {
    if (!detalle) return;
    const fechas = detalle.dates;
    raiz.querySelector("#ficha")!.textContent = [
      detalle.name,
      detalle.client,
      detalle.status,
      textoFecha(fechas.signed),
      textoFecha(fechas.scan),
      textoFecha(fechas.estimatedDelivery),
      textoFecha(fechas.delivered),
    ].join(" · ");
  }

  async function elegirToken(nombre: string) {
    generacion += 1;
    limpiarEscena();
    token = TOKENS[nombre];
    const respuesta = await cliente.get("/api/projects", token);
    const lista = (await respuesta.json()) as { id: string; name: string }[];
    const nodo = raiz.querySelector("#lista")!;
    nodo.innerHTML = "";
    for (const item of lista) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = item.name;
      boton.addEventListener("click", () => elegirProyecto(item.id));
      nodo.append(boton);
    }
  }

  async function elegirProyecto(id: string) {
    const marca = ++generacion;
    descarga?.abortar();
    descarga = null;
    escena?.limpiarPuntos();
    seleccion = null;
    pintarPanel();
    error("");
    proyecto = id;
    const [det, esp] = await Promise.all([
      cliente.get(`/api/projects/${id}`, token),
      cliente.get(`/api/projects/${id}/spaces`, token),
    ]);
    if (marca !== generacion) return;
    detalle = (await det.json()) as Detalle;
    cajas = (await esp.json()) as Caja[];
    pintarFicha();
    const filtro = raiz.querySelector<HTMLSelectElement>("#filtro")!;
    const nivel = raiz.querySelector<HTMLSelectElement>("#nivel")!;
    filtro.innerHTML = `<option value="all">All levels</option>` + detalle.levels.map((n) => `<option>${n}</option>`).join("");
    nivel.innerHTML = detalle.levels.map((n) => `<option>${n}</option>`).join("");
    if (!escena) {
      try {
        escena = crearEscena(lienzo);
        escena.alElegir((espacioId) => {
          seleccion = cajas.find((caja) => caja.id === espacioId) ?? null;
          pintarPanel();
        });
      } catch {
        escena = null;
      }
    }
    escena?.fijarCajas(cajas, detalle.levels, filtro.value);
  }

  raiz.querySelector("#tokens")!.innerHTML = ["staff", "acme", "brick"]
    .map((nombre) => `<button type="button" data-token="${nombre}">${nombre}</button>`)
    .join("");
  raiz.querySelector("#tokens")!.addEventListener("click", (evento) => {
    const objetivo = evento.target as HTMLElement;
    const nombre = objetivo.dataset.token;
    if (nombre) void elegirToken(nombre);
  });
  raiz.querySelector("#filtro")!.addEventListener("change", () => {
    escena?.fijarCajas(cajas, detalle?.levels ?? [], (raiz.querySelector("#filtro") as HTMLSelectElement).value);
  });
  raiz.querySelector("#unidad")!.addEventListener("click", () => {
    unidad = unidad === "ft" ? "m" : "ft";
    (raiz.querySelector("#unidad") as HTMLButtonElement).textContent = unidad === "ft" ? "ft²" : "m²";
    pintarPanel();
  });
  raiz.querySelector("#cargar")!.addEventListener("click", () => {
    if (!proyecto) return;
    const marca = generacion;
    error("");
    descarga?.abortar();
    escena?.limpiarPuntos();
    descarga = descargarNube(`/api/projects/${proyecto}/cloud`, token, (fraccion) => {
      (raiz.querySelector("#progreso") as HTMLProgressElement).value = fraccion;
    });
    descarga.promesa
      .then((buffer) => interpretar(buffer, marca))
      .catch((fallo: unknown) => {
        if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        const mensaje = fallo instanceof Error && fallo.message === "missing" ? "Point cloud was not found." : "The point cloud could not be read.";
        error(`${mensaje} Try again`);
      });
  });
  raiz.querySelector("#cancelar")!.addEventListener("click", () => {
    descarga?.abortar();
    descarga = null;
    escena?.limpiarPuntos();
    (raiz.querySelector("#progreso") as HTMLProgressElement).value = 0;
  });
  function interpretar(buffer: ArrayBuffer, marca: number) {
    const pintar = (puntos: Punto[]) => {
      if (marca !== generacion) return;
      escena?.fijarPuntos(puntos);
    };
    const fallar = () => error("The point cloud could not be read. Try again");
    try {
      const worker = new Worker(new URL("./trabajador-nube.ts", import.meta.url), { type: "module" });
      worker.onmessage = (evento: MessageEvent<{ ok: boolean; puntos?: Punto[] }>) => {
        worker.terminate();
        if (evento.data.ok && evento.data.puntos) pintar(evento.data.puntos);
        else fallar();
      };
      worker.postMessage(buffer, [buffer]);
    } catch {
      try {
        pintar(parsearPts(buffer));
      } catch {
        fallar();
      }
    }
  }

  raiz.querySelector("#reporte")!.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!proyecto) return;
    const titulo = (raiz.querySelector("#titulo") as HTMLInputElement).value;
    const level = (raiz.querySelector("#nivel") as HTMLSelectElement).value;
    const respuesta = await cliente.post(`/api/projects/${proyecto}/issues`, token, {
      title: titulo,
      level,
      ...(seleccion ? { spaceId: seleccion.id } : {}),
    });
    const cuerpo = (await respuesta.json()) as { id?: string; error?: string };
    raiz.querySelector("#resultado")!.textContent = respuesta.ok ? `Saved ${cuerpo.id}` : (cuerpo.error ?? "Bad request");
  });
}

const app = document.querySelector<HTMLElement>("#app");
if (app) montarPagina(app);
