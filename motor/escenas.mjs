// Las escenas, para los ojos del creador: saca los fotogramas de cada escena, los compara con lo que él ya aceptó y deja
// una hoja por escena para enseñársela en el chat. Lo que acepta se guarda; mientras esos fotogramas no cambien, la
// escena sigue aceptada y no se le vuelve a enseñar. No renderiza el vídeo: son fotogramas sueltos (segundos, sin gasto).
//
//   node motor/escenas.mjs <vídeo>                                   todas las escenas → revision/escenas/hoja-<id>.jpg
//   node motor/escenas.mjs <vídeo> --solo gancho,ramas               solo esas (para repasar un arreglo)
//   node motor/escenas.mjs <vídeo> --aceptar gancho,ramas --palabras "lo que dijo el creador"      (o --aceptar todas)
//   node motor/escenas.mjs <vídeo> --estado
//
// Las escenas salen de proyectos/<vídeo>/escenas.json: [{ "id": "gancho", "titulo": "El gancho", "desde": 0 },
// { "id": "ramas", "titulo": "Abre las ramas", "desde": "Después" }, …]. «desde» es un segundo, una frase («frase-03») o
// una palabra de la voz («Después», «agente#2»); "fotos": [3.2, 5.1] fija los segundos que se enseñan. Sin escenas.json,
// cada frase de la voz es una escena. La hoja cubre la escena entera: además de esos segundos, no deja más de 2,5 s
// seguidos sin un fotograma (lo que solo se ve un momento, una cifra o una placa, también tiene que salir en la hoja). La aceptación solo la da el creador, en el chat, y se apunta con sus palabras
// (también en notas.md). jueces.mjs --preparar no sella un candidato con escenas sin aceptar.
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { abrirVideo, TALLER } from "./lib/taller.mjs";
import { argumentos } from "./lib/argumentos.mjs";
import { empaquetar, opcionesDeChromium } from "./lib/empaquetar.mjs";
import { firma } from "./lib/firma.mjs";
import { rotular, lamina } from "./lib/laminas.mjs";
import { carpetaEscenas, escenasDe, igual, leerAceptaciones, leerEstadoEscenas } from "./lib/escenas.mjs";
import { tomarMotor } from "./lib/candado.mjs";

const { args, opt, flag } = argumentos();
const p = abrirVideo(args[0]);
const E = carpetaEscenas(p.dir);
const rel = (f) => path.relative(TALLER, f).split(path.sep).join("/");
const escribirJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1) + "\n");
const ms = (s) => String(Math.round(s * 1000)).padStart(6, "0");
const firmaActual = firma(p.dir).sha256;
const escenas = escenasDe(p);
const pinta = (e) => `${e.estado.padEnd(9)} ${e.id.padEnd(14)} ${e.desde.toFixed(1).padStart(5)}–${e.hasta.toFixed(1).padEnd(5)} s  ${e.titulo}${e.cambiaron?.length ? `  (cambió en ${e.cambiaron.map((s) => `${s} s`).join(", ")})` : ""}`;

function resumen(estado) {
  for (const e of estado.escenas) console.log(pinta(e));
  const n = (x) => estado.escenas.filter((e) => e.estado === x).length;
  console.log(`${n("aceptada")} aceptadas, ${n("cambió")} cambiaron, ${n("pendiente")} pendientes`);
  const faltan = estado.escenas.filter((e) => e.estado !== "aceptada");
  if (faltan.length) console.log(`Enséñale al creador, en el chat, estas hojas (y solo estas): ${faltan.map((e) => rel(path.join(E, e.hoja))).join(", ")}`);
  else console.log("Todas las escenas están aceptadas para el vídeo tal como está ahora.");
}

if (flag("--estado")) {
  const estado = leerEstadoEscenas(p.dir);
  if (!estado) { console.log(`Todavía no se han sacado las escenas: node motor/escenas.mjs ${p.slug}`); process.exit(1); }
  if (estado.firma !== firmaActual) console.log("AVISO: el vídeo cambió desde que se sacaron estas escenas: vuelve a sacarlas.");
  resumen(estado);
  process.exit(0);
}

if (opt("--aceptar")) {
  const palabras = opt("--palabras");
  if (!palabras || palabras.startsWith("--")) throw new Error("Falta --palabras \"…\": la aceptación se apunta con lo que dijo el creador en el chat.");
  const estado = leerEstadoEscenas(p.dir);
  if (!estado) throw new Error(`Todavía no se han sacado las escenas: «node motor/escenas.mjs ${p.slug}», enséñaselas al creador y apunta después lo que acepte.`);
  const ids = opt("--aceptar") === "todas" ? estado.escenas.map((e) => e.id) : opt("--aceptar").split(",").map((s) => s.trim()).filter(Boolean);
  const acept = leerAceptaciones(p.dir);
  fs.mkdirSync(path.join(E, "aceptadas"), { recursive: true });
  for (const id of ids) {
    const e = estado.escenas.find((x) => x.id === id);
    if (!e) throw new Error(`No hay ninguna escena «${id}». Las que hay: ${estado.escenas.map((x) => x.id).join(", ")}.`);
    if (e.firma !== firmaActual) throw new Error(`La escena «${id}» se sacó de otra versión del vídeo: lo que el creador vio ya no es lo que hay. Vuelve a sacarla («node motor/escenas.mjs ${p.slug} --solo ${id}») y enséñasela otra vez.`);
    for (const n of fs.readdirSync(path.join(E, "aceptadas")).filter((n) => n.startsWith(`${id}-`))) fs.rmSync(path.join(E, "aceptadas", n));
    const fotos = e.fotos.map((x) => {
      const archivo = `aceptadas/${id}-${ms(x.segundo)}.png`;
      fs.copyFileSync(path.join(E, x.archivo), path.join(E, archivo));
      return { segundo: x.segundo, archivo };
    });
    acept.escenas[id] = { fecha: new Date().toISOString(), palabras, fotos };
    e.estado = "aceptada"; e.cambiaron = [];
  }
  escribirJson(path.join(E, "aceptaciones.json"), acept);
  escribirJson(path.join(E, "estado.json"), estado);
  console.log(`apuntado: ${ids.join(", ")} («${palabras}»). Apúntalo también en notas.md.`);
  resumen(estado);
  process.exit(0);
}

// sacar los fotogramas de las escenas y compararlos con lo aceptado
const solo = opt("--solo") ? opt("--solo").split(",").map((s) => s.trim()) : null;
for (const id of solo ?? []) if (!escenas.some((e) => e.id === id)) throw new Error(`No hay ninguna escena «${id}». Las que hay: ${escenas.map((e) => e.id).join(", ")}.`);
for (const aviso of p.avisos) console.log(`aviso: ${aviso}`);
for (const d of ["enteros", "fotos"]) fs.mkdirSync(path.join(E, d), { recursive: true });

await tomarMotor("las hojas de escenas", p.slug);
console.log("empaquetando…");
const serveUrl = await empaquetar(p);
const inputProps = { datos: p.datos };
const chromiumOptions = opcionesDeChromium(flag("--cpu"));
const navegador = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "video", inputProps, puppeteerInstance: navegador });
const acept = leerAceptaciones(p.dir);
const previo = leerEstadoEscenas(p.dir);
const t0 = Date.now();
const hechas = [];
for (const [i, e] of escenas.entries()) {
  if (solo && !solo.includes(e.id)) {
    // las que no se sacan ahora conservan lo que había, con la firma de cuando se sacaron
    const antes = previo?.escenas.find((x) => x.id === e.id);
    hechas.push(antes ? { ...antes, estado: antes.firma === firmaActual ? antes.estado : "pendiente" } : { ...e, estado: "pendiente", firma: null, fotos: [], hoja: null, cambiaron: [] });
    continue;
  }
  for (const d of ["enteros", "fotos"]) for (const n of fs.readdirSync(path.join(E, d)).filter((n) => n.startsWith(`${e.id}-`))) fs.rmSync(path.join(E, d, n));
  const fotos = [];
  for (const s of e.fotos) {
    const entero = path.join(E, "enteros", `${e.id}-${ms(s)}.png`), foto = path.join(E, "fotos", `${e.id}-${ms(s)}.png`);
    await renderStill({ serveUrl, composition, inputProps, chromiumOptions, frame: Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps)), output: entero, puppeteerInstance: navegador, logLevel: "error" });
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", entero, "-vf", "scale=iw/2:-2", foto], { encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`ffmpeg falló: ${(r.stderr || "").trim()}`);
    fotos.push({ segundo: s, archivo: `fotos/${e.id}-${ms(s)}.png`, entero: `enteros/${e.id}-${ms(s)}.png` });
    process.stdout.write(`\r${e.id} ${fotos.length}/${e.fotos.length}   `);
  }
  // contra lo aceptado: la misma lista de segundos y las mismas imágenes
  const a = acept.escenas[e.id];
  let estado = "pendiente", cambiaron = [];
  if (a) {
    cambiaron = fotos.filter((x) => { const v = a.fotos.find((y) => Math.abs(y.segundo - x.segundo) < 0.011); return !v || !igual(path.join(E, x.archivo), path.join(E, v.archivo)); }).map((x) => x.segundo);
    estado = cambiaron.length || a.fotos.length !== fotos.length ? "cambió" : "aceptada";
  }
  const hoja = `hoja-${e.id}.jpg`;
  lamina(fotos.map((x) => ({ s: x.segundo.toFixed(2), output: path.join(E, x.archivo) })), path.join(E, hoja));
  rotular(path.join(E, hoja), `${i + 1}. ${e.titulo}  (${e.id})  ${e.desde.toFixed(1)} a ${e.hasta.toFixed(1)} s`);
  hechas.push({ ...e, fotos, estado, cambiaron, hoja, firma: firmaActual, aceptada: a ? { fecha: a.fecha, palabras: a.palabras } : null });
}
try { await navegador.close({ silent: true }); } catch { /* da igual */ }
console.log(`\nescenas sacadas en ${Math.round((Date.now() - t0) / 1000)} s`);
const estado = { esquema: 1, firma: firmaActual, fecha: new Date().toISOString(), completo: hechas.every((e) => e.firma === firmaActual), escenas: hechas };
escribirJson(path.join(E, "estado.json"), estado);
resumen(estado);
process.exit(0);
