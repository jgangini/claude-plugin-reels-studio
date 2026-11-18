// Empaqueta el motor con el vídeo de un proyecto para que Remotion pueda dibujarlo. El video.tsx del proyecto entra
// con el nombre «@video»; lo que él importa del motor, con «@motor» y «@motor/3d». La carpeta medios/ del vídeo es la
// pública: dentro del vídeo, staticFile("voz.mp3") es medios/voz.mp3.
import { bundle } from "@remotion/bundler";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { TALLER } from "./taller.mjs";

const SRC = join(TALLER, "motor", "src");

/**
 * `p` es lo que devuelve abrirVideo(). `entrada` es el archivo de motor/src que registra la composición (el vídeo, por
 * defecto, o las portadas) y `nombres` añade más nombres de importación («@portada»). Devuelve la dirección del paquete.
 */
export async function empaquetar(p, { entrada = "index.ts", nombres = {} } = {}) {
  const video = join(p.dir, "video.tsx");
  if (!existsSync(video)) throw new Error(`Falta ${video}: ahí se dibuja el vídeo (un componente de React con «export default»).`);
  mkdirSync(p.medios, { recursive: true });
  const propios = { "@video": video, "@motor/3d": join(SRC, "tres", "index.ts"), "@motor": join(SRC, "api.ts"), ...nombres };
  return bundle({
    entryPoint: join(SRC, entrada),
    publicDir: p.medios,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: { ...(config.resolve?.alias ?? {}), ...propios },
        // el vídeo vive en proyectos/, fuera de motor/: sus «import "react"» se resuelven con los paquetes del taller
        modules: [join(TALLER, "node_modules"), ...(config.resolve?.modules ?? ["node_modules"])],
      },
    }),
  });
}

/** con tarjeta gráfica (lo normal) o sin ella («--cpu», si un dibujo sale distinto o falla) */
export const opcionesDeChromium = (sinTarjeta) => (sinTarjeta ? {} : { gl: "angle" });
