/** Escena three.js. Las cajas usan la esquina mínima y Z hacia arriba. */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { colorDeNivel, filtrarNivel, type Caja } from "./geometria";
import type { Nube } from "./parser-pts";

export interface Escena {
  fijarCajas: (cajas: Caja[], niveles: string[], filtro: string) => void;
  fijarNube: (nube: Nube) => void;
  limpiarPuntos: () => void;
  alElegir: (callback: (id: string | null) => void) => void;
  resaltar: (id: string | null) => void;
  encuadrar: () => void;
  destruir: () => void;
}

/** A partir de esta cantidad se dibuja un cuarto de la nube mientras la cámara se mueve. */
const UMBRAL_LIGERO = 300_000;

export function crearEscena(lienzo: HTMLCanvasElement): Escena {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const escena = new THREE.Scene();
  escena.background = new THREE.Color("#0b1220");
  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  // Z hacia arriba: debe fijarse antes de crear OrbitControls.
  camara.up.set(0, 0, 1);
  camara.position.set(24, -24, 18);
  const controles = new OrbitControls(camara, lienzo);
  controles.enableDamping = true;
  controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  const grupo = new THREE.Group();
  const rejilla = new THREE.GridHelper(80, 40, "#334155", "#1e293b");
  rejilla.rotation.x = Math.PI / 2;
  rejilla.position.z = -0.02;
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(20, -30, 40);
  escena.add(rejilla, grupo, new THREE.HemisphereLight(0xffffff, 0x334155, 1.4), sol);

  const mallas = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>();
  let puntos: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  let seleccion: string | null = null;
  let elegir: (id: string | null) => void = () => undefined;
  const rayo = new THREE.Raycaster();

  // Solo se dibuja cuando algo cambia: en reposo la GPU y la batería descansan.
  let pendiente = true;
  const pedirCuadro = () => void (pendiente = true);
  controles.addEventListener("change", pedirCuadro);

  function densidad(ligera: boolean) {
    if (!puntos) return;
    const total = puntos.geometry.getAttribute("position").count;
    puntos.geometry.setDrawRange(0, ligera && total > UMBRAL_LIGERO ? Math.ceil(total / 4) : total);
    pedirCuadro();
  }
  controles.addEventListener("start", () => densidad(true));
  controles.addEventListener("end", () => densidad(false));

  function ajustar() {
    const ancho = lienzo.clientWidth || 640;
    const alto = lienzo.clientHeight || 480;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    pedirCuadro();
  }
  const observador = new ResizeObserver(ajustar);
  observador.observe(lienzo);
  ajustar();

  let cuadro = 0;
  function animar() {
    controles.update();
    if (pendiente) {
      pendiente = false;
      renderer.render(escena, camara);
    }
    cuadro = requestAnimationFrame(animar);
  }
  animar();

  // Se elige al soltar y sin arrastre, para que orbitar o hacer pinza no seleccione.
  let inicio: { x: number; y: number; id: number } | null = null;
  const dedos = new Set<number>();
  lienzo.addEventListener("pointerdown", (e) => {
    dedos.add(e.pointerId);
    inicio = dedos.size === 1 && e.button === 0 ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  });
  lienzo.addEventListener("pointercancel", (e) => {
    dedos.delete(e.pointerId);
    inicio = null;
  });
  lienzo.addEventListener("pointerup", (e) => {
    dedos.delete(e.pointerId);
    const origen = inicio;
    inicio = null;
    if (!origen || origen.id !== e.pointerId || Math.hypot(e.clientX - origen.x, e.clientY - origen.y) > 8) return;
    const rect = lienzo.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    rayo.setFromCamera(new THREE.Vector2(x, y), camara);
    const golpe = rayo.intersectObjects([...mallas.values()], false)[0];
    elegir((golpe?.object.userData.id as string | undefined) ?? null);
  });

  // Con la nube visible las cajas se atenúan para no taparla.
  function pintarMateriales() {
    for (const [id, malla] of mallas) {
      const activa = id === seleccion;
      malla.material.emissive.set(activa ? "#fbbf24" : "#000000");
      malla.material.emissiveIntensity = 0.55;
      malla.material.opacity = activa ? (puntos ? 0.4 : 0.85) : puntos ? 0.06 : 0.5;
    }
    pedirCuadro();
  }

  function vaciarCajas() {
    grupo.traverse((objeto) => {
      if (objeto instanceof THREE.Mesh || objeto instanceof THREE.LineSegments) {
        objeto.geometry.dispose();
        (objeto.material as THREE.Material).dispose();
      }
    });
    grupo.clear();
    mallas.clear();
  }

  function quitarPuntos() {
    if (!puntos) return;
    escena.remove(puntos);
    puntos.geometry.dispose();
    puntos.material.dispose();
    puntos = null;
  }

  return {
    fijarCajas(cajas, niveles, filtro) {
      vaciarCajas();
      for (const caja of filtrarNivel(cajas, filtro)) {
        const color = colorDeNivel(caja.level, niveles);
        const geometria = new THREE.BoxGeometry(caja.w, caja.d, caja.h);
        const malla = new THREE.Mesh(
          geometria,
          new THREE.MeshStandardMaterial({ color, transparent: true, depthWrite: false }),
        );
        malla.position.set(caja.x + caja.w / 2, caja.y + caja.d / 2, caja.z + caja.h / 2);
        malla.userData.id = caja.id;
        malla.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometria), new THREE.LineBasicMaterial({ color })));
        grupo.add(malla);
        mallas.set(caja.id, malla);
      }
      pintarMateriales();
    },
    fijarNube({ posiciones, colores }) {
      quitarPuntos();
      const geometria = new THREE.BufferGeometry();
      geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
      geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3, true));
      puntos = new THREE.Points(geometria, new THREE.PointsMaterial({ size: 0.035, vertexColors: true }));
      // La nube usa las mismas coordenadas en metros que las cajas.
      escena.add(puntos);
      pintarMateriales();
    },
    limpiarPuntos() {
      quitarPuntos();
      pintarMateriales();
    },
    alElegir(callback) {
      elegir = callback;
    },
    resaltar(id) {
      seleccion = id;
      pintarMateriales();
    },
    encuadrar() {
      const caja = new THREE.Box3().setFromObject(grupo);
      if (caja.isEmpty()) return;
      const esfera = caja.getBoundingSphere(new THREE.Sphere());
      const vertical = THREE.MathUtils.degToRad(camara.fov) / 2;
      const horizontal = Math.atan(Math.tan(vertical) * camara.aspect);
      const distancia = (esfera.radius / Math.sin(Math.min(vertical, horizontal))) * 1.1;
      const direccion = new THREE.Vector3(0.7, -1, 0.7).normalize();
      camara.position.copy(esfera.center).addScaledVector(direccion, distancia);
      controles.target.copy(esfera.center);
      controles.update();
      pedirCuadro();
    },
    destruir() {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      quitarPuntos();
      vaciarCajas();
      controles.dispose();
      renderer.dispose();
    },
  };
}
