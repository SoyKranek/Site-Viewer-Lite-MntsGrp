/** Página en inglés. Cambiar de token o de proyecto no deja la escena anterior. */

import { cargarNube, type Tarea } from "./carga-nube";
import { crearEscena, type Escena } from "./escena";
import { textoFecha } from "./fechas";
import { areaMetros, areaPies, colorDeNivel, type Caja } from "./geometria";
import { MAX_PUNTOS, MAX_PUNTOS_TACTIL, type Nube } from "./parser-pts";

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
      <p id="entrar" class="seccion">Sign in</p>
      <div id="tokens"></div>
      <p id="sesion"></p>
      <button id="salir" type="button">Sign out</button>
      <div id="trabajo">
        <p class="seccion">Projects</p>
        <input id="buscar" type="search" placeholder="Filter projects" aria-label="Filter projects" />
        <div id="lista"></div>
        <div id="ficha"></div>
        <div id="detalles">
          <p class="seccion">Report an issue</p>
          <form id="reporte" novalidate>
            <input id="titulo" name="title" maxlength="120" placeholder="Title" aria-label="Issue title" autocomplete="off" />
            <select id="nivel" aria-label="Issue level"></select>
            <p id="adjunto">No room selected</p>
            <button id="guardar" type="submit" class="primario">Save issue</button>
            <p id="resultado" role="status"></p>
          </form>
          <p class="seccion">Issues</p>
          <ul id="notas"></ul>
        </div>
      </div>
    </aside>
    <main class="escenario">
      <canvas id="lienzo" class="lienzo" aria-label="3D model of the project rooms"></canvas>
      <p id="vacio">Sign in with a staff or client account. Each account sees a different set of projects.</p>
      <div id="vista">
        <div class="herramientas">
          <select id="filtro" aria-label="Level filter"><option value="all">All levels</option></select>
          <button id="encuadrar" type="button">Fit view</button>
          <button id="unidad" type="button" aria-label="Toggle area unit">ft²</button>
        </div>
        <ul id="leyenda"></ul>
      </div>
      <section id="panel" class="panel" aria-live="polite"></section>
      <div id="barra">
        <div id="aviso" hidden>
          <p id="error" class="error" role="alert"></p>
          <button id="reintentar" type="button">Try again</button>
        </div>
        <div id="carga">
          <button id="cargar" type="button" class="primario">Load point cloud</button>
          <button id="cancelar" type="button" disabled>Cancel</button>
          <div class="avance">
            <progress id="progreso" value="0" max="1" aria-label="Point cloud download"></progress>
            <p id="estado" role="status"></p>
          </div>
        </div>
      </div>
    </main>`;

  const uno = <T extends HTMLElement = HTMLElement>(selector: string) => raiz.querySelector<T>(selector)!;
  let token = "";
  let proyecto = "";
  let generacion = 0;
  let unidad: "m" | "ft" = "ft";
  let seleccion: Caja | null = null;
  let cajas: Caja[] = [];
  let detalle: Detalle | null = null;
  let descarga: Tarea<Nube> | null = null;
  let reintentar: () => void = () => undefined;
  let escena: Escena | null = null;
  const lienzo = raiz.querySelector<HTMLCanvasElement>("#lienzo")!;

  function quitarError() {
    uno("#error").textContent = "";
    uno("#aviso").hidden = true;
  }

  function mostrarError(texto: string, accion: () => void) {
    reintentar = accion;
    uno("#error").textContent = texto;
    uno("#aviso").hidden = false;
  }

  /** Pide JSON y convierte cualquier fallo (red, HTTP o cuerpo) en una excepción. */
  async function pedir<T>(ruta: string, conToken: string): Promise<T> {
    const respuesta = await cliente.get(ruta, conToken);
    if (!respuesta.ok) throw new Error(String(respuesta.status));
    return (await respuesta.json()) as T;
  }

  function pintarPanel() {
    const panel = uno("#panel");
    panel.replaceChildren();
    uno("#adjunto").textContent = seleccion ? `Room: ${seleccion.name}` : "No room selected";
    if (!seleccion) {
      panel.textContent = proyecto ? "Select a room in the model." : "";
      return;
    }
    const area = unidad === "m" ? `${areaMetros(seleccion).toFixed(1)} m²` : `${areaPies(seleccion)} ft²`;
    const titulo = document.createElement("strong");
    titulo.textContent = seleccion.name;
    panel.append(titulo, datos([["Use", seleccion.use], ["Level", seleccion.level], ["Area", area]]));
  }

  function datos(filas: [string, string][]): HTMLElement {
    const lista = document.createElement("dl");
    for (const [clave, valor] of filas) {
      const dt = document.createElement("dt");
      dt.textContent = clave;
      const dd = document.createElement("dd");
      dd.textContent = valor;
      lista.append(dt, dd);
    }
    return lista;
  }

  function elegirCuarto(id: string | null) {
    seleccion = cajas.find((caja) => caja.id === id) ?? null;
    if (seleccion) uno<HTMLSelectElement>("#nivel").value = seleccion.level;
    escena?.resaltar(seleccion?.id ?? null);
    pintarPanel();
  }

  function estadoCarga(activa: boolean) {
    uno<HTMLButtonElement>("#cargar").disabled = activa;
    uno<HTMLButtonElement>("#cancelar").disabled = !activa;
  }

  function detenerNube() {
    descarga?.abortar();
    descarga = null;
    estadoCarga(false);
    escena?.limpiarPuntos();
    uno<HTMLProgressElement>("#progreso").value = 0;
    uno("#estado").textContent = "";
  }

  /** Borra todo lo del proyecto abierto antes de abrir otro o cambiar de cuenta. */
  function limpiarEscena() {
    detenerNube();
    cajas = [];
    detalle = null;
    proyecto = "";
    elegirCuarto(null);
    escena?.fijarCajas([], [], "all");
    quitarError();
    raiz.classList.remove("abierto");
    for (const selector of ["#ficha", "#notas", "#resultado", "#leyenda"]) uno(selector).replaceChildren();
    uno<HTMLInputElement>("#titulo").value = "";
    uno<HTMLButtonElement>("#guardar").disabled = false;
  }

  function pintarFicha() {
    if (!detalle) return;
    const fechas = detalle.dates;
    const titulo = document.createElement("strong");
    titulo.textContent = detalle.name;
    const filas: [string, string][] = [
      ["Client", detalle.client],
      ["Status", detalle.status],
      ["Address", detalle.address ?? "Not recorded"],
      ["Signed", textoFecha(fechas.signed)],
      ["Scan", textoFecha(fechas.scan)],
      ["Estimated delivery", textoFecha(fechas.estimatedDelivery)],
      ["Delivered", textoFecha(fechas.delivered)],
    ];
    for (const c of detalle.contacts ?? []) {
      filas.push(["Contact", [c.name, c.role, c.email, c.phone].filter(Boolean).join(" · ")]);
    }
    uno("#ficha").replaceChildren(titulo, datos(filas));
  }

  async function elegirToken(nombre: string) {
    generacion += 1;
    const marca = generacion;
    limpiarEscena();
    token = TOKENS[nombre];
    raiz.classList.remove("dentro");
    uno("#lista").replaceChildren();
    let lista: Resumen[];
    try {
      lista = await pedir<Resumen[]>("/api/projects", token);
    } catch {
      if (marca === generacion) mostrarError("Could not load the projects. Check your connection.", () => void elegirToken(nombre));
      return;
    }
    // Si mientras tanto cambió la cuenta, esta lista ya no se pinta.
    if (marca !== generacion) return;
    const cuenta = CUENTAS[nombre as keyof typeof CUENTAS];
    raiz.classList.add("dentro");
    raiz.querySelector("#sesion")!.textContent = `${cuenta.nombre} · ${cuenta.rol}. ${cuenta.alcance}`;
    uno("#vacio").textContent = "Choose a project to see its rooms.";
    const nodo = uno("#lista");
    nodo.replaceChildren();
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
    const marca = generacion;
    const nodo = uno("#notas");
    if (!proyecto) return;
    let notas: { id: string; title: string; level: string }[];
    try {
      notas = await pedir(`/api/projects/${proyecto}/issues`, token);
    } catch {
      if (marca === generacion) nodo.textContent = "Issues could not be loaded.";
      return;
    }
    if (marca !== generacion || !Array.isArray(notas)) return;
    nodo.replaceChildren(
      ...notas.map((nota) => {
        const item = document.createElement("li");
        item.textContent = `${nota.title} · ${nota.level}`;
        return item;
      }),
    );
  }

  function pintarLeyenda(niveles: string[]) {
    uno("#leyenda").replaceChildren(
      ...niveles.map((nivel) => {
        const item = document.createElement("li");
        const color = document.createElement("i");
        color.style.background = colorDeNivel(nivel, niveles);
        item.append(color, nivel);
        return item;
      }),
    );
  }

  async function elegirProyecto(id: string) {
    const marca = ++generacion;
    limpiarEscena();
    uno("#vacio").textContent = "Loading project…";
    let det: Detalle;
    let esp: Caja[];
    try {
      [det, esp] = await Promise.all([
        pedir<Detalle>(`/api/projects/${id}`, token),
        pedir<Caja[]>(`/api/projects/${id}/spaces`, token),
      ]);
    } catch {
      if (marca !== generacion) return;
      uno("#vacio").textContent = "The project is not open.";
      mostrarError("Could not open the project. Check your connection.", () => void elegirProyecto(id));
      return;
    }
    if (marca !== generacion) return;
    proyecto = id;
    detalle = det;
    detalle.levels = Array.isArray(detalle.levels) ? detalle.levels : [];
    detalle.dates = detalle.dates ?? { signed: null, scan: null, estimatedDelivery: null, delivered: null };
    cajas = Array.isArray(esp) ? esp : [];
    raiz.classList.add("abierto");
    uno("#vacio").textContent = "";
    pintarFicha();
    pintarPanel();
    pintarLeyenda(detalle.levels);
    // new Option trata el texto como texto, no como HTML.
    uno("#filtro").replaceChildren(new Option("All levels", "all"), ...detalle.levels.map((n) => new Option(n, n)));
    uno("#nivel").replaceChildren(...detalle.levels.map((n) => new Option(n, n)));
    if (!escena) {
      try {
        escena = crearEscena(lienzo);
        escena.alElegir(elegirCuarto);
      } catch {
        escena = null;
        uno("#vacio").textContent = "3D view is not available in this browser.";
      }
    }
    escena?.fijarCajas(cajas, detalle.levels, "all");
    escena?.encuadrar();
    void pintarNotas();
  }

  async function cargarPuntos() {
    if (!proyecto) return;
    const marca = generacion;
    quitarError();
    detenerNube();
    estadoCarga(true);
    uno("#estado").textContent = "Downloading…";
    const maximo = window.matchMedia?.("(pointer: coarse)").matches ? MAX_PUNTOS_TACTIL : MAX_PUNTOS;
    const tarea = cargarNube(`/api/projects/${proyecto}/cloud`, token, maximo, (fraccion) => {
      if (marca !== generacion || descarga !== tarea) return;
      uno<HTMLProgressElement>("#progreso").value = fraccion;
      uno("#estado").textContent = fraccion < 1 ? `Downloading… ${Math.floor(fraccion * 100)}%` : "Processing points…";
    });
    descarga = tarea;
    try {
      const nube = await tarea.promesa;
      if (marca !== generacion || descarga !== tarea) return;
      escena?.fijarNube(nube);
      uno("#estado").textContent = `Showing ${nube.dibujados.toLocaleString("en-US")} of ${nube.total.toLocaleString("en-US")} points`;
      descarga = null;
      estadoCarga(false);
    } catch (fallo) {
      // Una carga cancelada o reemplazada no toca la pantalla.
      if (marca !== generacion || descarga !== tarea) return;
      detenerNube();
      const motivo = fallo instanceof Error ? fallo.message : "";
      const mensaje =
        motivo === "missing"
          ? "Point cloud was not found."
          : motivo === "truncated" || motivo === "corrupt"
            ? "The point cloud file is incomplete or damaged."
            : "The point cloud could not be downloaded. Check your connection.";
      mostrarError(mensaje, () => void cargarPuntos());
    }
  }

  raiz.querySelector("#tokens")!.innerHTML = (Object.keys(CUENTAS) as (keyof typeof CUENTAS)[])
    .map((nombre) => {
      const cuenta = CUENTAS[nombre];
      return `<button type="button" data-token="${nombre}"><strong>${cuenta.nombre}</strong><span>${nombre} · ${cuenta.rol}</span></button>`;
    })
    .join("");
  uno("#salir").addEventListener("click", () => {
    generacion += 1;
    token = "";
    limpiarEscena();
    raiz.classList.remove("dentro");
    uno("#sesion").textContent = "";
    uno("#vacio").textContent = "Sign in with a staff or client account. Each account sees a different set of projects.";
    uno("#lista").replaceChildren();
    raiz.querySelectorAll("#tokens button").forEach((boton) => boton.classList.remove("activo"));
  });
  uno("#tokens").addEventListener("click", (evento) => {
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>("[data-token]");
    const nombre = objetivo?.dataset.token;
    if (nombre) {
      raiz.querySelectorAll("#tokens button").forEach((boton) => boton.classList.toggle("activo", boton === objetivo));
      void elegirToken(nombre);
    }
  });
  uno("#buscar").addEventListener("input", filtrarLista);
  uno("#encuadrar").addEventListener("click", () => escena?.encuadrar());
  uno("#filtro").addEventListener("change", () => {
    const nivel = uno<HTMLSelectElement>("#filtro").value;
    if (seleccion && nivel !== "all" && seleccion.level !== nivel) elegirCuarto(null);
    escena?.fijarCajas(cajas, detalle?.levels ?? [], nivel);
  });
  // Si se cambia el nivel a mano, el cuarto de otro nivel deja de ir en el reporte.
  uno("#nivel").addEventListener("change", () => {
    if (seleccion && seleccion.level !== uno<HTMLSelectElement>("#nivel").value) elegirCuarto(null);
  });
  uno("#unidad").addEventListener("click", () => {
    unidad = unidad === "ft" ? "m" : "ft";
    uno("#unidad").textContent = unidad === "ft" ? "ft²" : "m²";
    pintarPanel();
  });
  uno("#cargar").addEventListener("click", () => void cargarPuntos());
  uno("#cancelar").addEventListener("click", () => {
    detenerNube();
    uno("#estado").textContent = "Download cancelled.";
  });
  uno("#reintentar").addEventListener("click", () => {
    quitarError();
    reintentar();
  });

  uno("#reporte").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!proyecto) return;
    const marca = generacion;
    const boton = uno<HTMLButtonElement>("#guardar");
    const salida = uno("#resultado");
    if (boton.disabled) return;
    boton.disabled = true;
    salida.textContent = "Saving…";
    salida.className = "";
    try {
      const respuesta = await cliente.post(`/api/projects/${proyecto}/issues`, token, {
        title: uno<HTMLInputElement>("#titulo").value,
        level: uno<HTMLSelectElement>("#nivel").value,
        ...(seleccion ? { spaceId: seleccion.id } : {}),
      });
      const cuerpo = (await respuesta.json()) as { id?: string; error?: string };
      if (marca !== generacion) return;
      salida.className = respuesta.ok ? "ok" : "error";
      salida.textContent = respuesta.ok
        ? `Saved ${cuerpo.id}`
        : (cuerpo.error ?? "The issue was not saved.");
      if (respuesta.ok) {
        uno<HTMLInputElement>("#titulo").value = "";
        void pintarNotas();
      }
    } catch {
      if (marca !== generacion) return;
      salida.className = "error";
      salida.textContent = "The issue was not saved. Check your connection. Try again with Save issue.";
    } finally {
      if (marca === generacion) boton.disabled = false;
    }
  });
}

const app = document.querySelector<HTMLElement>("#app");
if (app) montarPagina(app);
