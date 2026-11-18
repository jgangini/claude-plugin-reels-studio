// Piezas en 3D para explicar con objetos que actúan, no con cajas de texto. Van dentro de <Escenario>. Son ladrillos,
// no planos hechos: cada vídeo los compone a su manera, y si su tema pide otra pieza (la cosa de verdad de la que
// habla), se modela con Three.js en su video.tsx; si sirve para más vídeos, se trae aquí.
// Todas reciben lo que cambia (dónde están, cuánto han nacido, cuánto trabajan) como props, calculado con el segundo t.
import React, { useMemo } from "react";
import * as THREE from "three";
import { parpadeo, sat, type V3 } from "./tiempo";
import { texturaHalo, texturaIcono, tono, type Trazos } from "./texturas";
import { Ceramica, Contacto, Cristal, Emite } from "./acabado";

const ORO = "#FFC46B", ORO2 = "#FFE3A8";

/** un brillo alrededor de algo que emite luz (siempre mira a cámara) */
export const Halo = ({ pos, tam, color, op = 1 }: { pos: V3; tam: number; color: string; op?: number }) => op <= 0.01 ? null : (
  <sprite position={pos} scale={[tam, tam, 1]}><spriteMaterial map={texturaHalo()} color={color} transparent opacity={op} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
);
/** una luz en el suelo, bajo lo que flota o brilla */
export const Charco = ({ x, z, r, color, op, y = 0.115 }: { x: number; z: number; r: number; color: string; op: number; y?: number }) => op <= 0.01 ? null : (
  <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[r, 40]} /><meshBasicMaterial map={texturaHalo()} color={color} transparent opacity={op} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
);

/**
 * Un agente o un trabajador: un robot que flota, mira a cámara, se inclina al avanzar y enciende ojos, pecho y antena
 * cuando trabaja. `nace` 0–1 (un muelle), `luz` 1 encendido y 0 apagado (una rama que no dio nada), `activo` 0–1
 * (tiene turno, está trabajando), `vel` su velocidad en x (velocidad(...)): con ella se inclina y bracea.
 */
export function Robot({ x, z, t, fase = 0, nace = 1, luz = 1, activo = 0, vel = 0, escala = 1.35, color = "#EDF1F8", acento = ORO, acento2 = ORO2 }: {
  x: number; z: number; t: number; fase?: number; nace?: number; luz?: number; activo?: number; vel?: number; escala?: number; color?: string; acento?: string; acento2?: string;
}) {
  if (nace <= 0.01) return null;
  const mueve = sat(Math.abs(vel) / 3), inclina = Math.max(-0.28, Math.min(0.28, vel * 0.035));
  const y = 0.98 + 0.06 * Math.sin(t * 2.2 + fase * 1.7) * (1 - mueve);
  const cuerpo = tono(color, "#565D6C", 1 - luz), ojos = tono(tono(acento2, acento, activo), "#7A8291", 1 - luz);
  const guino = parpadeo(t, fase * 0.9), brazo = 0.55 * Math.sin(t * 9 + fase) * mueve;
  const piel = <Ceramica color={cuerpo} brillo={0.4 + 0.6 * luz} />;
  return (
    <>
      <Contacto x={x} z={z} r={0.5 * escala} op={0.75 * sat(nace)} />
      <Charco x={x} z={z} r={1.0} color={tono("#8FB4FF", acento, activo)} op={(0.15 + 0.4 * activo) * luz * sat(nace)} />
      <group position={[x, y, z]} rotation={[0, 0, -inclina]} scale={escala * Math.min(1.08, nace)}>
        <group rotation={[0, 0.3 + 0.8 * mueve, 0]}>
          <mesh castShadow><capsuleGeometry args={[0.3, 0.26, 16, 56]} />{piel}</mesh>
          <mesh position={[0, 0.02, 0.288]}><sphereGeometry args={[0.07, 28, 20]} /><Emite color={tono("#56617A", acento, activo * luz)} fuerza={0.5 + 2.2 * activo * luz} /></mesh>
          <mesh castShadow position={[0, 0.58, 0]} scale={[1.14, 0.9, 1]}><sphereGeometry args={[0.3, 72, 48]} />{piel}</mesh>
          <mesh position={[0, 0.585, 0.13]} scale={[0.95, 0.5, 0.66]}><sphereGeometry args={[0.3, 72, 48]} /><Cristal /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[0.11 * s, 0.59, 0.318]} scale={[1, guino, 0.5]}><sphereGeometry args={[0.052, 32, 24]} /><Emite color={ojos} fuerza={0.4 + 1.3 * luz} lineas /></mesh>)}
          <mesh position={[0, 0.93, 0]}><cylinderGeometry args={[0.014, 0.014, 0.2, 8]} />{piel}</mesh>
          <mesh position={[0, 1.05, 0]}><sphereGeometry args={[0.05, 28, 20]} /><Emite color={tono("#6C7FA8", acento, activo * luz)} fuerza={0.5 + 5 * activo * luz} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} castShadow position={[0.39 * s, 0, 0.03]} rotation={[brazo * s, 0, 0.18 * s]}><capsuleGeometry args={[0.07, 0.17, 12, 28]} />{piel}</mesh>)}
        </group>
        <Halo pos={[0, 1.05, 0]} tam={0.9} color={acento} op={0.35 * activo * luz} />
      </group>
    </>
  );
}

/** el agente principal: una esfera con brillo de producto, su resplandor y la luz que echa. Su icono va encima en HTML (proyector) */
export function EsferaAgente({ pos, radio = 1.3, late = 1, color = "#E4472F", sombra = "#8E1D1A", brillo = "#ED513E", luz = 50 }: { pos: V3; radio?: number; late?: number; color?: string; sombra?: string; brillo?: string; luz?: number }) {
  return (
    <>
      <group position={pos}>
        <mesh castShadow scale={late}><sphereGeometry args={[radio, 72, 56]} /><meshPhysicalMaterial color={color} roughness={0.26} clearcoat={1} clearcoatRoughness={0.08} emissive={sombra} emissiveIntensity={0.35} /></mesh>
        <Halo pos={[0, 0, -0.4]} tam={radio * 4.6} color={brillo} op={0.2} />
        <pointLight color="#FF6A4D" intensity={luz} distance={16} decay={2} position={[0.4, 0.2, radio + 0.6]} />
      </group>
      <Contacto x={pos[0]} z={pos[2]} r={radio * 1.1} op={0.6} />
      <Charco x={pos[0]} z={pos[2]} r={radio * 2} color={brillo} op={0.18} y={0.02} />
    </>
  );
}

/** una fuente, una marca o un concepto: una moneda de pie con su icono real en la cara. `apaga` 0–1 la deja en gris */
export function Moneda({ pos, clave, icono, radio = 0.78, nace = 1, apaga = 0, giro = 0.22, inclina = 0.42 }: { pos: V3; clave: string; icono: Trazos; radio?: number; nace?: number; apaga?: number; giro?: number; inclina?: number }) {
  if (nace <= 0.01) return null;
  const canto = tono("#C9D0DC", "#3F4654", apaga);
  return (
    <group position={pos} rotation={[0, giro, 0]} scale={Math.min(1.1, nace)}>
      <mesh castShadow rotation={[Math.PI / 2 - inclina, 0, 0]}>
        <cylinderGeometry args={[radio, radio, 0.14, 64]} />
        <meshStandardMaterial attach="material-0" color={canto} roughness={0.4} />
        <meshStandardMaterial attach="material-1" map={texturaIcono(clave, icono, { giro: -1 })} color={tono("#FFFFFF", "#596070", apaga)} roughness={0.45} />
        <meshStandardMaterial attach="material-2" color={canto} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** un hilo de luz que se tiende de un punto a otro pasando por `por` y se queda: una rama que se abre, un envío, un vínculo. `e` 0–1 */
export function Hilo({ de, por, a, e, color = "#A17C45", punta = ORO2, grosor = 0.032 }: { de: V3; por: V3; a: V3; e: number; color?: string; punta?: string; grosor?: number }) {
  const { curva, geo } = useMemo(() => {
    const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...de), new THREE.Vector3(...por), new THREE.Vector3(...a));
    return { curva, geo: new THREE.TubeGeometry(curva, 48, grosor, 8) };
  }, [de.join(), por.join(), a.join(), grosor]);
  if (e <= 0.001) return null;
  geo.setDrawRange(0, Math.floor(48 * e) * 48);
  const p = curva.getPoint(e);
  return (
    <group>
      <mesh geometry={geo}><meshBasicMaterial color={color} /></mesh>
      <Halo pos={[p.x, p.y, p.z]} tam={1.3} color={punta} op={e < 1 ? 1 : 0} />
    </group>
  );
}

/** un carril en el suelo, de x0 a x0 + largo: `k` 0–1 lo tiende; de `desde` a `hasta` va encendido (lo recorrido) */
export function Carril({ x0, largo, z, k = 1, desde, hasta, apaga = 0, ancho = 1.0, color = "#242C42", linea = "#4B5670", recorrido = "#F1F6FB" }: { x0: number; largo: number; z: number; k?: number; desde?: number; hasta?: number; apaga?: number; ancho?: number; color?: string; linea?: string; recorrido?: string }) {
  return (
    <>
      {k > 0.01 ? (
        <>
          <mesh receiveShadow position={[x0 + (largo * k) / 2, 0.075, z]} scale={[k, 1, 1]}><boxGeometry args={[largo, 0.05, ancho]} /><meshStandardMaterial color={color} roughness={0.5} metalness={0.3} /></mesh>
          <mesh position={[x0 + (largo * k) / 2, 0.104, z]} scale={[k, 1, 1]}><boxGeometry args={[largo, 0.01, 0.07]} /><meshBasicMaterial color={linea} /></mesh>
        </>
      ) : null}
      {desde !== undefined && hasta !== undefined && hasta > desde + 0.05 ? <mesh position={[(desde + hasta) / 2, 0.11, z]}><boxGeometry args={[hasta - desde, 0.012, 0.11]} /><meshBasicMaterial color={tono(recorrido, "#566074", apaga)} /></mesh> : null}
    </>
  );
}

/** un nodo en el suelo: un paso de un proceso. Apagado hasta que se llega (`hecho`), en oro mientras se trabaja en él (`activo` 0–1) */
export function Nodo({ x, z, nace = 1, hecho = false, activo = 0, destello = 0, apaga = 0, radio = 0.66, acento = ORO }: { x: number; z: number; nace?: number; hecho?: boolean; activo?: number; destello?: number; apaga?: number; radio?: number; acento?: string }) {
  if (nace <= 0.01) return null;
  const s = Math.min(1.12, nace);
  return (
    <mesh receiveShadow position={[x, 0.125, z]} scale={[s, 1, s]}>
      <cylinderGeometry args={[radio, radio, 0.05, 48]} />
      <meshStandardMaterial color={activo > 0.3 ? acento : hecho ? tono("#C5CDDA", "#50586A", apaga) : tono("#4A5672", acento, 0.8 * destello)} emissive={acento} emissiveIntensity={Math.max(0.8 * activo, 0.7 * destello)} roughness={0.45} metalness={0.2} />
    </mesh>
  );
}

/** una franja en el suelo que cruza los carriles: una etapa. `g` 0–1 la tiende de delante hacia atrás; `activo` la enciende */
export function Franja({ x, z0, z1, g = 1, activo = 0, color = "#7A6238", acento = ORO }: { x: number; z0: number; z1: number; g?: number; activo?: number; color?: string; acento?: string }) {
  if (g <= 0.01) return null;
  const largo = z1 - z0;
  return <mesh position={[x, 0.068, z1 - (largo * g) / 2]} scale={[1, 1, g]}><boxGeometry args={[0.12, 0.02, largo]} /><meshBasicMaterial color={tono(color, acento, activo)} /></mesh>;
}

/** una peana baja donde descansa algo */
export function Peana({ x, z, ancho, alto = 0.6, fondo = 0.9, nace = 1, color = "#232838" }: { x: number; z: number; ancho: number; alto?: number; fondo?: number; nace?: number; color?: string }) {
  if (nace <= 0.01) return null;
  const s = Math.min(1.05, nace);
  return <mesh castShadow receiveShadow position={[x, (alto / 2 + 0.06) * s, z]} scale={[1, s, 1]}><boxGeometry args={[ancho, alto, fondo]} /><meshStandardMaterial color={color} roughness={0.45} metalness={0.35} emissive={ORO} emissiveIntensity={0.08} /></mesh>;
}

/** una bandeja donde llega lo que trae algo: se enciende cuando llega (`lleno` 0–1) */
export function Bandeja({ x, z, lleno = 0, ancho = 1.7, fondo = 1.36, acento = ORO }: { x: number; z: number; lleno?: number; ancho?: number; fondo?: number; acento?: string }) {
  return (
    <>
      <mesh receiveShadow castShadow position={[x, 0.15, z]}><boxGeometry args={[ancho, 0.12, fondo]} /><meshStandardMaterial color={tono("#262D40", "#4A3A1E", lleno)} roughness={0.5} metalness={0.3} emissive={acento} emissiveIntensity={0.14 * lleno} /></mesh>
      <Charco x={x} z={z} r={ancho} color={acento} op={0.5 * lleno} />
    </>
  );
}

/** una tarjeta que vuela de `de` a `a` y se posa (un resultado, un documento, una publicación). `e` 0–1; apiladas, cada una con su `a` más alto */
export function Tarjeta({ de, a, e, giro = 0, ancho = 1.2, alto = 0.052, fondo = 0.84, arco = 1.0, color = "#F4F7FB", acento = ORO }: { de: V3; a: V3; e: number; giro?: number; ancho?: number; alto?: number; fondo?: number; arco?: number; color?: string; acento?: string }) {
  if (e <= 0) return null;
  const p: V3 = [de[0] + (a[0] - de[0]) * e, de[1] + (a[1] - de[1]) * e + arco * Math.sin(Math.PI * e), de[2] + (a[2] - de[2]) * e];
  return (
    <mesh castShadow position={p} rotation={[0, giro + (1 - e) * 2.2, 0]} scale={0.35 + 0.65 * e}>
      <boxGeometry args={[ancho, alto, fondo]} /><meshStandardMaterial color={color} roughness={0.55} emissive={acento} emissiveIntensity={0.06} />
    </mesh>
  );
}

/** una barrera baja que corta el paso: sube y se desvanece cuando `abre` va de 0 a 1 */
export function Barrera({ x, z, cae = 1, abre = 0, largo = 1.7, color = "#ED513E" }: { x: number; z: number; cae?: number; abre?: number; largo?: number; color?: string }) {
  const op = sat(cae) * (1 - abre);
  return op <= 0.01 ? null : (
    <mesh position={[x, 0.75 + 1.5 * abre + 1.8 * (1 - Math.min(1, cae)), z]}><boxGeometry args={[0.13, 0.13, largo]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={op} /></mesh>
  );
}

/** un aro de luz que gira: un pase, un cupo, un permiso */
export function Aro({ pos, t, fase = 0, nace = 1, escala = 1.3, color = ORO }: { pos: V3; t: number; fase?: number; nace?: number; escala?: number; color?: string }) {
  if (nace <= 0.01) return null;
  return (
    <group position={[pos[0], pos[1] + 0.06 * Math.sin(t * 2.6 + fase), pos[2]]} scale={escala * Math.min(1.1, nace)}>
      <mesh castShadow rotation={[Math.PI / 2 + 0.55, 0, t * 1.8 + fase]}><torusGeometry args={[0.3, 0.065, 18, 56]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} roughness={0.3} metalness={0.4} /></mesh>
      <Halo pos={[0, 0, 0]} tam={1.4} color={color} op={0.45} />
    </group>
  );
}

/** un teléfono que emite: una llamada, una consulta a un modelo o a un servicio */
export function Telefono({ pos, t, fase = 0, nace = 1, escala = 1.3, color = ORO, onda = ORO2 }: { pos: V3; t: number; fase?: number; nace?: number; escala?: number; color?: string; onda?: string }) {
  if (nace <= 0.01) return null;
  return (
    <group position={[pos[0], pos[1] + 0.06 * Math.sin(t * 2.6 + fase), pos[2]]} scale={escala * Math.min(1.1, nace)}>
      <group rotation={[-0.3, 0.45 * Math.sin(t * 1.3 + fase), 0.12]}>
        <mesh castShadow><boxGeometry args={[0.36, 0.62, 0.07]} /><meshStandardMaterial color="#1B1F2A" roughness={0.3} metalness={0.6} /></mesh>
        <mesh position={[0, 0, 0.037]}><planeGeometry args={[0.3, 0.54]} /><meshBasicMaterial color={color} /></mesh>
        <mesh position={[0, 0.215, 0.039]}><planeGeometry args={[0.11, 0.025]} /><meshBasicMaterial color="#1B1F2A" /></mesh>
        <mesh position={[0, -0.2, 0.039]}><circleGeometry args={[0.032, 20]} /><meshBasicMaterial color="#1B1F2A" /></mesh>
        {[0.14, 0.24].map((r, j) => <mesh key={j} position={[0.16, 0.3, 0]}><torusGeometry args={[r, 0.02, 8, 24, Math.PI / 2]} /><meshBasicMaterial color={onda} transparent opacity={0.35 + 0.65 * sat(Math.sin(t * 5 - j * 1.2 + fase))} /></mesh>)}
      </group>
      <Halo pos={[0, 0, 0]} tam={1.4} color={color} op={0.45} />
    </group>
  );
}
