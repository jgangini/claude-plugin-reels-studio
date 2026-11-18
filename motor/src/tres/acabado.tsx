// El acabado de estudio: lo que hace que una escena en 3D se vea como un render de producto y no como plástico mate.
// Un estudio de luces que los materiales reflejan, un suelo pulido que refleja lo que tiene encima, la salida con
// resplandor y color de cine, y los materiales (cerámica, cristal, satinado, papel, luz). Lo monta <Escenario> salvo
// que se le pida acabado="plano".
import React from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { texturaLed, texturaMancha } from "./texturas";
import type { V3 } from "./tiempo";

// ---------------------------------------------------------------------------------------------------------------------
// El estudio: lo que los materiales reflejan. Una sala azul noche con paneles de luz (un techo grande y suave, una
// llave cálida delante a la izquierda, un relleno frío a la derecha, una contra detrás) y un suelo azul.
// ---------------------------------------------------------------------------------------------------------------------
function estudio() {
  const s = new THREE.Scene();
  const panel = (color: string, fuerza: number, pos: V3, tam: V3) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...tam), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(fuerza) }));
    m.position.set(...pos); s.add(m);
  };
  s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#0A1230"), side: THREE.BackSide })));
  panel("#FFFFFF", 5, [0, 22, 4], [30, 0.5, 20]);
  panel("#FFF0DC", 11, [-24, 10, 16], [0.5, 14, 14]);
  panel("#A9C4FF", 5, [26, 8, 0], [0.5, 10, 18]);
  panel("#7C9BFF", 4, [4, 7, -28], [34, 9, 0.5]);
  panel("#2A55D8", 1.5, [0, -8, 0], [80, 0.5, 80]);
  return s;
}
const ENTORNOS = new WeakMap<object, THREE.Texture>();
/** el estudio, ya preparado para que los materiales lo reflejen (uno por lienzo) */
export function entornoEstudio(gl: THREE.WebGLRenderer) {
  let t = ENTORNOS.get(gl);
  if (!t) { const p = new THREE.PMREMGenerator(gl); t = p.fromScene(estudio(), 0.03).texture; p.dispose(); ENTORNOS.set(gl, t); }
  return t;
}

// ---------------------------------------------------------------------------------------------------------------------
// El reflejo se apaga con la altura: lo que está cerca del suelo se refleja nítido y lo alto se pierde, como en un
// suelo pulido. Cada material del escenario recibe un añadido que solo actúa en la pasada del espejo.
// ---------------------------------------------------------------------------------------------------------------------
const ESPEJO = { value: 0 }, ALTURA = { value: 1.9 };
const MAIN = /void\s+main\s*\(\s*\)\s*\{/;
const alFinal = (s: string, linea: string) => { const i = s.lastIndexOf("}"); return s.slice(0, i) + linea + "\n" + s.slice(i); };
function conAltura(sh: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string }) {
  if (!MAIN.test(sh.vertexShader) || !MAIN.test(sh.fragmentShader) || !sh.vertexShader.includes("mvPosition")) return;
  sh.uniforms.uEspejo = ESPEJO; sh.uniforms.uAlturaReflejo = ALTURA;
  sh.vertexShader = alFinal(sh.vertexShader.replace(MAIN, (m) => "varying float vAlturaEspejo;\n" + m), "vAlturaEspejo = ( inverse( viewMatrix ) * mvPosition ).y;");
  sh.fragmentShader = alFinal(sh.fragmentShader.replace(MAIN, (m) => "uniform float uEspejo;\nuniform float uAlturaReflejo;\nvarying float vAlturaEspejo;\n" + m), "if ( uEspejo > 0.5 ) gl_FragColor *= 1.0 - smoothstep( 0.0, uAlturaReflejo, vAlturaEspejo );");
}
/** prepara los materiales de la escena para que su reflejo se apague con la altura (se llama antes de pintar; los ya preparados no se tocan) */
export function prepararReflejos(escena: THREE.Object3D) {
  escena.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    for (const x of Array.isArray(m) ? m : m ? [m] : []) {
      if (x.userData.espejo || (x as THREE.ShaderMaterial).isShaderMaterial) continue;
      const antes = x.onBeforeCompile, clave = x.customProgramCacheKey;
      x.onBeforeCompile = (sh, r) => { antes.call(x, sh, r); conAltura(sh as never); };
      x.customProgramCacheKey = () => "espejo|" + clave.call(x);
      x.userData.espejo = true; x.needsUpdate = true;
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// El suelo: pulido, con un charco de luz donde mira la cámara, baldosas grandes y el reflejo de lo que tiene encima
// ---------------------------------------------------------------------------------------------------------------------
const SUELO = {
  name: "SueloEspejo",
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uCharco: { value: new THREE.Color("#2A4DA6") }, uLejos: { value: new THREE.Color("#070D28") }, uLinea: { value: new THREE.Color("#6E93FF") },
    uNiebla: { value: new THREE.Color("#0A1436") }, uCentro: { value: new THREE.Vector2() }, uFuerza: { value: 0.42 }, uLineas: { value: 0.2 },
    uNieblaDe: { value: 26 }, uNieblaA: { value: 78 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vMundo;
    void main() {
      vUv = textureMatrix * vec4( position, 1.0 );
      vMundo = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uCharco, uLejos, uLinea, uNiebla;
    uniform vec2 uCentro;
    uniform float uFuerza, uLineas, uNieblaDe, uNieblaA;
    varying vec4 vUv;
    varying vec3 vMundo;
    #include <common>
    void main() {
      vec3 aCamara = cameraPosition - vMundo;
      float lejos = length( aCamara );
      vec3 V = aCamara / lejos;
      // el charco de luz
      vec3 base = mix( uCharco, uLejos, smoothstep( 1.5, 18.0, length( vMundo.xz - uCentro ) ) );
      // las baldosas, de 2 m
      vec2 g = vMundo.xz / 2.0;
      vec2 a = abs( fract( g - 0.5 ) - 0.5 ) / ( fwidth( g ) * 1.4 );
      float linea = ( 1.0 - min( min( a.x, a.y ), 1.0 ) ) * ( 1.0 - smoothstep( uNieblaDe * 0.6, uNieblaDe * 1.75, lejos ) );
      base += uLinea * linea * uLineas;
      // el reflejo, un poco desenfocado y sin chispas
      vec2 uv = vUv.xy / vUv.w;
      vec3 ref = min( texture2D( tDiffuse, uv ).rgb, vec3( 1.4 ) ) * 0.12;
      for ( int i = 0; i < 16; i ++ ) {
        float an = float( i ) * 2.3999632, r = 0.0009 + 0.0034 * sqrt( ( float( i ) + 0.5 ) / 16.0 );
        ref += min( texture2D( tDiffuse, uv + r * vec2( cos( an ), sin( an ) * 1.6 ) ).rgb, vec3( 1.4 ) ) * 0.055;
      }
      float fresnel = mix( 0.42, 1.0, pow( 1.0 - max( V.y, 0.0 ), 2.2 ) );
      vec3 c = base + ref * uFuerza * fresnel;
      c = mix( c, uNiebla, smoothstep( uNieblaDe, uNieblaA, lejos ) );
      gl_FragColor = vec4( c, 1.0 );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
export type Suelo = Reflector & { ajusta: (o: { charco: string; lejos: string; linea: string | null; niebla: string; centro: [number, number]; reflejo: number; nieblaDe: number; nieblaA: number }) => void };
/** el suelo espejo, del tamaño del cuadro; `ajusta` le pone los colores y el charco de luz de este fotograma */
export function crearSuelo(ancho: number, alto: number): Suelo {
  const r = new Reflector(new THREE.PlaneGeometry(400, 400), { textureWidth: ancho, textureHeight: alto, clipBias: 0.003, multisample: 4, shader: SUELO }) as Suelo;
  r.rotation.x = -Math.PI / 2;
  const pinta = r.onBeforeRender;
  r.onBeforeRender = function (this: unknown, ...a: unknown[]) { ESPEJO.value = 1; try { (pinta as (...x: unknown[]) => void).apply(this, a); } finally { ESPEJO.value = 0; } } as never;
  const u = (r.material as THREE.ShaderMaterial).uniforms;
  r.ajusta = (o) => {
    u.uCharco.value.set(o.charco); u.uLejos.value.set(o.lejos); u.uNiebla.value.set(o.niebla); u.uCentro.value.set(...o.centro);
    if (o.linea) u.uLinea.value.set(o.linea);
    u.uLineas.value = o.linea ? 0.2 : 0; u.uFuerza.value = o.reflejo; u.uNieblaDe.value = o.nieblaDe; u.uNieblaA.value = o.nieblaA;
  };
  return r;
}

/** la salida de cine: la escena, el resplandor de lo que emite luz y la curva de color (ACES), con los bordes suavizados */
export function crearSalida(gl: THREE.WebGLRenderer, escena: THREE.Scene, camara: THREE.Camera, ancho: number, alto: number) {
  const c = new EffectComposer(gl, new THREE.WebGLRenderTarget(ancho, alto, { type: THREE.HalfFloatType, samples: 8 }));
  c.setPixelRatio(1); c.setSize(ancho, alto);
  c.addPass(new RenderPass(escena, camara));
  const resplandor = new UnrealBloomPass(new THREE.Vector2(ancho, alto), 0.24, 0.7, 1.0);
  c.addPass(resplandor);
  c.addPass(new OutputPass());
  return { pinta: (fuerza: number) => { resplandor.enabled = fuerza > 0.001; resplandor.strength = fuerza; c.render(); }, suelta: () => c.dispose() };
}

// ---------------------------------------------------------------------------------------------------------------------
// Los materiales. Van dentro de un <mesh>, en lugar de <meshStandardMaterial>: <mesh><sphereGeometry /><Ceramica /></mesh>
// ---------------------------------------------------------------------------------------------------------------------
type Extra = Record<string, unknown>;
/** cerámica con barniz: el cuerpo de un robot, una pieza de producto. Refleja el estudio con brillos anchos y suaves */
export const Ceramica = ({ color = "#EEF2F8", brillo = 1, ...p }: { color?: string; brillo?: number } & Extra) => <meshPhysicalMaterial color={color} roughness={0.24} metalness={0} clearcoat={1} clearcoatRoughness={0.07} envMapIntensity={brillo} {...p} />;
/** cristal negro pulido: un visor, una pantalla apagada, una lente */
export const Cristal = ({ color = "#010205", ...p }: { color?: string } & Extra) => <meshPhysicalMaterial color={color} roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.015} envMapIntensity={0.55} {...p} />;
/** color vivo satinado: una carpeta, una ficha, una pieza de plástico bueno. `vivo` lo mantiene encendido en la sombra */
export const Satinado = ({ color = "#F4B63F", vivo = 0.12, ...p }: { color?: string; vivo?: number } & Extra) => <meshPhysicalMaterial color={color} roughness={0.45} metalness={0.05} clearcoat={0.22} clearcoatRoughness={0.3} envMapIntensity={0.6} emissive={color} emissiveIntensity={vivo} {...p} />;
/** metal pulido: un aro, una moneda, un remate. Refleja la sala: en un escenario oscuro se ve oscuro salvo donde le da un panel */
export const Metal = ({ color = "#D9DEE8", ...p }: { color?: string } & Extra) => <meshPhysicalMaterial color={color} roughness={0.22} metalness={0.9} clearcoat={0.4} clearcoatRoughness={0.1} envMapIntensity={1.4} {...p} />;
/** papel: mate, sin brillo */
export const Papel = ({ color = "#F6F8FB", ...p }: { color?: string } & Extra) => <meshStandardMaterial color={color} roughness={0.75} metalness={0} {...p} />;
/**
 * algo que emite luz: unos ojos, un piloto, un aro encendido. `fuerza` 1–2 se ve encendido; de 3 en adelante,
 * resplandece (un azul necesita más que un blanco o un oro). `lineas` le pone las líneas de una pantalla
 */
export const Emite = ({ color, fuerza = 1.5, lineas = false, ...p }: { color: string; fuerza?: number; lineas?: boolean } & Extra) => <meshStandardMaterial color="#000000" emissive={color} emissiveIntensity={fuerza} emissiveMap={lineas ? texturaLed() : null} roughness={0.4} {...p} />;

/** la sombra de contacto de algo que flota o se apoya en el suelo: una mancha suave justo debajo */
export const Contacto = ({ x, z, r, op = 0.75 }: { x: number; z: number; r: number; op?: number }) => op <= 0.01 ? null : (
  <mesh position={[x, 0.008, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}><planeGeometry args={[2 * r, 2 * r]} /><meshBasicMaterial color="#01030A" alphaMap={texturaMancha()} transparent opacity={op} depthWrite={false} polygonOffset polygonOffsetFactor={-4} /></mesh>
);

const CAJAS = new Map<string, RoundedBoxGeometry>();
/** una caja con los cantos redondeados (una caja de cantos vivos se ve de cartón): <mesh geometry={cajaRedonda(1.3, 0.9, 0.07, 0.03)}> */
export function cajaRedonda(ancho: number, alto: number, fondo: number, radio = Math.min(ancho, alto, fondo) * 0.25) {
  const k = [ancho, alto, fondo, radio].join();
  let g = CAJAS.get(k);
  if (!g) { g = new RoundedBoxGeometry(ancho, alto, fondo, 6, Math.min(radio, Math.min(ancho, alto, fondo) / 2 - 1e-4)); CAJAS.set(k, g); }
  return g;
}
