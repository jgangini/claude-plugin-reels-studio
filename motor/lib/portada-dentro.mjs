// La portada, dentro del vídeo. En un reel, la portada que eligió el creador va también en el último fotograma del
// vídeo entregado: en Shorts (y en algunas cuentas de TikTok) la portada solo se puede elegir entre los fotogramas del
// vídeo, y así está siempre a mano sin gastar el arranque, que es del gancho. Es cosa de la entrega: el vídeo que se
// mide, se acepta y se juzga no la lleva, y la firma no cambia. La imagen se vuelve a comprimir una vez (crf 14) porque
// un fotograma no se puede pegar a un mp4 sin tocarlo; el sonido se copia tal cual.
//
// Cuántos fotogramas: PORTADA_DENTRO en lib/perfiles.mjs (reel: 1; YouTube y LinkedIn: ninguno, ahí la portada se sube
// como imagen). video.json → "portadaAlFinal": 0 la quita de un vídeo, y un número la alarga (en fotogramas).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TALLER } from "./taller.mjs";
import { shaArchivo } from "./firma.mjs";
import { PORTADA_DENTRO } from "./perfiles.mjs";

const salidaDe = (p) => path.join(TALLER, "salida", `${p.slug}.mp4`);
const limpioDe = (p) => path.join(p.dir, "revision", `${p.slug}.mp4`);
const entregaJson = (p) => path.join(p.dir, "revision", "entrega.json");
const leerEntrega = (p) => { try { return JSON.parse(fs.readFileSync(entregaJson(p), "utf-8")); } catch { return null; } };

/** cuántos fotogramas de portada lleva al final el vídeo entregado (0: ninguno) */
export function fotogramasDePortada(p) {
  const n = Number(p.video.portadaAlFinal ?? PORTADA_DENTRO[p.perfil.id] ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** la portada que eligió el creador (portada.mjs --elegir), o null si todavía no hay ninguna */
export function portadaElegida(p) {
  const C = path.join(p.dir, "revision", "portadas");
  let e = null;
  try { e = JSON.parse(fs.readFileSync(path.join(C, "portadas.json"), "utf-8")); } catch { return null; }
  const v = e?.elegida && e.variantes.find((x) => x.letra === e.elegida.letra);
  if (!v || !fs.existsSync(path.join(C, v.png))) return null;
  return { letra: v.letra, png: path.join(C, v.png), palabras: e.elegida.palabras };
}

function sonda(f) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=width,height,r_frame_rate,pix_fmt,color_range,color_space,nb_read_packets", "-of", "json", f], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`ffprobe falló con ${f}: ${(r.stderr || "").trim().split("\n").slice(-2).join(" ")}`);
  const s = JSON.parse(r.stdout).streams[0];
  return { ancho: s.width, alto: s.height, fps: s.r_frame_rate, formato: s.pix_fmt, rango: s.color_range, matriz: s.color_space, fotogramas: Number(s.nb_read_packets) };
}

/** escribe en `salida` el vídeo `mp4` con la imagen `png` en sus `n` últimos fotogramas; el sonido se copia */
export function ponerPortada(mp4, png, salida, n = 1) {
  const v = sonda(mp4);
  const plena = v.rango === "pc" || v.formato.startsWith("yuvj");
  // la imagen pasa a los mismos colores del vídeo (su matriz y su rango): la portada se ve igual dentro que fuera
  const matriz = v.matriz === "bt709" ? "bt709" : "bt601";
  const filtro = [
    `[1:v]scale=${v.ancho}:${v.alto}:flags=lanczos:out_color_matrix=${matriz}:out_range=${plena ? "pc" : "tv"},format=${v.formato},setsar=1,fps=${v.fps},trim=end_frame=${n},setpts=PTS-STARTPTS[p]`,
    `[0:v]setsar=1[v]`,
    `[v][p]concat=n=2:v=1:a=0[o]`,
  ].join(";");
  const [num, den = 1] = v.fps.split("/").map(Number);
  const tmp = salida.replace(/\.mp4$/, `.tmp-${process.pid}.mp4`);
  const r = spawnSync("ffmpeg", [
    "-v", "error", "-y", "-i", mp4, "-loop", "1", "-framerate", v.fps, "-t", String(((n + 2) * den) / num), "-i", png,
    "-filter_complex", filtro, "-map", "[o]", "-map", "0:a?",
    // la portada cae en un fotograma clave: quien la busca arrastrando hasta el final la encuentra entera
    "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-pix_fmt", v.formato, "-force_key_frames", `expr:gte(n,${v.fotogramas})`,
    ...(plena ? ["-color_range", "pc"] : []), ...(v.matriz && v.matriz !== "unknown" ? ["-colorspace", v.matriz] : []),
    "-c:a", "copy", "-movflags", "+faststart", tmp,
  ], { encoding: "utf-8", maxBuffer: 1 << 26 });
  if (r.status !== 0) { fs.rmSync(tmp, { force: true }); throw new Error(`ffmpeg falló al poner la portada: ${(r.stderr || "").trim().split("\n").slice(-3).join(" ")}`); }
  const hecho = sonda(tmp);
  if (hecho.fotogramas !== v.fotogramas + n) { fs.rmSync(tmp, { force: true }); throw new Error(`El vídeo con la portada tiene ${hecho.fotogramas} fotogramas y tenía que tener ${v.fotogramas + n}: no se entrega así.`); }
  fs.renameSync(tmp, salida);
  return salida;
}

const apunta = (p, limpio, salida, portada) => fs.writeFileSync(entregaJson(p), JSON.stringify({
  esquema: 1, fecha: new Date().toISOString(), limpio: shaArchivo(limpio), salida: shaArchivo(salida), portada,
}, null, 1) + "\n");

/** la entrega (render.mjs --final): deja `limpio` en salida/, con la portada elegida al final si su formato la lleva dentro */
export function entregar(p, limpio) {
  const salida = salidaDe(p);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const n = fotogramasDePortada(p), elegida = n ? portadaElegida(p) : null;
  if (elegida) ponerPortada(limpio, elegida.png, salida, n);
  else fs.copyFileSync(limpio, salida);
  apunta(p, limpio, salida, elegida ? { letra: elegida.letra, fotogramas: n, sha256: shaArchivo(elegida.png) } : null);
  const nota = elegida ? `lleva la portada ${elegida.letra.toUpperCase()} en su último fotograma`
    : n ? `sale sin la portada dentro: todavía no hay ninguna elegida; al elegirla («node motor/portada.mjs ${p.slug} --elegir …») se le pone` : null;
  return { salida, nota };
}

/** pone la portada elegida en el vídeo que ya está en salida/ (portada.mjs, al elegirla o con --dentro) */
export function portadaAlEntregado(p) {
  const n = fotogramasDePortada(p);
  if (!n) return { hecho: false, motivo: p.video.portadaAlFinal !== undefined ? "este vídeo pide no llevar la portada dentro (video.json → portadaAlFinal)" : `en ${p.perfil.red} la portada se sube como imagen: no va dentro del vídeo` };
  const elegida = portadaElegida(p);
  if (!elegida) return { hecho: false, motivo: "todavía no hay una portada elegida por el creador" };
  const salida = salidaDe(p), limpio = limpioDe(p);
  if (!fs.existsSync(salida)) return { hecho: false, motivo: "el vídeo todavía no está entregado: la portada se le pone al entregarlo (render.mjs --final)" };
  // solo se toca lo entregado: la copia de revision/ tiene que ser, byte a byte, el vídeo que se entregó
  const e = leerEntrega(p), sha = fs.existsSync(limpio) ? shaArchivo(limpio) : null;
  if (!sha || (e ? e.limpio !== sha : shaArchivo(salida) !== sha)) return { hecho: false, motivo: `revision/${p.slug}.mp4 ya no es el vídeo que se entregó: la portada entra en la próxima entrega (render.mjs --final)` };
  ponerPortada(limpio, elegida.png, salida, n);
  apunta(p, limpio, salida, { letra: elegida.letra, fotogramas: n, sha256: shaArchivo(elegida.png) });
  return { hecho: true, salida, letra: elegida.letra, fotogramas: n };
}
