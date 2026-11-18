// Dibuja lo que lleva dentro tal como está en un segundo del vídeo, parado: para una portada que es un momento del
// vídeo, o que reutiliza una pieza suya (el agente, una ventana) como se ve en ese instante.
//
//   <Instante s={12.5}><Video /></Instante>
import React, { useContext } from "react";
import { Freeze } from "remotion";
import { NarracionContext } from "./reloj";

export const Instante: React.FC<{ s: number; children: React.ReactNode }> = ({ s, children }) => {
  const v = useContext(NarracionContext);
  if (!v) throw new Error("<Instante> solo funciona dentro del vídeo o de su portada.");
  const f = Math.max(0, Math.min(v.frames - 1, Math.round(s * v.fps)));
  // useNarracion() y useCurrentFrame() dan ese fotograma a todo lo de dentro
  return (
    <NarracionContext.Provider value={{ ...v, f }}>
      <Freeze frame={f}>{children}</Freeze>
    </NarracionContext.Provider>
  );
};
