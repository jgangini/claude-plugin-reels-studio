// El escenario de una escena en 3D: el lienzo, la cámara, la luz, el suelo y la niebla que lo funde con el fondo.
// Dentro van las piezas (./piezas) y lo que el vídeo dibuje con Three.js. Dentro del lienzo no llega useNarracion(): el
// segundo t y lo que haga falta se pasan como props a lo que se dibuja dentro.
// Sale con el acabado de estudio (./acabado): los materiales reflejan un estudio de luces, el suelo refleja lo que
// tiene encima, lo que emite luz resplandece y el color pasa por una curva de cine. acabado="plano" lo deja como antes.
import React from "react";
import { getInputProps } from "remotion";
import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { FOV, type Encuadre } from "./camara";
import type { V3 } from "./tiempo";
import { tono } from "./texturas";
import { crearSalida, crearSuelo, entornoEstudio, prepararReflejos } from "./acabado";

function Camara({ pos, mira, fov = FOV }: Encuadre) {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  cam.position.set(...pos); cam.fov = fov; cam.near = 0.1; cam.far = 300; cam.lookAt(...mira); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  return null;
}

/** el entorno que reflejan los materiales y la curva de color; sin suelo, el lienzo queda transparente (una capa por delante) */
function Estudio({ luz, exposicion, cielo }: { luz: number; exposicion: number; cielo: string | null }) {
  const { gl, scene } = useThree();
  const color = React.useMemo(() => new THREE.Color(), []);
  scene.environment = entornoEstudio(gl); scene.environmentIntensity = 0.3 * luz;
  scene.background = cielo ? color.set(cielo) : null;
  gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = exposicion;
  return null;
}

/** el suelo espejo y la salida con resplandor: pinta la escena en lugar del lienzo */
function SueloYSalida({ ancho, alto, charco, linea, cielo, niebla, foco, reflejo, resplandor, sombras }: { ancho: number; alto: number; charco: string; linea: string | null; cielo: string; niebla: [number, number]; foco: [number, number]; reflejo: number; resplandor: number; sombras: boolean }) {
  const { gl, scene, camera } = useThree();
  const piso = React.useMemo(() => crearSuelo(ancho, alto), [ancho, alto]);
  const salida = React.useMemo(() => crearSalida(gl, scene, camera, ancho, alto), [gl, scene, camera, ancho, alto]);
  React.useEffect(() => () => piso.dispose(), [piso]);
  React.useEffect(() => () => salida.suelta(), [salida]);
  piso.ajusta({ charco, lejos: tono(charco, "#02040C", 0.94), linea, niebla: cielo, centro: foco, reflejo, nieblaDe: niebla[0] * 0.76, nieblaA: niebla[1] * 0.95 });
  useFrame(() => { prepararReflejos(scene); salida.pinta(resplandor); }, 1);
  return (
    <>
      <primitive object={piso} />
      {sombras ? <mesh receiveShadow position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}><planeGeometry args={[260, 260]} /><shadowMaterial transparent opacity={0.34} depthWrite={false} polygonOffset polygonOffsetFactor={-2} /></mesh> : null}
    </>
  );
}

export function Escenario({ ancho, alto, camara, acabado = "estudio", fondo, suelo, rejilla, niebla = [34, 82], luz = 1, sol = [-7, 14, 9], contra = "#7F9BFF", sombras = true, foco, reflejo = 0.42, resplandor = 0.24, exposicion = 1, children, style }: {
  ancho: number; alto: number;
  /** el encuadre de este fotograma (camaraPorTramos) */
  camara: Encuadre;
  /** "estudio" (lo normal): materiales que reflejan, suelo espejo, resplandor y color de cine. "plano": como antes, sin nada de eso */
  acabado?: "estudio" | "plano";
  /** el color del fondo: el suelo se funde con él a lo lejos. Sin decirlo: azul noche en estudio, casi negro en plano */
  fondo?: string;
  /** el color del suelo (en estudio, el del charco de luz donde mira la cámara); null lo quita (un objeto flotando en el vacío, o una capa por delante) */
  suelo?: string | null;
  /** la rejilla del suelo (en estudio, el color de las juntas de las baldosas: el primero); null la quita */
  rejilla?: [string, string] | null;
  /** a qué distancia empieza y acaba la niebla */
  niebla?: [number, number];
  /** cuánta luz (1 es lo normal; en estudio, por encima de 1,15 lo blanco se quema) */
  luz?: number;
  /** desde dónde viene la luz principal, cálida, que hace las sombras */
  sol?: V3;
  /** el color de la luz de contra, fría, que recorta las siluetas; null la quita */
  contra?: string | null;
  sombras?: boolean;
  /** estudio: dónde cae el charco de luz del suelo [x, z]; sin decirlo, donde mira la cámara */
  foco?: [number, number];
  /** estudio: cuánto refleja el suelo (0 lo quita) */
  reflejo?: number;
  /** estudio: cuánto resplandece lo que emite luz (0 lo quita) */
  resplandor?: number;
  /** estudio: la exposición de la cámara */
  exposicion?: number;
  children?: React.ReactNode; style?: React.CSSProperties;
}) {
  const estudio = acabado === "estudio";
  const cielo = fondo ?? (estudio ? "#0A1436" : "#07080D");
  const piso = suelo === undefined ? (estudio ? "#2A4DA6" : "#0C0F18") : suelo;
  const juntas = rejilla === undefined ? (estudio ? (["#6E93FF", "#6E93FF"] as [string, string]) : (["#1A2030", "#131826"] as [string, string])) : rejilla;
  // al medir, el suelo no se pinta: es fondo, no dibujo, y contaría como si llenara el cuadro (motor/lib/dibujo.mjs)
  const midiendo = (getInputProps() as { datos?: { medir?: boolean } })?.datos?.medir === true;
  const conSuelo = estudio && piso !== null && !midiendo;
  return (
    <ThreeCanvas width={ancho} height={alto} shadows={sombras} gl={estudio ? { antialias: !conSuelo } : undefined} camera={{ fov: camara.fov ?? FOV, near: 0.1, far: 300, position: camara.pos }} style={{ position: "absolute", inset: 0, ...style }}>
      <Camara {...camara} />
      <fog attach="fog" args={[cielo, niebla[0], niebla[1]]} />
      {estudio ? (
        <>
          <Estudio luz={luz} exposicion={exposicion} cielo={conSuelo ? cielo : null} />
          <directionalLight position={sol} intensity={2.5 * luz} color="#FFF3E2" castShadow={sombras} shadow-mapSize={[4096, 4096]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={60} shadow-bias={-0.0004} shadow-radius={7} />
          {contra ? <directionalLight position={[10, 6, -10]} intensity={0.55 * luz} color={contra} /> : null}
          {conSuelo ? <SueloYSalida ancho={ancho} alto={alto} charco={piso as string} linea={juntas ? juntas[0] : null} cielo={cielo} niebla={niebla} foco={foco ?? [camara.mira[0], camara.mira[2]]} reflejo={reflejo} resplandor={resplandor} sombras={sombras} /> : null}
        </>
      ) : (
        <>
          <ambientLight intensity={0.35 * luz} />
          <hemisphereLight args={["#A9BCE2", "#0A0A10", 0.9 * luz]} />
          <directionalLight position={sol} intensity={2.6 * luz} color="#FFE8CC" castShadow={sombras} shadow-mapSize={[4096, 4096]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={60} shadow-bias={-0.0004} />
          {contra ? <directionalLight position={[10, 6, -10]} intensity={1.1 * luz} color={contra} /> : null}
          {piso ? <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[260, 260]} /><meshStandardMaterial color={piso} roughness={0.6} metalness={0.25} /></mesh> : null}
          {piso && juntas ? <gridHelper args={[260, 260, juntas[0], juntas[1]]} position={[0, 0.004, 0]} /> : null}
        </>
      )}
      {children}
    </ThreeCanvas>
  );
}
