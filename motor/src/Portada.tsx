// La composición de las portadas (motor/portada.mjs). El nombre «@portada» apunta al archivo del vídeo que exporta
// `Portada` (su video.tsx o un portada.tsx aparte); recibe `variante` (1, 2 o 3) y devuelve una imagen quieta.
import React from "react";
import { Composition } from "remotion";
import * as DelProyecto from "@portada";
import { Envoltorio } from "./Composicion";
import { SIN_DATOS, type Datos } from "./datos";

type Dibujo = React.FC<{ variante: number }>;

const LaPortada: React.FC<{ datos: Datos; variante: number }> = ({ datos, variante }) => {
  const Dibuja = (DelProyecto as { Portada?: Dibujo }).Portada;
  if (!Dibuja) throw new Error("Este vídeo no tiene portada: su video.tsx (o un portada.tsx en su carpeta) tiene que exportar «Portada».");
  return (
    <Envoltorio datos={datos}>
      <Dibuja variante={variante} />
    </Envoltorio>
  );
};

export const RaizPortada: React.FC = () => (
  <Composition
    id="portada"
    component={LaPortada as unknown as React.FC<Record<string, unknown>>}
    defaultProps={{ datos: SIN_DATOS, variante: 1 }}
    durationInFrames={1}
    fps={60}
    width={1080}
    height={1920}
    calculateMetadata={({ props }) => {
      const d = (props as { datos: Datos }).datos;
      return { fps: d.fps, width: d.ancho, height: d.alto, durationInFrames: Math.max(1, Math.round(d.duracion * d.fps)) };
    }}
  />
);
