/** Página en inglés. Cambiar de token o de proyecto no deja la escena anterior. */

import { descargarNube, type Descarga } from "./carga-nube";
import { crearEscena, type Escena } from "./escena";
import { textoFecha } from "./fechas";
import { areaMetros, areaPies, type Caja } from "./geometria";
import { parsearPts, type Punto } from "./parser-pts";

const TOKENS: Record<string, string> = { staff: "staff-token", acme: "acme-token", brick: "brick-token" };

const CUENTAS = {
  staff: { nombre: "Dana Ortiz", rol: "Staff", alcance: "Every account. Contacts include email and phone." },
  acme: { nombre: "Sam Lee", rol: "Client · Acme Builders", alcance: "Only Acme projects. Email and phone stay hidden." },
  brick: { nombre: "Rita Gomez", rol: "Client · Brick & Co", alcance: "Only Brick & Co projects. Email and phone stay hidden." },
} as const;

interface Contacto {
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

interface Resumen {
  id: string;
  name: string;
  address?: string;
  status?: string;
  client?: string;
}

interface Detalle {
  id: string;
  name: string;
  address?: string;
  status: string;
  client: string;
  dates: { signed: string | null; scan: string | null; estimatedDelivery: string | null; delivered: string | null };
  levels: string[];
  contacts?: Contacto[];
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
      <header class="marca"><strong>Site Viewer</strong><span>Lite</span></header>
      <p id="sesion"></p>
      <button id="salir" type="button">Sign out</button>
      <p id="entrar" class="seccion">Sign in</p>
      <div id="tokens"></div>
      <div id="trabajo">
        <p class="seccion">Projects</p>
        <input id="buscar" type="search" placeholder="Filter projects" />
        <div id="lista"></div>
        <div id="ficha"></div>
        <label>Level <select id="filtro"><option value="all">All levels</option></select></label>
        <div id="panel" class="panel"></div>
        <div class="fila">
          <button id="cargar" type="button">Load point cloud</button>
          <button id="cancelar" type="button">Cancel</button>
        </div>
        <div class="fila">
          <button id="encuadrar" type="button">Fit view</button>
          <button id="unidad" type="button">ft²</button>
        </div>
        <progress id="progreso" value="0" max="1"></progress>
        <p id="estado"></p>
        <p id="error" class="error"></p>
        <p class="seccion">Issues</p>
        <ul id="notas"></ul>
        <form id="reporte">
          <input id="titulo" name="title" maxlength="120" placeholder="Title" />
          <select id="nivel"></select>
          <button type="submit">Save issue</button>
          <p id="resultado"></p>
        </form>
      </div>
    </aside>
    <main class="escenario">
      <p id="vacio">Sign in with a staff or client account. Each account sees a different set of projects.</p>
      <canvas id="lienzo" class="lienzo"></canvas>
    </main>`;

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
      panel.textContent = proyecto ? "Select a room in the model." : "";
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
    raiz.querySelector("#notas")!.textContent = "";
    raiz.querySelector("#estado")!.textContent = "";
    raiz.querySelector("#resultado")!.textContent = "";
    (raiz.querySelector("#progreso") as HTMLProgressElement).value = 0;
  }

  function pintarFicha() {
    if (!detalle) return;
    const fechas = detalle.dates;
    const contactos = (detalle.contacts ?? [])
      .map((contacto) => [contacto.name, contacto.role, contacto.email, contacto.phone].filter(Boolean).join(" · "))
      .join(" ");
    const ficha = raiz.querySelector("#ficha")!;
    ficha.replaceChildren();
    const titulo = document.createElement("strong");
    titulo.textContent = detalle.name;
    const meta = document.createElement("p");
    meta.textContent = [detalle.client, detalle.status, detalle.address].filter(Boolean).join(" · ");
    const fechasNodo = document.createElement("p");
    fechasNodo.textContent = [
      textoFecha(fechas.signed),
      textoFecha(fechas.scan),
      textoFecha(fechas.estimatedDelivery),
      textoFecha(fechas.delivered),
    ].join(" · ");
    ficha.append(titulo, meta, fechasNodo);
    if (contactos) {
      const nodo = document.createElement("p");
      nodo.textContent = contactos;
      ficha.append(nodo);
    }
    raiz.querySelector("#vacio")!.textContent = detalle.name;
  }

  async function elegirToken(nombre: string) {
    generacion += 1;
    limpiarEscena();
    token = TOKENS[nombre];
    const respuesta = await cliente.get("/api/projects", token);
    const lista = (await respuesta.json()) as Resumen[];
    const cuenta = CUENTAS[nombre as keyof typeof CUENTAS];
    raiz.classList.add("dentro");
    raiz.querySelector("#sesion")!.textContent = `${cuenta.nombre} · ${cuenta.rol}. ${cuenta.alcance}`;
    const nodo = raiz.querySelector("#lista")!;
    nodo.innerHTML = "";
    for (const item of lista) {
      const boton = document.createElement("button");
      boton.type = "button";
      const nombreProyecto = document.createElement("strong");
      nombreProyecto.textContent = item.name;
      boton.append(nombreProyecto);
      if (item.status || item.client) {
        const extra = document.createElement("span");
        extra.textContent = [item.status, item.client].filter(Boolean).join(" · ");
        boton.append(extra);
      }
      boton.addEventListener("click", () => {
        nodo.querySelectorAll("button").forEach((otro) => otro.classList.remove("activo"));
        boton.classList.add("activo");
        void elegirProyecto(item.id);
      });
      nodo.append(boton);
    }
    filtrarLista();
  }

  function filtrarLista() {
    const texto = (raiz.querySelector("#buscar") as HTMLInputElement).value.trim().toLowerCase();
    for (const boton of raiz.querySelectorAll<HTMLButtonElement>("#lista button")) {
      boton.hidden = texto.length > 0 && !boton.textContent!.toLowerCase().includes(texto);
    }
  }

  async function pintarNotas() {
    const nodo = raiz.querySelector("#notas")!;
    nodo.innerHTML = "";
    if (!proyecto) return;
    const respuesta = await cliente.get(`/api/projects/${proyecto}/issues`, token);
    if (!respuesta.ok) return;
    const notas = (await respuesta.json()) as { id: string; title: string; level: string }[];
    if (!Array.isArray(notas)) return;
    for (const nota of notas) {
      const item = document.createElement("li");
      item.textContent = `${nota.title} · ${nota.level}`;
      nodo.append(item);
    }
  }

  async function elegirProyecto(id: string) {
    const marca = ++generacion;
    descarga?.abortar();
    descarga = null;
    cajas = [];
    escena?.limpiarPuntos();
    escena?.fijarCajas([], [], "all");
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
    detalle.levels = Array.isArray(detalle.levels) ? detalle.levels : [];
    detalle.dates = detalle.dates ?? { signed: null, scan: null, estimatedDelivery: null, delivered: null };
    const espacios = (await esp.json()) as Caja[];
    cajas = Array.isArray(espacios) ? espacios : [];
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
          escena?.resaltar(seleccion?.id ?? null);
          pintarPanel();
        });
      } catch {
        escena = null;
      }
    }
    escena?.fijarCajas(cajas, detalle.levels, filtro.value);
    escena?.encuadrar();
    void pintarNotas();
  }

  raiz.querySelector("#tokens")!.innerHTML = (Object.keys(CUENTAS) as (keyof typeof CUENTAS)[])
    .map((nombre) => {
      const cuenta = CUENTAS[nombre];
      return `<button type="button" data-token="${nombre}"><strong>${cuenta.nombre}</strong><span>${nombre} · ${cuenta.rol}</span></button>`;
    })
    .join("");
  raiz.querySelector("#salir")!.addEventListener("click", () => {
    generacion += 1;
    token = "";
    raiz.classList.remove("dentro");
    raiz.querySelector("#sesion")!.textContent = "";
    raiz.querySelector("#vacio")!.textContent = "Sign in with a staff or client account. Each account sees a different set of projects.";
    limpiarEscena();
    raiz.querySelector("#lista")!.innerHTML = "";
  });
  raiz.querySelector("#tokens")!.addEventListener("click", (evento) => {
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>("[data-token]");
    const nombre = objetivo?.dataset.token;
    if (nombre) {
      raiz.querySelectorAll("#tokens button").forEach((boton) => boton.classList.toggle("activo", boton === objetivo));
      void elegirToken(nombre);
    }
  });
  raiz.querySelector("#buscar")!.addEventListener("input", filtrarLista);
  raiz.querySelector("#encuadrar")!.addEventListener("click", () => escena?.encuadrar());
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
      worker.onmessage = (evento: MessageEvent<{ ok: boolean; posiciones?: Float32Array; colores?: Float32Array; total?: number; dibujados?: number }>) => {
        worker.terminate();
        if (evento.data.ok && evento.data.posiciones && evento.data.colores) {
          raiz.querySelector("#estado")!.textContent = `${evento.data.dibujados!.toLocaleString("en-US")} of ${evento.data.total!.toLocaleString("en-US")} points`;
          escena?.fijarNube(evento.data.posiciones, evento.data.colores);
        }
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
    if (respuesta.ok) {
      (raiz.querySelector("#titulo") as HTMLInputElement).value = "";
      void pintarNotas();
    }
  });
}

const app = document.querySelector<HTMLElement>("#app");
if (app) montarPagina(app);
