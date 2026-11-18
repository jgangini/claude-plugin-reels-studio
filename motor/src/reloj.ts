// El reloj de la narración. Un vídeo no se anima «a los 3 segundos», sino «cuando la voz dice tal palabra»: así, si
// la voz se vuelve a grabar y los tiempos cambian, cada cosa sigue pasando en su palabra.
//
//   const { f, t, fps, cuando } = useNarracion();
//   const entra = cuando("ramas");            // el fotograma en que empieza a decirse «ramas»
//   const otra = cuando("agente", 2);         // la segunda vez que se dice «agente»
import { createContext, useContext } from "react";
import type { BloqueDeSubtitulo, Datos, PalabraDicha } from "./datos";

/** igual que en motor/lib/taller.mjs: una palabra sin mayúsculas, tildes ni signos */
export function llano(palabra: string): string {
  return String(palabra).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export type PalabraEnElTiempo = PalabraDicha & { n: number; desde: number; hasta: number };

export type Narracion = {
  fps: number;
  /** cuántos fotogramas dura el vídeo */
  frames: number;
  /** las palabras de la voz; `desde` y `hasta` son fotogramas */
  palabras: PalabraEnElTiempo[];
  bloques: BloqueDeSubtitulo[];
  /** el fotograma en que empieza a decirse una palabra: la vez que se pida (1 es la primera), contando desde `apartirDe` */
  cuando: (palabra: string, vez?: number, apartirDe?: number) => number;
  /** el fotograma en que termina de decirse */
  acaba: (palabra: string, vez?: number, apartirDe?: number) => number;
};

export function crearNarracion(datos: Datos): Narracion {
  const fps = datos.fps;
  const palabras = datos.palabras.map((p, n) => ({ ...p, n, desde: Math.round(p.inicio * fps), hasta: Math.round(p.fin * fps) }));
  const porPalabra = new Map<string, PalabraEnElTiempo[]>();
  for (const p of palabras) {
    const k = llano(p.texto);
    porPalabra.set(k, [...(porPalabra.get(k) ?? []), p]);
  }
  const busca = (palabra: string, vez: number, apartirDe: number) => {
    const veces = (porPalabra.get(llano(palabra)) ?? []).filter((p) => p.desde >= apartirDe);
    const hallada = veces[vez - 1];
    if (!hallada) {
      const total = porPalabra.get(llano(palabra))?.length ?? 0;
      throw new Error(total
        ? `La voz dice «${palabra}» ${total} ${total === 1 ? "vez" : "veces"}, y se pidió la n.º ${vez}${apartirDe ? ` a partir del fotograma ${apartirDe}` : ""}.`
        : `La voz no dice «${palabra}». Las palabras están en palabras.json; se comparan sin tildes, mayúsculas ni signos.`);
    }
    return hallada;
  };
  return {
    fps, palabras, bloques: datos.bloques,
    frames: Math.max(1, Math.round(datos.duracion * fps)),
    cuando: (palabra, vez = 1, apartirDe = 0) => busca(palabra, vez, apartirDe).desde,
    acaba: (palabra, vez = 1, apartirDe = 0) => busca(palabra, vez, apartirDe).hasta,
  };
}

/** la narración más el fotograma que se está dibujando (un <Instante> lo fija en uno concreto) */
export const NarracionContext = createContext<(Narracion & { f: number }) | null>(null);

/** dentro de un vídeo: el fotograma `f`, el segundo `t` y cuándo se dice cada palabra */
export function useNarracion(): Narracion & { f: number; t: number } {
  const n = useContext(NarracionContext);
  if (!n) throw new Error("useNarracion() solo funciona dentro de un vídeo que dibuja el motor (o de su portada).");
  return { ...n, t: n.f / n.fps };
}
