// El perfil de formato del vídeo (reel, youtube, linkedin), tal como lo define motor/lib/perfiles.mjs: tamaño, lo que
// tapa cada red, las medidas mínimas de la letra, el aire y la política de subtítulos. Llega en datos.perfil; el vídeo
// lo lee con usePerfil() para colocar lo importante dentro de lo que la red no tapa.
import { createContext, useContext } from "react";

export type Zona = {
  id: string;
  lado: "arriba" | "abajo" | "izquierda" | "derecha"; // el borde del cuadro que la red tapa
  limite: number; // hasta dónde llega, en píxeles del perfil
  desde?: number; // si no ocupa todo el borde: el tramo, en el otro eje
  hasta?: number;
  holgura?: number;
  tapa?: string;
  que: string;
  cerca: string;
  rotulo?: string; // lo que se escribe encima al pintarla (render.mjs --zonas)
};

export type Perfil = {
  id: "reel" | "youtube" | "linkedin";
  es: string;
  para: string;
  red: string;
  quien: string;
  ritmo: string;
  ancho: number;
  alto: number;
  movil: string;
  enMovil: string;
  escala: number; // cuánto más grande hay que dibujar que en un reel para que en el móvil se vea igual
  holgura: number;
  zonas: Zona[];
  letra: { minima: number; secundaria: number; pantalla: number; enlace: number; rotulo: number };
  aire: { piezas: number; borde: number; linea: number };
  margen: { error: number; aviso: number; chipError: number; chipAviso: number };
  subtitulos: "quemados" | "srt";
  subtitulo: Record<string, unknown>;
  portada: { como: string; zonas: Zona[]; minimo?: { ancho: number; alto: number }; pesoMaximoMB?: number };
};

/** la caja que ocupa una zona en un cuadro del tamaño del perfil: [x, y, ancho, alto] */
export function cajaDe(z: Zona, ancho: number, alto: number): [number, number, number, number] {
  const horizontal = z.lado === "arriba" || z.lado === "abajo";
  const d = z.desde ?? 0, h = z.hasta ?? (horizontal ? ancho : alto);
  if (z.lado === "arriba") return [d, 0, h - d, z.limite];
  if (z.lado === "abajo") return [d, z.limite, h - d, alto - z.limite];
  if (z.lado === "izquierda") return [0, d, z.limite, h - d];
  return [z.limite, d, ancho - z.limite, h - d];
}

export const PerfilContext = createContext<Perfil | null>(null);

/**
 * Dentro del vídeo o de su portada: el perfil de su formato. usePerfil().zonas dice lo que tapa la red;
 * usePerfil().letra, las medidas mínimas (rotulo, pantalla, enlace, secundaria, minima); usePerfil().aire, el aire.
 */
export function usePerfil(): Perfil {
  const p = useContext(PerfilContext);
  if (!p) throw new Error("usePerfil() solo funciona dentro del vídeo.");
  return p;
}
