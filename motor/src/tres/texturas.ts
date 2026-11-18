// Texturas pintadas en un lienzo, sin cargar nada (no hay que esperar a ningún archivo): el halo de luz y el icono real
// de una marca o de un concepto, a partir de los trazos de su SVG.
import * as THREE from "three";
import { sat } from "./tiempo";

/** mezcla de dos colores (#rrggbb), de a (k = 0) a b (k = 1) */
export const tono = (a: string, b: string, k: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), sat(k)).getHexString();

let halo: THREE.Texture | null = null;
/** una mancha de luz redonda: para brillos (Halo) y luces en el suelo (Charco) */
export function texturaHalo() {
  if (halo) return halo;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,0.38)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return (halo = new THREE.CanvasTexture(c));
}

/** los trazos de un icono de 24×24: `relleno` (los `d` de un icono macizo, como los de Simple Icons) o `trazo` (los de uno de línea, como Lucide) */
export type Trazos = { relleno?: string[]; trazo?: string[] };
const iconos = new Map<string, THREE.Texture>();
/**
 * El icono, centrado en un cuadrado de `fondo`. `giro` en cuartos de vuelta: la tapa de un cilindro (Moneda) lleva la
 * textura girada un cuarto, y por eso ahí se pinta ya girado (giro = -1).
 */
export function texturaIcono(clave: string, ic: Trazos, { fondo = "#E8EDF5", tinta = "#07080D", giro = 0, escala = 5.4 } = {}) {
  const k = `${clave}|${fondo}|${tinta}|${giro}|${escala}`, ya = iconos.get(k);
  if (ya) return ya;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = fondo; g.fillRect(0, 0, 256, 256);
  g.translate(128, 128); g.rotate((giro * Math.PI) / 2); g.scale(escala, escala); g.translate(-12, -12);
  g.fillStyle = tinta; g.strokeStyle = tinta; g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round";
  for (const d of ic.relleno ?? []) g.fill(new Path2D(d));
  for (const d of ic.trazo ?? []) g.stroke(new Path2D(d));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  iconos.set(k, t);
  return t;
}

let led: THREE.Texture | null = null;
/** las líneas de una pantalla encendida (los ojos de un robot): va de mapa de emisión (Emite lineas) */
export function texturaLed() {
  if (led) return led;
  const c = document.createElement("canvas"); c.width = 8; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 8, 128);
  g.fillStyle = "rgba(0,0,0,0.5)"; for (let y = 0; y < 128; y += 8) g.fillRect(0, y, 8, 3);
  led = new THREE.CanvasTexture(c); led.colorSpace = THREE.SRGBColorSpace;
  return led;
}

let mancha: THREE.Texture | null = null;
/** una mancha redonda y suave, en grises sobre negro (va de mapa de alfa, que lee el verde): la sombra de contacto */
export function texturaMancha() {
  if (mancha) return mancha;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!, r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgb(255,255,255)"); r.addColorStop(0.3, "rgb(150,150,150)"); r.addColorStop(0.65, "rgb(40,40,40)"); r.addColorStop(1, "rgb(0,0,0)");
  g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return (mancha = new THREE.CanvasTexture(c));
}
