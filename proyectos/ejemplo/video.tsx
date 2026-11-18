// El vídeo de ejemplo del taller: cinco pasos que aparecen cuando la voz los nombra, unidos por un punto de luz que
// viaja de uno a otro. Sirve para comprobar que el motor funciona y para ver cómo se escribe un vídeo: todo lo que se
// mueve depende del fotograma (f) y de cuándo se dice cada palabra (cuando), nunca de un reloj propio.
import React from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import { LETRA, useNarracion } from "@motor";

const FONDO = "#0B0D12", TINTA = "#F2F5FA", TENUE = "#8A93A6", ACENTO = "#FFD84D";
const PASOS = [
  { nombre: "La idea", palabra: "idea", dibujo: "idea" },
  { nombre: "Guion y voz", palabra: "guion", dibujo: "voz" },
  { nombre: "Las escenas", palabra: "escena", dibujo: "escena" },
  { nombre: "Tú aceptas", palabra: "aceptas", dibujo: "acepta" },
  { nombre: "Los jueces", palabra: "jueces", dibujo: "jueces" },
] as const;
const X = 360, ARRIBA = 360, PASO = 160, RADIO = 58;

/** el dibujo de cada paso, hecho con trazos sencillos dentro de un círculo de 116 px */
const Dibujo: React.FC<{ cual: (typeof PASOS)[number]["dibujo"]; color: string }> = ({ cual, color }) => {
  const trazo = { fill: "none", stroke: color, strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg width={116} height={116} viewBox="-58 -58 116 116">
      {cual === "idea" && (<><circle r={20} cy={-8} {...trazo} /><path d="M -9 20 H 9 M -6 30 H 6" {...trazo} /></>)}
      {cual === "voz" && [-24, -12, 0, 12, 24].map((x, i) => <path key={x} d={`M ${x} ${-[10, 22, 30, 18, 8][i]} V ${[10, 22, 30, 18, 8][i]}`} {...trazo} />)}
      {cual === "escena" && (<><rect x={-28} y={-20} width={56} height={40} rx={7} {...trazo} /><path d="M -8 -9 L 10 0 L -8 9 Z" {...trazo} /></>)}
      {cual === "acepta" && <path d="M -22 2 L -6 18 L 24 -16" {...trazo} />}
      {cual === "jueces" && [-24, 0, 24].map((x) => <circle key={x} cx={x} r={8} {...trazo} />)}
    </svg>
  );
};

export default function Video() {
  const { f, fps, cuando } = useNarracion();
  const llegadas = PASOS.map((p) => cuando(p.palabra));
  // el punto de luz: está en el último paso nombrado y viaja al siguiente en medio segundo, frenando al llegar
  const hecho = llegadas.filter((l) => f >= l).length;
  const viaje = hecho ? spring({ frame: f - llegadas[hecho - 1], fps, config: { damping: 200 }, durationInFrames: Math.round(0.5 * fps) }) : 0;
  const yPunto = hecho ? ARRIBA + (hecho - 2 + viaje) * PASO : ARRIBA - PASO;
  return (
    <AbsoluteFill style={{ background: FONDO, fontFamily: LETRA }}>
      {/* la línea que une los pasos: se dibuja hasta donde ha llegado el punto */}
      <div style={{ position: "absolute", left: X - 3, top: ARRIBA, width: 6, height: (PASOS.length - 1) * PASO, borderRadius: 3, background: "#1C212C" }} />
      <div style={{ position: "absolute", left: X - 3, top: ARRIBA, width: 6, height: Math.max(0, Math.min((PASOS.length - 1) * PASO, yPunto - ARRIBA)), borderRadius: 3, background: ACENTO }} />
      {PASOS.map((p, i) => {
        const entra = spring({ frame: f - llegadas[i], fps, config: { damping: 14, stiffness: 160 } });
        const visto = f >= llegadas[i];
        const y = ARRIBA + i * PASO;
        return (
          <React.Fragment key={p.palabra}>
            <div style={{ position: "absolute", left: X - RADIO, top: y - RADIO, width: RADIO * 2, height: RADIO * 2, borderRadius: "50%", background: visto ? "#182033" : "#12151C", border: `4px solid ${visto ? ACENTO : "#232936"}`, boxSizing: "border-box", transform: `scale(${visto ? 0.82 + 0.18 * entra : 0.82})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Dibujo cual={p.dibujo} color={visto ? TINTA : "#3A4254"} />
            </div>
            <div style={{ position: "absolute", left: X + RADIO + 44, top: y - 34, fontSize: 58, lineHeight: "68px", fontWeight: 700, color: visto ? TINTA : TENUE, opacity: visto ? 1 : 0.45, transform: `translateX(${visto ? interpolate(entra, [0, 1], [-18, 0]) : 0}px)`, whiteSpace: "nowrap" }}>
              {p.nombre}
            </div>
          </React.Fragment>
        );
      })}
      {hecho > 0 && <div style={{ position: "absolute", left: X - 15, top: yPunto - 15, width: 30, height: 30, borderRadius: "50%", background: ACENTO, opacity: hecho === 1 ? 1 - viaje : 1 - Math.max(0, (viaje - 0.75) / 0.25), boxShadow: `0 0 28px 8px ${ACENTO}66` }} />}
    </AbsoluteFill>
  );
}

/** las tres portadas: la misma idea con otra frase y otra composición */
export const Portada: React.FC<{ variante: number }> = ({ variante }) => {
  const frases = ["De la idea\nal vídeo", "Cinco pasos,\nun vídeo", "¿Cómo se hace\nun vídeo aquí?"];
  const dibujos = ["idea", "escena", "jueces"] as const;
  const arriba = variante === 2;
  return (
    <AbsoluteFill style={{ background: variante === 3 ? "#131A2B" : FONDO, fontFamily: LETRA, alignItems: "center", justifyContent: "center", flexDirection: arriba ? "column-reverse" : "column", gap: 70 }}>
      <div style={{ width: 300, height: 300, borderRadius: "50%", border: `10px solid ${ACENTO}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: "scale(2.2)" }}><Dibujo cual={dibujos[variante - 1]} color={TINTA} /></div>
      </div>
      <div style={{ fontSize: 132, lineHeight: "144px", fontWeight: 800, color: variante === 1 ? ACENTO : TINTA, textAlign: "center", whiteSpace: "pre-line" }}>{frases[variante - 1]}</div>
    </AbsoluteFill>
  );
};
