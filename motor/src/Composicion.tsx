// La composición de Remotion que envuelve al vídeo de cada proyecto. Las herramientas de motor/ empaquetan esto con el
// video.tsx del vídeo (el nombre «@video» apunta a él) y le pasan sus datos: de ahí salen el tamaño, la duración, la
// voz, los sonidos y los subtítulos. El video.tsx solo dibuja.
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, Audio, Composition, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import DelProyecto from "@video";
import { SIN_DATOS, type Datos } from "./datos";
import { Medir } from "./Medir";
import { PerfilContext } from "./perfil";
import { crearNarracion, NarracionContext } from "./reloj";
import { Subtitulos } from "./Subtitulos";
import { letraLista } from "./tipografia";
import { Zonas } from "./Zonas";

/**
 * Lo que rodea a cualquier cosa que dibuje el motor (el vídeo o su portada): espera a que la letra esté cargada, da el
 * perfil del formato y la narración a lo de dentro, y monta el medidor cuando una herramienta lo pide.
 */
export const Envoltorio: React.FC<{ datos: Datos; children: React.ReactNode }> = ({ datos, children }) => {
  const [pendiente] = useState(() => delayRender("la letra del motor"));
  const [conLetra, setConLetra] = useState(false);
  useEffect(() => {
    letraLista().then(() => { setConLetra(true); continueRender(pendiente); });
  }, [pendiente]);
  const narracion = useMemo(() => crearNarracion(datos), [datos]);
  const f = useCurrentFrame();
  if (!conLetra) return null;
  return (
    <PerfilContext.Provider value={datos.perfil ?? null}>
      <NarracionContext.Provider value={{ ...narracion, f }}>
        <AbsoluteFill>
          {children}
          {datos.medir ? <Medir escala={datos.perfil?.escala ?? 1} /> : null}
        </AbsoluteFill>
      </NarracionContext.Provider>
    </PerfilContext.Provider>
  );
};

const ElVideo: React.FC<{ datos: Datos }> = ({ datos }) => (
  <Envoltorio datos={datos}>
    <DelProyecto />
    {datos.subtitulo !== false && !datos.sinSubtitulos ? <Subtitulos estilo={datos.subtitulo} /> : null}
    {datos.zonas && datos.perfil ? <Zonas perfil={datos.perfil} ancho={datos.ancho} alto={datos.alto} /> : null}
    {datos.voz ? <Audio src={staticFile(datos.voz)} /> : null}
    {datos.sonidos ? <Audio src={staticFile(datos.sonidos)} /> : null}
  </Envoltorio>
);

export const Raiz: React.FC = () => (
  <Composition
    id="video"
    component={ElVideo as unknown as React.FC<Record<string, unknown>>}
    defaultProps={{ datos: SIN_DATOS }}
    durationInFrames={60}
    fps={60}
    width={1080}
    height={1920}
    calculateMetadata={({ props }) => {
      const d = (props as { datos: Datos }).datos;
      return { fps: d.fps, width: d.ancho, height: d.alto, durationInFrames: Math.max(1, Math.round(d.duracion * d.fps)) };
    }}
  />
);
