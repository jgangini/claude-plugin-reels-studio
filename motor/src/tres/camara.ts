// La cámara de una escena en 3D: una lista de encuadres y los tramos de voz en que se pasa de uno al siguiente.
// Un movimiento por idea, con arranque y frenado: la cámara revela una relación (de quién sale qué, qué hay dentro,
// qué llegó al final), no se mueve por moverse. `proyector` da la misma cámara en píxeles, para colocar encima del 3D
// lo que se lee (en HTML, así medir.mjs lo sigue midiendo).
import * as THREE from "three";
import { mez, paso, type V3 } from "./tiempo";

export type Encuadre = { pos: V3; mira: V3; fov?: number };
export const FOV = 32;

/**
 * La cámara en el segundo t. `encuadres[0]` es el de partida; `tramos[j]` = [desde, hasta] es cuándo se va del
 * encuadre j al j + 1. `deriva` es un vaivén muy leve para que un encuadre quieto no parezca una foto.
 */
export function camaraPorTramos(encuadres: Encuadre[], tramos: [number, number][], t: number, deriva = 0.12) {
  let c = { pos: encuadres[0].pos, mira: encuadres[0].mira, fov: encuadres[0].fov ?? FOV };
  tramos.forEach(([a, b], j) => {
    const k = paso(t, a, b - a), n = encuadres[j + 1];
    c = { pos: mez(c.pos, n.pos, k), mira: mez(c.mira, n.mira, k), fov: c.fov + ((n.fov ?? FOV) - c.fov) * k };
  });
  return { pos: [c.pos[0] + deriva * Math.sin(t * 0.5), c.pos[1] + 0.5 * deriva * Math.sin(t * 0.37 + 1), c.pos[2]] as V3, mira: c.mira, fov: c.fov };
}

/** de metros a píxeles con esa cámara: { x, y } en el cuadro y `px`, cuántos píxeles mide un metro a esa distancia */
export function proyector(c: Encuadre, ancho: number, alto: number) {
  const fov = c.fov ?? FOV, cam = new THREE.PerspectiveCamera(fov, ancho / alto, 0.1, 300);
  cam.position.set(...c.pos); cam.lookAt(...c.mira); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const hacia = new THREE.Vector3(); cam.getWorldDirection(hacia);
  const k = alto / (2 * Math.tan((fov * Math.PI) / 360));
  return (p: V3) => {
    const v = new THREE.Vector3(...p), fondo = v.clone().sub(cam.position).dot(hacia);
    v.project(cam);
    return { x: ((v.x + 1) / 2) * ancho, y: ((1 - v.y) / 2) * alto, px: k / fondo, delante: fondo > 0 };
  };
}
