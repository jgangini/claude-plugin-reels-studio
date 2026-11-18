// Láminas: varias imágenes del vídeo juntas en una sola, para mirarlas de un vistazo (y para que un juez las lea
// gastando poco). Todo se hace con ffmpeg: no hay más dependencias.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TALLER } from "./taller.mjs";

/** la letra de los rótulos, escrita como la quiere un filtro de ffmpeg (los dos puntos de «C:» van escapados) */
export const FUENTE = join(TALLER, "motor", "letra", "Figtree-Bold.ttf").replaceAll("\\", "/").replace(":", "\\:");
const paraFiltro = (ruta) => ruta.replaceAll("\\", "/").replace(":", "\\:");

function ffmpeg(args, que) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", ...args], { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg no pudo ${que}: ${(r.stderr ?? "").trim().split("\n").slice(-2).join(" ")}`);
  return r;
}

/**
 * Una lámina con varias fotos y, sobre cada una, su segundo. `fotos` es una lista de { s, output } (el segundo y el
 * archivo de la imagen); todas tienen el mismo tamaño. Devuelve la ruta de la lámina.
 */
export function lamina(fotos, destino, { ancho = 480 } = {}) {
  if (!fotos.length) throw new Error("No hay ninguna foto que poner en la lámina.");
  const columnas = fotos.length <= 3 ? fotos.length : fotos.length <= 8 ? Math.ceil(fotos.length / 2) : 5;
  const filas = Math.ceil(fotos.length / columnas);
  const celdas = fotos.map((foto, i) =>
    `[${i}:v]scale=${ancho}:-2,drawbox=x=0:y=0:w=iw:h=30:color=black@0.7:t=fill,drawtext=fontfile='${FUENTE}':text='${String(foto.s).replace(/[^0-9.,a-zA-Z -]/g, "")} s':x=10:y=5:fontsize=20:fontcolor=yellow[c${i}]`);
  const union = `${fotos.map((_, i) => `[c${i}]`).join("")}concat=n=${fotos.length}:v=1:a=0,tile=${columnas}x${filas}:padding=6:margin=6:color=0x15171c`;
  ffmpeg([...fotos.flatMap((foto) => ["-i", foto.output]), "-filter_complex", `${celdas.join(";")};${union}`, "-frames:v", "1", "-q:v", "3", destino], "montar la lámina");
  return destino;
}

/** escribe un título en una franja encima de una imagen que ya existe */
export function rotular(archivo, titulo) {
  const tmp = mkdtempSync(join(tmpdir(), "lamina-"));
  try {
    // el texto va en un archivo para no pelearse con las comillas del filtro; la imagen nueva, junto a la vieja
    const texto = join(tmp, "titulo.txt"), hecho = `${archivo}.rotulada.jpg`;
    writeFileSync(texto, titulo);
    ffmpeg(["-i", archivo, "-vf", `pad=iw:ih+52:0:52:color=0x15171c,drawtext=fontfile='${FUENTE}':textfile='${paraFiltro(texto)}':x=14:y=12:fontsize=26:fontcolor=white`, "-frames:v", "1", "-q:v", "3", hecho], "rotular la lámina");
    rmSync(archivo);
    renameSync(hecho, archivo);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  return archivo;
}

/** los segundos en los que la imagen cambia de golpe (un corte); `umbral` va de 0 a 1 y cuanto más bajo, más sensible */
export function cortesDe(video, umbral = 0.3) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-i", video, "-an", "-vf", `select='gt(scene,${umbral})',metadata=print:file=-`, "-f", "null", "-"], { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg no pudo buscar los cortes de ${video}`);
  const cortes = [];
  for (const m of (r.stdout ?? "").matchAll(/pts_time:([0-9.]+)/g)) {
    const s = Math.round(Number(m[1]) * 100) / 100;
    if (s > 0.2 && (!cortes.length || s - cortes[cortes.length - 1] > 0.25)) cortes.push(s);
  }
  return cortes;
}

/** por cada corte, una tira de diez fotogramas seguidos a 30 por segundo, cinco antes y cinco después */
export function rafagasDe(video, cortes, carpeta) {
  mkdirSync(carpeta, { recursive: true });
  return cortes.map((s) => {
    const destino = join(carpeta, `en-${String(Math.round(s * 1000)).padStart(6, "0")}.jpg`);
    ffmpeg(["-ss", String(Math.max(0, s - 5 / 30)), "-t", String(10 / 30), "-i", video, "-vf", "fps=30,scale=384:-2,tile=5x2:padding=4:color=0x15171c", "-frames:v", "1", "-q:v", "3", destino], `sacar la ráfaga de ${s} s`);
    return destino;
  });
}

/** el vídeo entero en láminas: tres fotogramas por segundo, cada uno con su segundo escrito. Devuelve los archivos */
export function laminasDelVideo(video, carpeta, duracion, ancho, alto) {
  mkdirSync(carpeta, { recursive: true });
  for (const viejo of readdirSync(carpeta).filter((n) => /^lamina-\d+\.jpg$/.test(n))) rmSync(join(carpeta, viejo));
  const apaisado = ancho >= alto, columnas = apaisado ? 4 : 6, filas = apaisado ? 5 : 4, celda = apaisado ? 480 : 270;
  const filtro = `fps=3,scale=${celda}:-2,drawbox=x=0:y=0:w=iw:h=24:color=black@0.7:t=fill,drawtext=fontfile='${FUENTE}':text='%{pts\\:flt}':x=6:y=4:fontsize=16:fontcolor=yellow,tile=${columnas}x${filas}:padding=4:color=0x15171c`;
  ffmpeg(["-i", video, "-an", "-vf", filtro, "-q:v", "4", join(carpeta, "lamina-%02d.jpg")], "montar las láminas del vídeo");
  const hechas = readdirSync(carpeta).filter((n) => /^lamina-\d+\.jpg$/.test(n)).sort().map((n) => join(carpeta, n));
  if (!hechas.length) throw new Error(`No salió ninguna lámina de ${video} (${duracion} s).`);
  return hechas;
}
