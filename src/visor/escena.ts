/** Escena three.js. Las cajas usan la esquina mínima y Z hacia arriba. */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { colorDeNivel, filtrarNivel, type Caja } from "./geometria";
import type { Punto } from "./parser-pts";

export interface Escena {
  fijarCajas: (cajas: Caja[], niveles: string[], filtro: string) => void;
  fijarPuntos: (puntos: Punto[]) => void;
  limpiarPuntos: () => void;
  alElegir: (callback: (id: string) => void) => void;
  destruir: () => void;
}

export function crearEscena(lienzo: HTMLCanvasElement): Escena {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const escena = new THREE.Scene();
  escena.background = new THREE.Color("#111827");
  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  camara.position.set(20, 16, 20);
  const controles = new OrbitControls(camara, lienzo);
  controles.enableDamping = true;
  controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const grupo = new THREE.Group();
  escena.add(grupo);
  escena.add(new THREE.AmbientLight(0xffffff, 0.8));
  let puntos: THREE.Points | null = null;
  let elegir: (id: string) => void = () => undefined;
  const rayo = new THREE.Raycaster();

  function ajustar() {
    const ancho = lienzo.clientWidth || 640;
    const alto = lienzo.clientHeight || 480;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }

  function animar() {
    controles.update();
    renderer.render(escena, camara);
    requestAnimationFrame(animar);
  }
  ajustar();
  animar();
  window.addEventListener("resize", ajustar);

  lienzo.addEventListener("pointerdown", (evento) => {
    const rect = lienzo.getBoundingClientRect();
    const x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    rayo.setFromCamera(new THREE.Vector2(x, y), camara);
    const golpe = rayo.intersectObjects(grupo.children, false)[0];
    const id = golpe?.object.userData.id as string | undefined;
    if (id) elegir(id);
  });

  return {
    fijarCajas(cajas, niveles, filtro) {
      grupo.clear();
      for (const caja of filtrarNivel(cajas, filtro)) {
        const malla = new THREE.Mesh(
          new THREE.BoxGeometry(caja.w, caja.d, caja.h),
          new THREE.MeshStandardMaterial({ color: colorDeNivel(caja.level, niveles), transparent: true, opacity: 0.85 }),
        );
        malla.position.set(caja.x + caja.w / 2, caja.y + caja.d / 2, caja.z + caja.h / 2);
        malla.userData.id = caja.id;
        grupo.add(malla);
      }
    },
    fijarPuntos(lista) {
      if (puntos) escena.remove(puntos);
      const geometria = new THREE.BufferGeometry();
      const posiciones = new Float32Array(lista.length * 3);
      const colores = new Float32Array(lista.length * 3);
      lista.forEach((punto, i) => {
        posiciones[i * 3] = punto.x;
        posiciones[i * 3 + 1] = punto.y;
        posiciones[i * 3 + 2] = punto.z;
        colores[i * 3] = punto.r / 255;
        colores[i * 3 + 1] = punto.g / 255;
        colores[i * 3 + 2] = punto.b / 255;
      });
      geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
      geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3));
      puntos = new THREE.Points(geometria, new THREE.PointsMaterial({ size: 0.05, vertexColors: true }));
      escena.add(puntos);
    },
    limpiarPuntos() {
      if (puntos) escena.remove(puntos);
      puntos = null;
    },
    alElegir(callback) {
      elegir = callback;
    },
    destruir() {
      window.removeEventListener("resize", ajustar);
      renderer.dispose();
    },
  };
}
