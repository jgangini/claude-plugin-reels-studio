// La voz de un vídeo y el segundo exacto en que dice cada palabra. Todo va por OpenRouter, con la clave de quien usa el
// taller (node motor/clave.mjs): un modelo dice el guion y otro lo escucha y devuelve cuándo suena cada palabra.
// Cuesta céntimos por vídeo.
//
//   node motor/voz.mjs <vídeo>                    dice guion.txt → medios/voz.mp3 y palabras.json
//   node motor/voz.mjs <vídeo> --toma mi-voz.mp3  usa una grabación ya hecha (la del creador) en vez de generarla
//   node motor/voz.mjs <vídeo> --tiempos          vuelve a sacar los tiempos de la voz que ya hay, sin generarla
//
// La voz se elige en video.json → "voz": { "modelo": "elevenlabs/eleven-v4", "id": "<la voz>", "velocidad": 1,
// "idioma": "es", "oyente": "openai/whisper-large-v3", "cola": 0.6 }. En guion.txt, «(pausa 1,5)» deja un silencio de
// esos segundos en ese punto. Al acabar dice cuánto se parece lo que se oye a lo que está escrito: si la voz se comió
// una frase o dijo otra cosa, se ve ahí antes de animar nada.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { argumentos } from "./lib/argumentos.mjs";
import { emparejar } from "./lib/parecido.mjs";
import { carpetaDe, claveOpenRouter, guionDe, llano, VOZ_DE_PARTIDA } from "./lib/taller.mjs";

const { args, opt, flag } = argumentos();
const dir = carpetaDe(args[0]);
const video = JSON.parse(readFileSync(join(dir, "video.json"), "utf-8"));
const voz = { ...VOZ_DE_PARTIDA, oyente: "openai/whisper-large-v3", cola: 0.6, ...(video.voz ?? {}) };
const guion = guionDe(dir);
if (!guion.texto) throw new Error("guion.txt está vacío: primero el guion, aprobado por el creador.");
const OPENROUTER = "https://openrouter.ai/api/v1";
const cruda = join(dir, "voz.cruda.mp3"), final = join(dir, "medios", "voz.mp3");
mkdirSync(join(dir, "medios"), { recursive: true });

function ffmpeg(parametros, que) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", ...parametros], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`ffmpeg no pudo ${que}: ${(r.stderr ?? "").trim().split("\n").pop()}`);
}
const duracionDe = (archivo) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo], { encoding: "utf-8" }).stdout);

async function pedir(ruta, opciones, que) {
  const r = await fetch(`${OPENROUTER}${ruta}`, { ...opciones, headers: { Authorization: `Bearer ${claveOpenRouter()}`, ...(opciones.headers ?? {}) }, signal: AbortSignal.timeout(300000) });
  if (!r.ok) throw new Error(`OpenRouter no pudo ${que} (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return r;
}

/** un modelo dice el texto; devuelve el mp3 */
async function decir(texto) {
  const r = await pedir("/audio/speech", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: voz.modelo, voice: voz.id, input: texto, response_format: "mp3", speed: voz.velocidad }),
  }, "hacer la voz");
  return Buffer.from(await r.arrayBuffer());
}

/** otro modelo escucha el mp3; devuelve lo que oye, palabra a palabra, con sus segundos */
async function escuchar(mp3) {
  const formulario = new FormData();
  formulario.append("file", new Blob([readFileSync(mp3)], { type: "audio/mpeg" }), "voz.mp3");
  formulario.append("model", voz.oyente);
  formulario.append("response_format", "verbose_json");
  formulario.append("timestamp_granularities[]", "word");
  if (voz.idioma) formulario.append("language", voz.idioma);
  const oido = await (await pedir("/audio/transcriptions", { method: "POST", body: formulario }, "escuchar la voz")).json();
  const palabras = (oido.words ?? []).map((w) => ({ texto: String(w.word ?? "").trim(), inicio: Number(w.start), fin: Number(w.end) })).filter((w) => llano(w.texto) && Number.isFinite(w.inicio));
  if (!palabras.length) throw new Error(`El modelo que escucha (${voz.oyente}) no devolvió el tiempo de cada palabra. Prueba otro en video.json → "voz": { "oyente": "…" }.`);
  return palabras;
}

/**
 * Empareja las palabras del guion con las oídas, en orden (la subsecuencia común más larga). A cada palabra del guion
 * que se oyó tal cual le toca su tiempo; a las que no (una cifra escrita con números, un nombre raro), el hueco entre
 * sus vecinas, repartido según lo largas que son. Devuelve las palabras con sus tiempos y cuántas se oyeron.
 */
function alinear(escritas, oidas, total) {
  const pareja = emparejar(escritas.map(llano), oidas.map((w) => llano(w.texto)));
  const salida = escritas.map((texto, i) => (pareja[i] >= 0 ? { texto, inicio: oidas[pareja[i]].inicio, fin: oidas[pareja[i]].fin } : { texto, inicio: null, fin: null }));
  // los tramos sin pareja: entre el final de la anterior con tiempo y el principio de la siguiente con tiempo
  for (let i = 0; i < salida.length; i++) {
    if (salida[i].inicio !== null) continue;
    let hasta = i;
    while (hasta < salida.length && salida[hasta].inicio === null) hasta++;
    const desde = i ? salida[i - 1].fin : 0, tope = hasta < salida.length ? salida[hasta].inicio : total;
    const letras = salida.slice(i, hasta).map((p) => Math.max(1, llano(p.texto).length)), suma = letras.reduce((x, y) => x + y, 0);
    let reloj = desde;
    for (let k = i; k < hasta; k++) {
      const dura = (Math.max(0, tope - desde) * letras[k - i]) / suma;
      salida[k].inicio = reloj; salida[k].fin = reloj + dura * 0.92; reloj += dura;
    }
    i = hasta - 1;
  }
  // siempre hacia delante, y ninguna palabra dura menos de 4 centésimas
  let previo = 0;
  for (const p of salida) {
    p.inicio = Math.max(previo, p.inicio); p.fin = Math.max(p.inicio + 0.04, p.fin); previo = p.inicio;
    p.inicio = Math.round(p.inicio * 1000) / 1000; p.fin = Math.round(p.fin * 1000) / 1000;
  }
  return { palabras: salida, oidas: pareja.filter((j) => j >= 0).length, sinOir: escritas.filter((_, i) => pareja[i] < 0) };
}

/** mete los silencios de «(pausa n)» en el audio, cortando en el hueco que sigue a cada palabra, y corre los tiempos */
function conPausas(origen, destino, palabras) {
  const cortes = Object.entries(guion.pausas).map(([n, segundos]) => ({ n: Number(n), segundos })).filter((c) => c.n < palabras.length - 1).sort((x, y) => x.n - y.n);
  if (!cortes.length) { copyFileSync(origen, destino); return palabras; }
  const puntos = cortes.map((c) => (palabras[c.n].fin + palabras[c.n + 1].inicio) / 2);
  const trozos = [`[0:a]asplit=${puntos.length + 1}${[0, ...puntos].map((_, i) => `[p${i}]`).join("")}`], orden = [];
  [0, ...puntos].forEach((desde, i) => {
    trozos.push(`[p${i}]atrim=start=${desde}${i < puntos.length ? `:end=${puntos[i]}` : ""},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=mono[t${i}]`);
    orden.push(`[t${i}]`);
    if (i < cortes.length) { trozos.push(`anullsrc=r=44100:cl=mono,atrim=duration=${cortes[i].segundos}[s${i}]`); orden.push(`[s${i}]`); }
  });
  ffmpeg(["-i", origen, "-filter_complex", `${trozos.join(";")};${orden.join("")}concat=n=${orden.length}:v=0:a=1[a]`, "-map", "[a]", "-c:a", "libmp3lame", "-q:a", "2", destino], "meter las pausas en la voz");
  let corrido = 0, siguiente = 0;
  return palabras.map((p, n) => {
    const movida = { ...p, inicio: Math.round((p.inicio + corrido) * 1000) / 1000, fin: Math.round((p.fin + corrido) * 1000) / 1000 };
    if (siguiente < cortes.length && cortes[siguiente].n === n) corrido += cortes[siguiente++].segundos;
    return movida;
  });
}

// ---- de dónde sale el audio ----
if (opt("--toma")) {
  const toma = resolve(opt("--toma"));
  if (!existsSync(toma)) throw new Error(`No encuentro la grabación ${toma}.`);
  ffmpeg(["-i", toma, "-vn", "-c:a", "libmp3lame", "-q:a", "2", cruda], "leer la grabación");
  console.log("voz: la grabación del creador");
} else if (flag("--tiempos")) {
  if (!existsSync(cruda)) throw new Error("Todavía no hay voz que volver a medir (falta voz.cruda.mp3): lánzalo sin --tiempos.");
} else {
  console.log(`voz: ${voz.modelo}, voz «${voz.id}», ${guion.texto.split(/\s+/).length} palabras…`);
  writeFileSync(cruda, await decir(guion.texto));
}

// ---- cuándo se dice cada palabra ----
const escritas = guion.texto.split(/\s+/).filter((trozo) => llano(trozo));
const oidas = await escuchar(cruda);
const hecho = alinear(escritas, oidas, duracionDe(cruda));
const palabras = conPausas(cruda, final, hecho.palabras);
const duracion = Math.round((duracionDe(final) + voz.cola) * 1000) / 1000;
writeFileSync(join(dir, "palabras.json"), JSON.stringify({ duracion, palabras }, null, 1) + "\n");
rmSync(join(dir, "medios", "sonidos.wav"), { force: true }); // los sonidos se mezclaron con otros tiempos: hay que volver a mezclarlos

const parecido = Math.round((100 * hecho.oidas) / escritas.length);
console.log(`${escritas.length} palabras en ${duracion.toFixed(1)} s → palabras.json y medios/voz.mp3`);
console.log(`Se oye el ${parecido} % de lo escrito, palabra por palabra.${hecho.sinOir.length ? ` Sin oír tal cual: ${hecho.sinOir.slice(0, 12).join(", ")}${hecho.sinOir.length > 12 ? "…" : ""}` : ""}`);
if (parecido < 90) console.log("AVISO: es poco. Escucha la voz (o repásala con el creador): puede haberse comido una frase o haber leído mal un nombre o una cifra. Las cifras escritas con números suelen salir aquí sin ser un fallo.");
const ultima = oidas[oidas.length - 1];
if (duracionDe(cruda) - ultima.fin > 2.5) console.log(`AVISO: después de la última palabra quedan ${(duracionDe(cruda) - ultima.fin).toFixed(1)} s de audio sin palabras.`);
console.log(`Si había sonidos mezclados, vuelve a mezclarlos: node motor/sonidos.mjs mezclar ${args[0]}`);
