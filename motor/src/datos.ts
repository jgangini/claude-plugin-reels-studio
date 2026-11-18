// Lo que el motor le pasa a un vídeo cada vez que lo dibuja. Lo prepara motor/lib/taller.mjs (abrirVideo) a partir de
// la carpeta del vídeo; las herramientas le añaden lo suyo (medir, zonas, sinSubtitulos).
import type { Perfil } from "./perfil";
import type { EstiloDeSubtitulos } from "./Subtitulos";

/** una palabra de la voz, con el segundo en que empieza y en que termina de decirse */
export type PalabraDicha = { texto: string; inicio: number; fin: number; clave?: boolean };

/** un bloque del subtítulo: las palabras que se ven juntas; `salto` es la que abre la segunda línea */
export type BloqueDeSubtitulo = { palabras: number[]; salto?: number };

export type Datos = {
  slug: string;
  formato?: string;
  perfil?: Perfil;
  fps: number;
  ancho: number;
  alto: number;
  /** segundos */
  duracion: number;
  /** archivos de medios/, o null si todavía no existen */
  voz: string | null;
  sonidos: string | null;
  palabras: PalabraDicha[];
  bloques: BloqueDeSubtitulo[];
  subtitulo: false | Partial<EstiloDeSubtitulos>;
  // lo que añaden las herramientas
  sinSubtitulos?: boolean;
  zonas?: boolean;
  medir?: boolean;
};

export const SIN_DATOS: Datos = { slug: "", fps: 60, ancho: 1080, alto: 1920, duracion: 1, voz: null, sonidos: null, palabras: [], bloques: [], subtitulo: false };
