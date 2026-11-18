// Pantallas recreadas (un chat, una terminal, una ventana de app) que no «nadan»: el texto solo aparece en su sitio con
// un fundido, lo que es pasajero vive en un hueco de altura fija para que al irse no mueva nada, y la cámara, si se
// mueve, lo hace con un empujón corto y frenado entre dos encuadres quietos. Son las reglas que ccvideo (MIT, 0xAA)
// sacó comparando fotogramas píxel a píxel; aquí están adaptadas a un reel vertical y al reloj de la narración (useNarracion).
// Lo que se lee en una pantalla sale de una captura (fuentes/) y va en hechos.json con "pantalla": nada se inventa.
//
//   import { Ventana, Linea, Escribe, Cursor, Hueco, Pensando, Bala, Tono, Entrada, empujon, MONO } from "@motor";
//   <Ventana titulo="chat — agente" x={60} y={400} ancho={960} alto={900}>
//     <Linea desde={cuando("preguntas")}><Tono.Dim>›</Tono.Dim> <Escribe texto="¿Qué se dice de mi marca en Colombia?" desde={cuando("preguntas")} /></Linea>
//     <Hueco alto={60}><Pensando desde={f1} hasta={f2} palabra="Investigando" /></Hueco>
//     <Bala desde={cuando("fuentes")}>web · 12 páginas leídas</Bala>
//   </Ventana>
//
// Todo se mide en fotogramas del vídeo entero (los que da useNarracion: f, cuando). Nada usa transition ni animation de CSS.
import React from "react";
import { Easing, interpolate } from "remotion";
import { useNarracion } from "./reloj";

export const MONO = `"JetBrains Mono", "Cascadia Mono", Consolas, "SF Mono", Menlo, monospace`;

/** la paleta de una pantalla oscura (de ccvideo, tema «dark») y la clara (tema «terracota», solo la ventana) */
export const PANTALLA = {
  oscura: { fondo: "#181716", barra: "#232522", borde: "#2E2C2A", titulo: "#8A8A86", texto: "#CFCBC5", dim: "#A1A09D", comentario: "#6E6D69", acento: "#D97656", azul: "#8B92C9", verde: "#5FA97B", oro: "#E8B64C", rojo: "#B0473F" },
  clara: { fondo: "#2B2C36", barra: "#3A3634", borde: "transparent", titulo: "#A9A4A3", texto: "#E3E4EB", dim: "#9899A1", comentario: "#6C6E6A", acento: "#CC7D5D", azul: "#B8B9F2", verde: "#4EBA65", oro: "#F2C43D", rojo: "#E5695E" },
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const suave = Easing.bezier(0.16, 1, 0.3, 1);

/** aparece en su sitio con un fundido corto (nunca se desplaza): `desde` es el fotograma del vídeo */
export const Linea: React.FC<{ desde?: number; hasta?: number; alto?: number | string; style?: React.CSSProperties; children?: React.ReactNode }> = ({ desde = 0, hasta, alto = "1.65em", style, children }) => {
  const { f, fps } = useNarracion();
  const k = fps / 30;
  const entra = interpolate(f, [desde, desde + 8 * k], [0, 1], { ...clamp, easing: suave });
  const sale = hasta === undefined ? 1 : interpolate(f, [hasta - 6 * k, hasta], [1, 0], clamp);
  return <div style={{ opacity: entra * sale, minHeight: alto, whiteSpace: "pre-wrap", ...style }}>{children}</div>;
};

/** el cursor: fijo mientras se escribe, parpadea después */
export const Cursor: React.FC<{ parpadea?: boolean; color?: string }> = ({ parpadea = true, color = "currentColor" }) => {
  const { f, fps } = useNarracion();
  const on = parpadea ? Math.floor(f / (fps * 0.55)) % 2 === 0 : true;
  return <span style={{ display: "inline-block", width: "0.6em", height: "1.1em", verticalAlign: "text-bottom", background: color, opacity: on ? 1 : 0 }} />;
};

/** escribe `texto` desde el fotograma `desde` a `cps` caracteres por segundo (35–45 se lee como alguien tecleando) */
export const Escribe: React.FC<{ texto: string; desde: number; cps?: number; cursor?: boolean; color?: string; style?: React.CSSProperties }> = ({ texto, desde, cps = 40, cursor = true, color, style }) => {
  const { f, fps } = useNarracion();
  const n = Math.max(0, Math.floor(((f - desde) * cps) / fps));
  const hecho = n >= texto.length;
  return (
    <span style={{ color, whiteSpace: "pre-wrap", ...style }}>
      {texto.slice(0, n)}
      {cursor && <Cursor parpadea={hecho} color={color} />}
    </span>
  );
};

/** un hueco de altura fija: lo que vive dentro (un «pensando…», una barra) puede irse sin mover lo de abajo */
export const Hueco: React.FC<{ alto: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ alto, children, style }) => (
  <div style={{ height: alto, flexShrink: 0, overflow: "hidden", ...style }}>{children}</div>
);

/** «✻ Pensando…» con los puntos animados y los segundos que lleva (segundos={false} si esa cifra no es un hecho); se apaga en su sitio en `hasta` */
export const Pensando: React.FC<{ desde: number; hasta?: number; palabra?: string; color?: string; dim?: string; segundos?: boolean }> = ({ desde, hasta, palabra = "Pensando", color = PANTALLA.oscura.acento, dim = PANTALLA.oscura.dim, segundos = true }) => {
  const { f, fps } = useNarracion();
  if (f < desde) return null;
  const puntos = ".".repeat((Math.floor(((f - desde) * 3) / fps) % 3) + 1);
  const seg = Math.max(0, Math.floor((f - desde) / fps));
  return (
    <Linea desde={desde} hasta={hasta}>
      <span style={{ color }}>✻ {palabra}<span style={{ display: "inline-block", width: "3ch" }}>{puntos}</span></span>
      {segundos && <span style={{ color: dim }}> ({seg}s)</span>}
    </Linea>
  );
};

/** una línea con viñeta («●» por defecto): un resultado, una herramienta, un paso hecho */
export const Bala: React.FC<{ desde: number; hasta?: number; signo?: string; color?: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({ desde, hasta, signo = "●", color, children, style }) => (
  <Linea desde={desde} hasta={hasta} style={{ display: "flex", gap: "0.7em", marginTop: "0.45em", ...style }}>
    <span style={{ color, flexShrink: 0 }}>{signo}</span>
    <span style={{ whiteSpace: "pre-wrap" }}>{children}</span>
  </Linea>
);

/** tonos del texto: Dim (apagado), K (palabra clave), C (código o ruta), B (negrita), Ok, Mal */
const tono = (color: string, extra: React.CSSProperties = {}): React.FC<{ children?: React.ReactNode }> => ({ children }) => <span style={{ color, ...extra }}>{children}</span>;
export const Tono = {
  Dim: tono(PANTALLA.oscura.dim),
  K: tono(PANTALLA.oscura.azul),
  C: tono(PANTALLA.oscura.oro),
  B: tono(PANTALLA.oscura.texto, { fontWeight: 700 }),
  Ok: tono(PANTALLA.oscura.verde),
  Mal: tono(PANTALLA.oscura.rojo),
};

/**
 * Una ventana con barra de título y tres botones, colocada donde digas (x, y, ancho, alto en px del vídeo). Dentro, una
 * columna; lo que quieras anclar abajo (una caja de entrada), tras un <div style={{ flex: 1 }} />. `escala` la agranda
 * desde su centro (para un empujón de cámara: cámbiala solo con un spring corto entre dos valores quietos).
 */
export const Ventana: React.FC<{
  titulo?: string; x: number; y: number; ancho: number; alto: number; oscuro?: boolean; escala?: number; opacidad?: number;
  letra?: number; relleno?: string; children?: React.ReactNode; style?: React.CSSProperties;
}> = ({ titulo = "", x, y, ancho, alto, oscuro = true, escala = 1, opacidad = 1, letra = 30, relleno = "28px 36px 24px 36px", children, style }) => {
  const c = oscuro ? PANTALLA.oscura : PANTALLA.clara;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: ancho, height: alto, transform: `scale(${escala})`, transformOrigin: "50% 50%", opacity: opacidad,
      borderRadius: 22, background: c.fondo, border: `1.5px solid ${c.borde}`, boxShadow: oscuro ? "0 30px 80px rgba(0,0,0,0.6)" : "0 40px 90px rgba(0,0,0,0.38)",
      overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: MONO, fontSize: letra, lineHeight: 1.65, color: c.texto, ...style }}>
      <div style={{ height: 64, flexShrink: 0, background: c.barra, display: "flex", alignItems: "center", gap: 14, padding: "0 26px" }}>
        {[c.rojo, c.oro, c.verde].map((col, i) => <span key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: col, display: "inline-block" }} />)}
        <span style={{ flex: 1, textAlign: "center", fontSize: letra * 0.72, color: c.titulo, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 88 }}>{titulo}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: relleno, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/** la caja de entrada de un chat o terminal («›» y el cursor o el texto que se escribe), para anclar abajo */
export const Entrada: React.FC<{ texto?: string; desde?: number; cps?: number; signo?: string; color?: string }> = ({ texto, desde = 0, cps = 40, signo = "›", color }) => {
  const c = PANTALLA.oscura;
  return (
    <div style={{ borderTop: `2px solid ${c.borde}`, marginTop: 18, paddingTop: 14, display: "flex", gap: "0.7em" }}>
      <span style={{ color: c.dim }}>{signo}</span>
      <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{texto ? <Escribe texto={texto} desde={desde} cps={cps} color={color} /> : <Cursor />}</span>
    </div>
  );
};

/**
 * Un empujón de cámara corto y frenado (unos 0,6 s) entre dos encuadres quietos: devuelve la escala para ese fotograma.
 * La única cámara que se permite sobre una pantalla con texto: un zoom lento hace que la letra pequeña «nade».
 */
export function empujon(f: number, fps: number, cortes: { desde: number; escala: number }[], base = 1) {
  let escala = base;
  for (const c of cortes) {
    const k = interpolate(f, [c.desde, c.desde + 0.6 * fps], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.2, 1) });
    escala = escala + (c.escala - escala) * k;
  }
  return escala;
}
