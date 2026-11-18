// Las escenas de un vídeo y lo que el creador ha aceptado de cada una. Una escena es un tramo con nombre (el gancho,
// las ramas, el cierre): el creador las ve de una en una, en el chat, y dice cuáles acepta. Lo aceptado se guarda como
// imágenes: mientras los fotogramas de una escena sigan siendo los mismos, sigue aceptada; si cambian, se le vuelve a
// enseñar esa escena y solo esa. Lo usan motor/escenas.mjs (las saca y apunta la aceptación) y motor/jueces.mjs (no
// sella un candidato con escenas sin aceptar, y le da los fotogramas quietos al juez de arte antes de animar).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { llano } from "./taller.mjs";

export const carpetaEscenas = (dirVideo) => path.join(dirVideo, "revision", "escenas");
const leerJson = (f) => JSON.parse(fs.readFileSync(f, "utf-8"));

/** las frases de la voz, con cuándo empieza cada una, cuándo empieza la siguiente (fin) y cuándo se acaba de decir (finVoz) */
export function frasesDe(p) {
  const ws = p.datos.palabras;
  if (!ws.length) throw new Error(`Todavía no hay voz («node motor/voz.mjs ${p.slug}»): sin voz no hay escenas ni vídeo que juzgar.`);
  const out = [];
  let desde = 0;
  ws.forEach((w, i) => {
    const cierra = /[.!?…]["»”)]*$/.test(w.texto);
    const abre = ws[i + 1] && /^[¿¡"«“(]/.test(ws[i + 1].texto);
    if (cierra || abre || i === ws.length - 1) {
      out.push({ inicio: ws[desde].inicio, finVoz: w.fin, texto: ws.slice(desde, i + 1).map((x) => x.texto).join(" ") });
      desde = i + 1;
    }
  });
  return out.map((f, i) => ({ id: `frase-${String(i + 1).padStart(2, "0")}`, inicio: +f.inicio.toFixed(3), fin: +(out[i + 1]?.inicio ?? p.datos.duracion).toFixed(3), finVoz: +f.finVoz.toFixed(3), texto: f.texto }));
}

/** «desde» de una escena: segundos (4.2), una frase («frase-03») o una palabra de la voz («Después», «agente#2») */
function segundoDe(desde, p, fr, donde) {
  if (typeof desde === "number" && Number.isFinite(desde)) return desde;
  if (typeof desde !== "string" || !desde.trim()) throw new Error(`${donde}: «desde» tiene que ser un segundo, una frase («frase-03») o una palabra de la voz («Después», «agente#2»).`);
  const f = fr.find((x) => x.id === desde);
  if (f) return f.inicio;
  const [palabra, vez] = desde.split("#");
  const todas = p.datos.palabras.filter((w) => llano(w.texto) === llano(palabra));
  const w = todas[(Number(vez) || 1) - 1];
  if (!w) throw new Error(`${donde}: la voz no dice «${palabra}»${vez ? ` ${vez} veces` : ""} (se compara sin tildes, mayúsculas ni signos; mira palabras.json).`);
  return w.inicio;
}

/**
 * Las escenas del vídeo. Salen de escenas.json (una lista de { "id", "titulo", "desde", "fotos"? }) o, si no existe,
 * de las frases de la voz (una escena por frase). Cada una lleva los segundos de sus fotogramas: de cada frase que cae
 * en ella, la mitad de la frase y el momento en que se acaba de decir (cuando lo que cuenta ya está dibujado); y los
 * que hagan falta para que no queden más de HUECO segundos seguidos sin fotograma: lo que solo se ve un rato (una cifra,
 * una placa) también tiene que estar en la hoja que ve el creador.
 */
export const HUECO = 2.5;
function sinHuecos(tiempos, desde, hasta) {
  const b = [desde, ...tiempos, hasta], out = [...tiempos];
  for (let i = 1; i < b.length; i++) {
    const hueco = b[i] - b[i - 1], n = Math.ceil(hueco / HUECO) - 1;
    for (let k = 1; k <= n; k++) out.push(b[i - 1] + (hueco * k) / (n + 1));
  }
  return out;
}
export function escenasDe(p) {
  const fr = frasesDe(p);
  const dur = p.datos.duracion;
  const f = path.join(p.dir, "escenas.json");
  let lista;
  if (fs.existsSync(f)) {
    const crudo = leerJson(f);
    if (!Array.isArray(crudo) || !crudo.length) throw new Error("escenas.json tiene que ser una lista de escenas: { \"id\", \"titulo\", \"desde\" }.");
    lista = crudo.map((e, i) => {
      const donde = `escenas.json, escena ${i + 1}`;
      if (!e || typeof e.id !== "string" || !/^[a-z0-9-]+$/.test(e.id)) throw new Error(`${donde}: «id» en minúsculas, números y guiones (es el nombre con el que el creador la acepta).`);
      return { id: e.id, titulo: typeof e.titulo === "string" && e.titulo.trim() ? e.titulo.trim() : e.id, desde: i === 0 && e.desde === undefined ? 0 : segundoDe(e.desde, p, fr, donde), fotos: Array.isArray(e.fotos) ? e.fotos.map(Number) : null };
    });
    if (lista[0].desde > 0.5) throw new Error("escenas.json: la primera escena empieza en 0 (el vídeo entero tiene que quedar repartido en escenas).");
    lista[0].desde = 0;
    if (new Set(lista.map((e) => e.id)).size !== lista.length) throw new Error("escenas.json: hay dos escenas con el mismo «id».");
    lista.forEach((e, i) => { if (i && e.desde <= lista[i - 1].desde) throw new Error(`escenas.json: «${e.id}» empieza en ${e.desde.toFixed(2)} s, antes que «${lista[i - 1].id}»: van en orden.`); });
  } else {
    lista = fr.map((x, i) => ({ id: x.id, titulo: x.texto.length > 46 ? `${x.texto.slice(0, 44)}…` : x.texto, desde: i === 0 ? 0 : x.inicio, fotos: null }));
  }
  const tope = Math.max(0, dur - 0.12); // el último fotograma del vídeo está un poco antes de su duración
  return lista.map((e, i) => {
    const hasta = lista[i + 1]?.desde ?? dur;
    const suyas = fr.filter((x) => (x.inicio + x.fin) / 2 >= e.desde && (x.inicio + x.fin) / 2 < hasta);
    const tiempos = e.fotos ?? suyas.flatMap((x) => [(x.inicio + x.fin) / 2, Math.min(x.finVoz, hasta - 0.05)]);
    if (!tiempos.length) tiempos.push((e.desde + hasta) / 2);
    const base = [...new Set(tiempos.map((t) => +Math.min(tope, Math.max(0, t)).toFixed(2)))].sort((a, b) => a - b);
    const fotos = [...new Set(sinHuecos(base, e.desde, Math.min(hasta, tope)).map((t) => +t.toFixed(2)))].sort((a, b) => a - b).filter((t, k, a) => k === 0 || t - a[k - 1] >= 0.15);
    return { id: e.id, titulo: e.titulo, desde: +e.desde.toFixed(2), hasta: +hasta.toFixed(2), frases: suyas.map((x) => x.id), fotos };
  });
}

/** ¿son la misma imagen? (se comparan los píxeles, no los bytes); umbral en dB: 48 entre dos PNG del motor, 36 contra un fotograma de un mp4 */
export function igual(a, b, umbral = 48) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", a, "-i", b, "-lavfi", "psnr", "-f", "null", "-"], { encoding: "utf-8" });
  const m = /average:([\d.]+|inf)/.exec(r.stderr || "");
  return !!m && (m[1] === "inf" || parseFloat(m[1]) >= umbral);
}

/** lo que el creador ha aceptado: { escenas: { id: { fecha, palabras, fotos: [{ segundo, archivo }] } } } */
export function leerAceptaciones(dirVideo) {
  const f = path.join(carpetaEscenas(dirVideo), "aceptaciones.json");
  return fs.existsSync(f) ? leerJson(f) : { esquema: 1, escenas: {} };
}

/** el estado que dejó la última pasada de escenas.mjs, o null */
export function leerEstadoEscenas(dirVideo) {
  const f = path.join(carpetaEscenas(dirVideo), "estado.json");
  return fs.existsSync(f) ? leerJson(f) : null;
}

/**
 * ¿Están todas las escenas aceptadas para el vídeo tal como está ahora? Devuelve { ok, motivo }. jueces.mjs --preparar
 * lo pide antes de sellar: los ojos del creador van antes que una ronda de jueces.
 */
export function escenasAceptadas(dirVideo, firmaActual, slug) {
  const e = leerEstadoEscenas(dirVideo);
  const pide = `«node motor/escenas.mjs ${slug}» y enséñale al creador, en el chat, las escenas que falten`;
  if (!e) return { ok: false, motivo: `el creador todavía no ha visto las escenas: ${pide}` };
  if (e.firma !== firmaActual || !e.completo) return { ok: false, motivo: `las escenas son de otra versión del vídeo (o solo de algunas): ${pide}` };
  const faltan = e.escenas.filter((x) => x.estado !== "aceptada");
  if (faltan.length) return { ok: false, motivo: `${faltan.length} escenas sin aceptar (${faltan.map((x) => `${x.id}: ${x.estado}`).join(", ")}): enséñaselas al creador en el chat y apunta lo que diga con «node motor/escenas.mjs ${slug} --aceptar <ids> --palabras "…"»` };
  return { ok: true };
}
