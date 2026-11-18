// Los subtítulos que van dibujados en el vídeo: el bloque que se está diciendo, con cada palabra apareciendo cuando
// suena y la palabra clave del bloque en otro color. Dónde van y qué tamaño tienen sale del formato del vídeo
// (motor/lib/perfiles.mjs → "subtitulo") y de video.json → "subtitulo": { "arriba": 1200, "tamano": 80, … }.
import React from "react";
import { useVideoConfig } from "remotion";
import { useNarracion } from "./reloj";
import { LETRA } from "./tipografia";

export type EstiloDeSubtitulos = {
  /** cuerpo de la letra y alto de cada línea, en píxeles del vídeo */
  tamano: number;
  interlineado: number;
  /** ancho máximo del bloque, centrado en el cuadro */
  ancho: number;
  /** la y de la parte de arriba de la primera línea */
  arriba: number;
  color: string;
  /** el color de la palabra clave */
  resalte: string;
  /** el contorno oscuro que lo separa de lo que tenga detrás; false lo quita */
  borde: boolean | number;
  /** segundos que cada palabra se adelanta a la voz: leída un instante antes, se siente a tiempo */
  adelanto: number;
};

export const SUBTITULOS_DE_PARTIDA: EstiloDeSubtitulos = {
  tamano: 76, interlineado: 90, ancho: 780, arriba: 1180, color: "#FFFFFF", resalte: "#FFD84D", borde: true, adelanto: 0.06,
};

export const Subtitulos: React.FC<{ estilo?: Partial<EstiloDeSubtitulos> }> = ({ estilo }) => {
  const e = { ...SUBTITULOS_DE_PARTIDA, ...(estilo ?? {}) };
  const { width } = useVideoConfig();
  const { f, fps, palabras, bloques } = useNarracion();
  const antes = Math.round(e.adelanto * fps);
  // el bloque en curso: el último que ya ha empezado, mientras no haya pasado medio segundo desde su última palabra
  let actual: (typeof bloques)[number] | null = null;
  for (const b of bloques) {
    if (palabras[b.palabras[0]].desde - antes <= f) actual = b;
    else break;
  }
  if (!actual) return null;
  const ultima = palabras[actual.palabras[actual.palabras.length - 1]];
  const siguiente = bloques[bloques.indexOf(actual) + 1];
  if (!siguiente && f > ultima.hasta + Math.round(0.5 * fps)) return null;

  const grosor = e.borde === false ? 0 : e.borde === true ? Math.round(e.tamano * 0.14) : e.borde;
  const lineas = actual.salto === undefined
    ? [actual.palabras]
    : [actual.palabras.filter((n) => n < actual!.salto!), actual.palabras.filter((n) => n >= actual!.salto!)];
  return (
    <div
      data-medir="subtitulo"
      style={{
        position: "absolute", left: (width - e.ancho) / 2, top: e.arriba, width: e.ancho, textAlign: "center",
        fontFamily: LETRA, fontWeight: 800, fontSize: e.tamano, lineHeight: `${e.interlineado}px`, color: e.color,
        WebkitTextStroke: grosor ? `${grosor}px rgba(0,0,0,0.9)` : undefined, paintOrder: "stroke fill",
      }}
    >
      {lineas.map((linea, i) => (
        <div key={i}>
          {linea.map((n) => {
            const p = palabras[n];
            // entra en tres fotogramas, subiendo un poco, cuando le toca
            const avance = Math.max(0, Math.min(1, (f - (p.desde - antes) + 1) / 3));
            return (
              <span key={n} style={{ display: "inline-block", margin: `0 ${e.tamano * 0.13}px`, opacity: avance, transform: `translateY(${(1 - avance) * e.tamano * 0.18}px)`, color: p.clave ? e.resalte : undefined }}>
                {p.texto}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
