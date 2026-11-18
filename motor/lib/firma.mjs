// La firma de un vídeo: un resumen (sha256) de todo lo que decide cómo se ve y cómo suena. Si cambia una letra del
// video.tsx, del guion, de la voz, de un sonido o del motor, cambia la firma, y los dictámenes de los jueces que
// citaban la firma anterior dejan de valer. Es lo que hace honesta la revisión: se aprueba este vídeo, no «uno parecido».
// Del motor solo cuenta lo que el vídeo usa: el kit 3D (motor/src/tres/) entra en la firma solo si su video.tsx importa
// «@motor/3d», para que una mejora del 3D no deje sin medidas ni veredicto a un vídeo en 2D que no lo toca.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TALLER } from "./taller.mjs";
import { perfilDe } from "./perfiles.mjs";

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
export const shaArchivo = (f) => sha(fs.readFileSync(f));

/** todos los archivos de una carpeta, en orden, con su ruta relativa con barras */
export function archivosDe(dir, filtro = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const anda = (d) => {
    for (const n of fs.readdirSync(d).sort()) {
      const f = path.join(d, n);
      if (fs.statSync(f).isDirectory()) anda(f);
      else if (filtro(f)) out.push(f);
    }
  };
  anda(dir);
  return out;
}

const rel = (base, f) => path.relative(base, f).split(path.sep).join("/");

/** lo que entra en la firma de un vídeo: sus archivos de decisión, sus medios, el código del motor que los dibuja y su perfil de formato */
export function entradas(dirVideo) {
  const propios = ["video.tsx", "video.json", "guion.txt", "subtitulos.txt", "palabras.json", "sonidos.json", "hechos.json"]
    .map((n) => path.join(dirVideo, n)).filter(fs.existsSync);
  const medios = archivosDe(path.join(dirVideo, "medios"));
  const tsx = path.join(dirVideo, "video.tsx");
  const usa3d = fs.existsSync(tsx) && fs.readFileSync(tsx, "utf-8").includes("@motor/3d");
  const kit3d = path.join(TALLER, "motor", "src", "tres") + path.sep;
  const motor = archivosDe(path.join(TALLER, "motor", "src"), (f) => usa3d || !f.startsWith(kit3d));
  // el perfil de su formato (tamaño, zonas, letra, subtítulos): si la red cambia algo, lo medido y lo juzgado deja de valer
  let perfil = null;
  try { perfil = perfilDe(JSON.parse(fs.readFileSync(path.join(dirVideo, "video.json"), "utf-8"))); } catch { /* sin video.json legible no hay perfil que firmar */ }
  return [
    ...[...propios, ...medios].map((f) => ({ archivo: rel(dirVideo, f), sha256: shaArchivo(f) })),
    ...motor.map((f) => ({ archivo: "@motor/" + rel(path.join(TALLER, "motor", "src"), f), sha256: shaArchivo(f) })),
    ...(perfil ? [{ archivo: `@perfil/${perfil.id}`, sha256: sha(JSON.stringify(perfil)) }] : []),
  ];
}

/** la firma: sha256 de la lista de archivos y sus sha256 */
export function firma(dirVideo) {
  const lista = entradas(dirVideo);
  return { sha256: sha(lista.map((e) => `${e.archivo}=${e.sha256}`).join("\n")), archivos: lista };
}

/** la carpeta de los jueces de un vídeo */
export const carpetaJueces = (dirVideo) => path.join(dirVideo, "revision", "jueces");

/**
 * ¿Hay un veredicto de los jueces que valga para el vídeo tal como está ahora? Devuelve { ok, motivo, veredicto }.
 * render.mjs --final lo pide antes de dejar el vídeo en salida/.
 */
export function veredictoVigente(dirVideo) {
  const f = path.join(carpetaJueces(dirVideo), "veredicto.json");
  if (!fs.existsSync(f)) return { ok: false, motivo: "no hay veredicto de los jueces (node motor/jueces.mjs <vídeo> --veredicto)" };
  const v = JSON.parse(fs.readFileSync(f, "utf-8"));
  const actual = firma(dirVideo).sha256;
  if (v.firma !== actual) return { ok: false, motivo: `el veredicto es de otra versión del vídeo (firma ${v.firma.slice(0, 12)}…, ahora ${actual.slice(0, 12)}…): el vídeo cambió después de aprobarse. Vuelve a renderizar, --preparar y a pasar los jueces.`, veredicto: v };
  if (v.resultado !== "aprobado") return { ok: false, motivo: `el veredicto dice «${v.resultado}»`, veredicto: v };
  return { ok: true, veredicto: v };
}
