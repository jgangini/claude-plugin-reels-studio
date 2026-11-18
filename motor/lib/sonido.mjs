// El volumen con el que sale un vídeo. Las redes igualan el volumen de lo que se sube; si el vídeo ya llega a su nivel
// (unos -14 LUFS), no lo tocan y suena como se revisó. Se mide primero y se corrige después, en dos pasadas de ffmpeg.
import { spawnSync } from "node:child_process";
import { copyFileSync } from "node:fs";

const ffmpeg = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });

function tieneSonido(archivo) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", archivo], { encoding: "utf-8" });
  return r.status === 0 && r.stdout.trim() !== "";
}

/**
 * Deja en `salida` el vídeo de `entrada` con el sonido a su nivel de publicación. La imagen no se vuelve a comprimir.
 * `ajustes` viene de video.json → "sonido": { "lufs": -14, "pico": -1.5 }. Devuelve una frase que dice qué hizo.
 */
export function nivelar(entrada, salida, ajustes = {}) {
  const objetivo = ajustes.lufs ?? -14, pico = ajustes.pico ?? -1.5;
  if (!tieneSonido(entrada)) {
    copyFileSync(entrada, salida);
    return "el vídeo no lleva sonido: se deja tal cual";
  }
  const base = `loudnorm=I=${objetivo}:TP=${pico}:LRA=11`;
  const medida = ffmpeg(["-i", entrada, "-vn", "-af", `${base}:print_format=json`, "-f", "null", "-"]);
  const json = /\{[^{}]*"input_i"[^{}]*\}/.exec(medida.stderr ?? "");
  if (medida.status !== 0 || !json) throw new Error(`No se pudo medir el volumen del vídeo: ${(medida.stderr ?? "").trim().split("\n").pop()}`);
  const m = JSON.parse(json[0]);
  const filtro = `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const hecho = ffmpeg(["-i", entrada, "-c:v", "copy", "-af", filtro, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", salida]);
  if (hecho.status !== 0) throw new Error(`No se pudo ajustar el volumen: ${(hecho.stderr ?? "").trim().split("\n").pop()}`);
  return `volumen: medía ${Number(m.input_i).toFixed(1)} LUFS y sale a ${objetivo} (pico máximo ${pico} dB)`;
}
