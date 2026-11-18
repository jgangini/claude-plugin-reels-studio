// El tiempo de una escena en 3D, en segundos: curvas con arranque y frenado, muelles, y dos patrones que explican
// mucho con poco: algo que avanza por paradas (recorrido) y algo que pasa de mano en mano (relevo).
// Todo es función del segundo t (useNarracion().t): nada de transition ni animation de CSS, nada de Math.random().
import { Easing, spring } from "remotion";

export type V3 = [number, number, number];
export const sat = (x: number) => Math.min(1, Math.max(0, x));

/** entre dos estados (un objeto que va de un sitio a otro, la cámara): arranca y frena */
export const suave = Easing.bezier(0.65, 0, 0.35, 1);
/** lo que entra o se revela: llega rápido y se posa */
export const llega = Easing.bezier(0.16, 1, 0.3, 1);
/** lo que se va: sale deprisa, sin quedarse (y dura la mitad que una entrada) */
export const seVa = Easing.bezier(0.6, 0, 0.9, 0.35);

/** de 0 a 1 entre el segundo `a` y `a + d`, con su curva */
export const paso = (t: number, a: number, d: number, e: (x: number) => number = suave) => e(sat((t - a) / d));
/** un muelle que arranca en el segundo `a` (para lo que es físico: una pieza que nace, un botón, una insignia) */
export const muelle = (t: number, a: number, fps: number, config: { damping?: number; stiffness?: number; mass?: number } = { damping: 13, stiffness: 190 }) =>
  t <= a ? 0 : spring({ frame: (t - a) * fps, fps, config });
/** un golpe de luz o de tamaño que sube y vuelve a cero en `d` segundos */
export const destello = (t: number, a: number, d = 0.7) => Math.sin(Math.PI * sat((t - a) / d));
export const mez = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** un número fijo entre 0 y 1 para cada (i, n): el azar que no cambia de un fotograma a otro */
export const azar = (i: number, n: number) => { const x = Math.sin(i * 57.3 + n * 113.1) * 43758.5453; return x - Math.floor(x); };
/** el parpadeo de unos ojos: 1 abiertos, casi 0 cerrados; uno cada 5,8 s */
export const parpadeo = (t: number, retardo = 0) => {
  const fase = ((((t - retardo) % 5.8) + 5.8) % 5.8) / 5.8;
  return fase < 0.782 || fase > 0.818 ? 1 : 1 - 0.88 * Math.sin(((fase - 0.782) / 0.036) * Math.PI);
};

/**
 * Algo que avanza por paradas: sale de `inicio` y en cada [cuándo, a dónde] va a esa posición, con arranque y frenado.
 * Sirve para un agente que recorre los pasos de un proceso, un paquete por una cadena, una barra que sube por tramos.
 */
export const recorrido = (inicio: number, ruta: [number, number][], t: number, dura = 0.75) => {
  let x = inicio;
  for (const [a, b] of ruta) x += (b - x) * paso(t, a, dura);
  return x;
};
/** la velocidad de algo que se mueve (unidades por segundo): para inclinarlo, estirarlo o darle estela sin fingirlo */
export const velocidad = (pos: (t: number) => number, t: number, fps = 60) => (pos(t) - pos(t - 1 / fps)) * fps;

/**
 * Algo que pasa de mano en mano: `manos` es [cuándo, quién] (quién < 0: su sitio de descanso) y `sitio(quién)` dice
 * dónde está cada uno ahora. Devuelve dónde está el objeto, quién lo tiene y cuánto ha llegado (0–1). Vuela en arco.
 * Sirve para un cupo, un turno, un testigo, un mensaje: lo que explica que varios se reparten algo escaso.
 */
export function relevo(manos: [number, number][], t: number, sitio: (quien: number) => V3, dura = 0.6, arco = 1.3) {
  let n = -1;
  manos.forEach(([a], j) => { if (t >= a) n = j; });
  if (n < 0) return { pos: sitio(-1), tiene: -1, e: 1 };
  const de = n === 0 ? -1 : manos[n - 1][1], a = manos[n][1], e = paso(t, manos[n][0], dura);
  const p = mez(sitio(de), sitio(a), e);
  return { pos: [p[0], p[1] + arco * Math.sin(Math.PI * e), p[2]] as V3, tiene: a, e };
}
