// Los sonidos de un vídeo: los pequeños efectos que acompañan a lo que pasa en pantalla (algo que aparece, un golpe,
// un paso de una cosa a otra). No hace falta ninguna clave: unos se fabrican aquí mismo con ffmpeg y otros se buscan
// en Openverse, que solo trae audio con licencia abierta.
//
//   node motor/sonidos.mjs recetas                               los sonidos que se pueden fabricar
//   node motor/sonidos.mjs crear <vídeo> <receta> [nombre]       fabrica uno → medios/sonidos/<nombre>.wav
//                          [--tono 880] [--dura 0.4]
//   node motor/sonidos.mjs buscar "puerta que se cierra"         busca en Openverse (título, autor, licencia, segundos)
//   node motor/sonidos.mjs bajar <vídeo> <id> <nombre>           baja ese sonido y apunta su autor en CREDITOS.md
//   node motor/sonidos.mjs mezclar <vídeo>                       junta lo que dice sonidos.json → medios/sonidos.wav
//
// sonidos.json dice qué suena y cuándo: [{ "sonido": "pop", "en": "ramas", "vez": 1, "mueve": -0.05, "volumen": 0.6 }].
// «en» es una palabra de la voz (suena cuando se dice) o un segundo; «mueve» lo adelanta o lo atrasa unos segundos.
// Los sonidos van bajos: acompañan a la voz, no compiten con ella.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { argumentos } from "./lib/argumentos.mjs";
import { carpetaDe, llano } from "./lib/taller.mjs";

const { args, opt } = argumentos();
const [orden, ...resto] = args;

function ffmpeg(parametros, que) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", ...parametros], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`ffmpeg no pudo ${que}: ${(r.stderr ?? "").trim().split("\n").pop()}`);
}

// Cada receta es una onda escrita como fórmula (t es el segundo; d, lo que dura; f, el tono) y una frase que la describe.
const RECETAS = {
  toque: { dura: 0.35, tono: 880, que: "una nota corta y limpia: algo aparece o se marca", onda: (f) => `sin(2*PI*${f}*t)*exp(-16*t)` },
  campana: { dura: 0.9, tono: 1320, que: "una campanilla: algo sale bien, un resultado", onda: (f) => `(sin(2*PI*${f}*t)+0.45*sin(2*PI*${f * 1.5}*t)+0.2*sin(2*PI*${f * 2.01}*t))*exp(-5*t)*0.6` },
  pop: { dura: 0.22, tono: 520, que: "un «pop»: una burbuja, una pieza que salta a su sitio", onda: (f) => `sin(2*PI*(160+${f}*exp(-28*t))*t)*exp(-13*t)` },
  golpe: { dura: 0.5, tono: 90, que: "un golpe grave: algo pesado cae o se cierra", onda: (f) => `sin(2*PI*(55+${f}*exp(-22*t))*t)*exp(-8*t)` },
  subida: { dura: 0.6, tono: 300, que: "un silbido que sube: algo crece, se llena o arranca", onda: (f, d) => `sin(2*PI*(${f}*t+${(2.2 * f) / d}*t*t))*min(1,12*t)*min(1,10*(${d}-t))*0.7` },
  bajada: { dura: 0.6, tono: 900, que: "un silbido que baja: algo se apaga, se vacía o falla", onda: (f, d) => `sin(2*PI*(${f}*t-${(0.38 * f) / d}*t*t))*min(1,12*t)*min(1,10*(${d}-t))*0.7` },
  barrido: { dura: 0.5, tono: 0, que: "un soplo de aire: algo pasa rápido o cambia el plano", ruido: "pink", filtros: (d) => `highpass=f=500,lowpass=f=7000,volume='pow(sin(PI*t/${d}),2)*1.6':eval=frame` },
  clic: { dura: 0.04, tono: 0, que: "un clic seco: una tecla, un botón", ruido: "white", filtros: (d) => `highpass=f=2500,afade=t=out:st=0.004:d=${d - 0.004}` },
};

function crear(dir, receta, nombre) {
  const r = RECETAS[receta];
  if (!r) throw new Error(`No hay ninguna receta «${receta}». Las que hay: ${Object.keys(RECETAS).join(", ")}.`);
  const dura = Number(opt("--dura") ?? r.dura), tono = Number(opt("--tono") ?? r.tono);
  const carpeta = join(dir, "medios", "sonidos");
  mkdirSync(carpeta, { recursive: true });
  const destino = join(carpeta, `${nombre}.wav`);
  const fuente = r.onda ? `aevalsrc='${r.onda(tono, dura)}':d=${dura}:s=48000` : `anoisesrc=d=${dura}:c=${r.ruido}:r=48000:a=0.9`;
  const cadena = [r.filtros ? r.filtros(dura) : null, "alimiter=limit=0.9", "aformat=channel_layouts=stereo"].filter(Boolean).join(",");
  ffmpeg(["-f", "lavfi", "-i", fuente, "-af", cadena, "-c:a", "pcm_s16le", destino], `fabricar el sonido «${receta}»`);
  console.log(`${destino}  (${r.que})`);
}

async function openverse(ruta) {
  const r = await fetch(`https://api.openverse.org/v1/audio/${ruta}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Openverse respondió ${r.status}. Prueba otra vez en un rato, o fabrica el sonido con «crear».`);
  return r.json();
}

async function buscar(texto) {
  if (!texto) throw new Error('Di qué buscas: node motor/sonidos.mjs buscar "campana pequeña"');
  const hallados = (await openverse(`?q=${encodeURIComponent(texto)}&page_size=12`)).results ?? [];
  if (!hallados.length) { console.log("Nada con esas palabras. En inglés suele haber más."); return; }
  for (const s of hallados) console.log(`${s.id}  ${((s.duration ?? 0) / 1000).toFixed(1).padStart(6)} s  ${String(s.license ?? "?").toUpperCase().padEnd(9)} ${String(s.title ?? "").slice(0, 50)} — ${s.creator ?? "sin autor"}`);
  console.log("\nBaja el que encaje con «bajar <vídeo> <id> <nombre>». Los cortos (menos de 3 s) son los que sirven de efecto.");
}

async function bajar(dir, id, nombre) {
  if (!id || !nombre) throw new Error("Uso: node motor/sonidos.mjs bajar <vídeo> <id de Openverse> <nombre>");
  const s = await openverse(`${encodeURIComponent(id)}/`);
  const audio = await fetch(s.url, { signal: AbortSignal.timeout(120000) });
  if (!audio.ok) throw new Error(`No se pudo bajar el sonido (${audio.status}).`);
  const carpeta = join(dir, "medios", "sonidos");
  mkdirSync(carpeta, { recursive: true });
  const bruto = join(carpeta, `_${nombre}.descarga`), destino = join(carpeta, `${nombre}.wav`);
  writeFileSync(bruto, Buffer.from(await audio.arrayBuffer()));
  try { ffmpeg(["-i", bruto, "-vn", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", destino], "convertir el sonido"); } finally { rmSync(bruto, { force: true }); }
  const creditos = join(dir, "CREDITOS.md");
  if (!existsSync(creditos)) writeFileSync(creditos, "# Créditos de los sonidos\n\nCada sonido que no se fabricó aquí, con su autor y su licencia. Si la licencia pide nombrar al autor, va en el texto al publicar.\n\n");
  appendFileSync(creditos, `- \`${nombre}.wav\`: «${s.title}», de ${s.creator ?? "autor desconocido"}. Licencia ${String(s.license).toUpperCase()} ${s.license_version ?? ""}. ${s.foreign_landing_url ?? s.url}\n`);
  console.log(`${destino}\nApuntado en CREDITOS.md: «${s.title}», de ${s.creator ?? "autor desconocido"} (${String(s.license).toUpperCase()}).`);
}

function mezclar(dir) {
  const lista = join(dir, "sonidos.json"), destino = join(dir, "medios", "sonidos.wav");
  const pedidos = existsSync(lista) ? JSON.parse(readFileSync(lista, "utf-8")) : [];
  if (!Array.isArray(pedidos) || !pedidos.length) { rmSync(destino, { force: true }); console.log("sonidos.json no pide ningún sonido: el vídeo va solo con la voz."); return; }
  if (!existsSync(join(dir, "palabras.json"))) throw new Error("Todavía no hay voz: los sonidos se colocan sobre sus palabras (node motor/voz.mjs).");
  const voz = JSON.parse(readFileSync(join(dir, "palabras.json"), "utf-8"));
  const entradas = [], filtros = [];
  pedidos.forEach((pedido, i) => {
    const donde = `sonidos.json, sonido ${i + 1}`;
    const archivo = join(dir, "medios", "sonidos", `${pedido.sonido}.wav`);
    if (!existsSync(archivo)) throw new Error(`${donde}: no existe medios/sonidos/${pedido.sonido}.wav. Fabrícalo («crear») o bájalo («bajar»).`);
    let segundo = pedido.en;
    if (typeof segundo === "string") {
      const veces = voz.palabras.filter((p) => llano(p.texto) === llano(segundo));
      const dicha = veces[(pedido.vez ?? 1) - 1];
      if (!dicha) throw new Error(`${donde}: la voz no dice «${pedido.en}»${pedido.vez ? ` ${pedido.vez} veces` : ""}.`);
      segundo = dicha.inicio;
    }
    if (!Number.isFinite(segundo)) throw new Error(`${donde}: «en» tiene que ser una palabra de la voz o un segundo.`);
    const ms = Math.max(0, Math.round((segundo + (pedido.mueve ?? 0)) * 1000));
    entradas.push("-i", archivo);
    filtros.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${pedido.volumen ?? 0.5},adelay=${ms}:all=1[s${i}]`);
  });
  const junta = `${pedidos.map((_, i) => `[s${i}]`).join("")}amix=inputs=${pedidos.length}:normalize=0:dropout_transition=0,apad,atrim=duration=${voz.duracion}[a]`;
  ffmpeg([...entradas, "-filter_complex", `${filtros.join(";")};${junta}`, "-map", "[a]", "-c:a", "pcm_s16le", destino], "mezclar los sonidos");
  console.log(`${pedidos.length} sonidos mezclados → ${destino}`);
}

if (orden === "recetas") for (const [nombre, r] of Object.entries(RECETAS)) console.log(`${nombre.padEnd(9)} ${r.que}`);
else if (orden === "crear") crear(carpetaDe(resto[0]), resto[1], resto[2] && !resto[2].startsWith("--") ? resto[2] : resto[1]);
else if (orden === "buscar") await buscar(resto.filter((a) => !a.startsWith("--")).join(" "));
else if (orden === "bajar") await bajar(carpetaDe(resto[0]), resto[1], resto[2]);
else if (orden === "mezclar") mezclar(carpetaDe(resto[0]));
else throw new Error("Uso: node motor/sonidos.mjs recetas | crear <vídeo> <receta> [nombre] | buscar \"…\" | bajar <vídeo> <id> <nombre> | mezclar <vídeo>");
