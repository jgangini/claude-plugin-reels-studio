// Mide el vídeo antes de enseñárselo a nadie: en segundos y sin gastar un juez, dice qué texto es demasiado pequeño,
// qué texto o qué pieza cae en lo que tapa la red (Instagram, YouTube o LinkedIn, según el formato del vídeo), qué está
// cortado, qué se pisa con qué y qué va pegado al borde de su pieza. Es lo que un juez de arte mediría con una regla; lo que no se
// puede medir (si se entiende, si engancha, si se mueve bien) sigue siendo de los jueces. No renderiza el vídeo:
// recorre fotogramas sueltos y lee lo que el navegador ha dibujado.
//
//   node motor/medir.mjs <vídeo>                 un fotograma cada medio segundo, de principio a fin
//   node motor/medir.mjs <vídeo> --paso 0.25     más fino          --en 3,4.5,12     solo esos segundos
//   node motor/medir.mjs <vídeo> --todo          enseña también los avisos repetidos y dónde está cada texto
//   node motor/medir.mjs <vídeo> --escena pasos  solo esa escena (o varias: pasos,cierre), para repasar un arreglo en
//                                                segundos. No sustituye a la medida entera: antes de sellar, una entera
//   node motor/medir.mjs <vídeo> --ficha         las medidas del formato de ese vídeo, sin medir nada
//
// Deja revision/medidas.json (con la firma del vídeo medido). Sale con error si hay algo que arreglar: jueces.mjs
// --preparar no sella un candidato sin medidas limpias de esa misma versión.
//
// Las reglas salen del perfil de formato del vídeo (video.json → "formato"; motor/lib/perfiles.mjs): un 16:9 de YouTube
// no se mide con las zonas ni con la letra de un reel. Lo que se puede ajustar en video.json → "medir": { "ignora":
// ["trozo de texto", …], "letraMinima": 22 }. Cada cosa que se ignore, con su porqué en notas.md. La marca del creador
// y el subtítulo se marcan en el código con data-medir="marca" / "subtitulo" (motor/src/Medir.tsx).
//
// El color también se mide (motor/lib/color.mjs): el contraste de cada texto con su fondo, las superficies de familias
// de tono distintas, la misma pieza con dos colores y demasiados colores vivos a la vez. La paleta se declara en
// video.json → "paleta": { "lienzo": "#07080D", "acentos": ["#FFC46B"], "significado": ["#FF5A5A"] } (significado: los
// colores de marcas ajenas o que quieren decir algo, que no cuentan como acentos); sin ella no se puede medir el contraste del
// texto que va suelto sobre el fondo ni decir qué color vivo se sale de la paleta.
//
// El dibujo también (motor/lib/dibujo.mjs): qué parte del cuadro tiene algo dibujado y qué parte tiene algo que no es
// texto, y cuántas palabras hay a la vez en pantalla. Son avisos, no errores: un plano limpio y bien diseñado puede medir
// poco dibujo y ser justo lo que el creador quiere (un vídeo en 2D que él eligió medía un 10 %). El aviso es para mirar
// ese plano y preguntarse si la idea la cuenta algo que actúa o solo un texto; lo decide quien mira, no el número.
// video.json → "medir": { "soloTexto": [[32, 35]] } deja fuera esos segundos (una pantalla capturada que tiene que ser solo
// texto) y "dibujo": false lo quita del todo. «--prueba» mide sin guardar nada.
//
// Los márgenes se miden hasta la tinta de las letras (un «¿» o una «g» cuelgan por debajo de la línea), no hasta la
// caja de la línea. Un defecto que solo se ve en un fotograma no cuenta (una entrada, un muelle), salvo en las zonas.
// Límites conocidos: de lado se mide la caja de la línea, no la tinta; si la letra de un texto no se puede medir (texto
// dentro de un SVG, una fuente que no cargó) se le supone un 15 % del cuerpo de aire arriba y abajo; y solo cuentan como
// piezas las cajas de HTML con fondo o borde (un rectángulo dibujado en SVG o en canvas no se ve).
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { abrirVideo, TALLER } from "./lib/taller.mjs";
import { argumentos } from "./lib/argumentos.mjs";
import { empaquetar, opcionesDeChromium } from "./lib/empaquetar.mjs";
import { firma } from "./lib/firma.mjs";
import { enZona, ficha } from "./lib/perfiles.mjs";
import { analizar, COLOR, contrasteDe, hex, paletaDe } from "./lib/color.mjs";
import { DIBUJO, leerPng, medirDibujo, parteUtil } from "./lib/dibujo.mjs";
import { tomarMotor } from "./lib/candado.mjs";
import { escenasDe } from "./lib/escenas.mjs";

const { args, opt, flag } = argumentos();
const p = abrirVideo(args[0]);
const cfg = p.video.medir ?? {};
const ignora = (cfg.ignora ?? []).map((s) => String(s).toLowerCase());

// Las reglas, en píxeles del tamaño de su perfil (1080×1920 en un reel, 1920×1080 en YouTube, 1080×1080 en LinkedIn):
// plugin/skills/video/SKILL.md, «La ficha»
const perfil = p.perfil;
const paleta = paletaDe(p.video);
const R = {
  letraError: cfg.letraMinima ?? perfil.letra.minima, // nada que se lea por debajo de esto
  letraAviso: perfil.letra.secundaria, // etiquetas secundarias
  pantalla: perfil.letra.pantalla, // lo que se lee en una pantalla recreada
  enlace: perfil.letra.enlace, // un enlace o un dato que alguien copiaría
  margenError: perfil.margen.error, margenAviso: perfil.margen.aviso, // del texto al borde de su pieza
  chipError: perfil.margen.chipError, chipAviso: perfil.margen.chipAviso, // y al de una píldora o un resaltado de una línea
  tapado: 0.3, // fracción de un texto debajo de otra pieza
};
if (flag("--ficha")) { console.log(ficha(perfil).join("\n")); process.exit(0); }
for (const a of p.avisos.filter((a) => a.includes("formato"))) console.warn("aviso:", a);

// solo unas escenas: sus segundos, para repasar un arreglo sin medir el vídeo entero
const deEscena = opt("--escena") ? (() => {
  const todas = escenasDe(p);
  return opt("--escena").split(",").map((s) => s.trim()).filter(Boolean).map((id) => {
    const e = todas.find((x) => x.id === id);
    if (!e) throw new Error(`No hay ninguna escena «${id}». Las que hay: ${todas.map((x) => x.id).join(", ")}.`);
    return e;
  });
})() : null;
await tomarMotor("medir", p.slug);
console.log("empaquetando…");
const serveUrl = await empaquetar(p);
const inputProps = { datos: { ...p.datos, medir: true } };
const chromiumOptions = opcionesDeChromium(flag("--cpu"));
const navegador = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "video", inputProps, puppeteerInstance: navegador });
const kx = composition.width / perfil.ancho, ky = composition.height / perfil.alto;
const paso = Number(opt("--paso") ?? 0.5);
const dur = composition.durationInFrames / composition.fps;
const todos = Array.from({ length: Math.floor(dur / paso) + 1 }, (_, i) => Math.round(i * paso * 100) / 100);
const tiempos = opt("--en") ? opt("--en").split(",").map(Number) : deEscena ? todos.filter((s) => deEscena.some((e) => s >= e.desde - 0.001 && s < e.hasta)) : todos;
const suelto = !!opt("--en"), parcial = suelto || !!deEscena; // «--en»: segundos sueltos; «--escena»: un tramo seguido
if (!tiempos.length) throw new Error("No hay ningún fotograma que medir en ese tramo.");

const medidas = [];
const t0 = Date.now();
for (const s of tiempos) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const trozos = [];
  const foto = await renderStill({
    serveUrl, composition, inputProps, chromiumOptions, frame, scale: 0.1, imageFormat: "png", output: null, puppeteerInstance: navegador, logLevel: "error",
    onBrowserLog: (l) => { const m = /^MEDIR:(\d+):(\d+):(\d+):(.*)$/s.exec(l.text); if (m && Number(m[1]) === frame) trozos[Number(m[2])] = m[4]; },
  });
  if (!trozos.length) throw new Error(`No llegaron medidas del fotograma ${frame}: ¿el vídeo se dibuja dentro del motor (motor/src/Video.tsx)?`);
  const medida = { s, ...JSON.parse(trozos.join("")) };
  // el dibujo: lo que no es fondo, en la parte del cuadro que la red deja ver
  if (cfg.dibujo !== false && foto?.buffer) {
    try {
      const img = leerPng(foto.buffer), caja = (l) => [l[0] / kx, l[1] / ky, l[2] / kx, l[3] / ky];
      const suyos = medida.textos.filter((x) => x.g !== "marca" && x.g !== "subtitulo"), deMarca = medida.textos.filter((x) => x.g === "marca");
      Object.assign(medida, medirDibujo(img, { lienzo: paleta.lienzo, util: parteUtil(perfil), cajas: suyos.flatMap((x) => x.r.map(caja)), marca: deMarca.flatMap((x) => x.r.map(caja)), k: img.w / perfil.ancho }));
      medida.palabras = suyos.filter((x) => x.op >= 0.5 && !ignora.some((i) => x.s.toLowerCase().includes(i))).reduce((n, x) => n + x.s.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length, 0);
    } catch (e) { if (!medidas.length) console.warn("\naviso: no se pudo medir el dibujo:", e.message); }
  }
  medidas.push(medida);
  process.stdout.write(`\r${medidas.length}/${tiempos.length}`);
}
try { await navegador.close({ silent: true }); } catch { /* da igual */ }
console.log(`\nmedido en ${Math.round((Date.now() - t0) / 1000)} s`);

// --crudo deja además lo que se midió, tal cual, en revision/medidas-crudas.json (para entender un hallazgo)
if (flag("--crudo")) fs.writeFileSync(path.join(p.dir, "revision", "medidas-crudas.json"), JSON.stringify(medidas));

// ---------------------------------------------------------------------------------------------------------------------
// Las reglas
// ---------------------------------------------------------------------------------------------------------------------
const hallazgos = new Map(); // clave → { nivel, que, texto, donde, veces: [s…] }
const apunta = (nivel, que, t, s, clave = que) => {
  const k = `${clave}|${t.s}`;
  const h = hallazgos.get(k) ?? { nivel, que, texto: t.s, donde: `x ${t.r[0][0]}, y ${t.r[0][1]}`, veces: [] };
  if (nivel === "error" && h.nivel !== "error") { h.nivel = "error"; h.que = que; } // lo peor que se vio manda, con su frase
  h.veces.push(s);
  hallazgos.set(k, h);
};
const esEnlace = (s) => /^[\w.-]+\.(com|net|org|io|dev|co|es)\b/i.test(s) || /^https?:/.test(s);
for (const m of medidas) {
  for (const t of m.textos) {
    if (t.g === "marca" || ignora.some((i) => t.s.toLowerCase().includes(i))) continue;
    const x1 = Math.min(...t.r.map((l) => l[0])) / kx, y1 = Math.min(...t.r.map((l) => l[1])) / ky;
    const x2 = Math.max(...t.r.map((l) => l[0] + l[2])) / kx, y2 = Math.max(...t.r.map((l) => l[1] + l[3])) / ky;
    // lo que tapa la red, según el perfil
    for (const z of perfil.zonas) {
      const cae = enZona(z, { x1, y1, x2, y2 }, perfil.holgura);
      if (cae) apunta(cae.nivel, cae.que, t, m.s, `zona-${z.id}`);
    }
    if (t.g === "subtitulo") continue; // del subtítulo solo se mira dónde cae
    // la letra
    const cuerpo = t.fs / ky;
    if (cuerpo < R.letraError) apunta("error", `letra de ${Math.round(cuerpo)} px (mínimo ${R.letraError})`, t, m.s, "letra");
    else if (esEnlace(t.s) && cuerpo < R.enlace) apunta("aviso", `enlace a ${Math.round(cuerpo)} px (un enlace que se copia pide ${R.enlace})`, t, m.s, "letra");
    else if (cuerpo < R.letraAviso - 0.5) apunta("aviso", `letra de ${Math.round(cuerpo)} px (una etiqueta secundaria pide ${R.letraAviso}; lo que se lee, ${R.pantalla})`, t, m.s, "letra");
    // cortado, pisado, pegado
    if (t.elipsis) apunta("error", "no cabe: acaba en «…»", t, m.s, "corte");
    else if (t.corte > 3) apunta("error", `cortado ${t.corte} px por su contenedor o por el borde del cuadro`, t, m.s, "corte");
    if (t.tapado > R.tapado) apunta("error", `otra pieza le tapa el ${Math.round(t.tapado * 100)} %`, t, m.s, "tapado");
    if (t.encima) apunta("error", `se pisa con «${t.encima.slice(0, 40)}»`, t, m.s, "encima");
    // una píldora o un resaltado de una línea va ceñido a su palabra: se le pide menos que a una tarjeta
    const mErr = t.chip ? R.chipError : R.margenError, mAv = t.chip ? R.chipAviso : R.margenAviso, de = t.chip ? "su píldora" : "su pieza";
    if (t.caja >= 0 && t.margen < mErr) apunta("error", t.margen < 0 ? `se sale ${-t.margen} px de ${de}` : `a ${t.margen} px del borde de ${de} (mínimo ${mErr}; lo suyo son ${mAv})`, t, m.s, "margen");
    else if (t.caja >= 0 && t.margen < mAv) apunta("aviso", `a ${t.margen} px del borde de ${de} (pide ${mAv} o más)`, t, m.s, "margen");
    // el contraste con su fondo: la caja sobre la que va o, si va suelto, el lienzo declarado en la paleta
    const ct = contrasteDe(t, paleta.lienzo);
    if (ct && ct.ratio < COLOR.contrasteError) apunta("error", `poco contraste: ${ct.ratio.toFixed(2)}:1 sobre ${hex(ct.fondo)} (mínimo ${COLOR.contrasteError}; lo cómodo es ${COLOR.contrasteAviso})`, t, m.s, "contraste");
    else if (ct && cuerpo < perfil.letra.rotulo && ct.ratio < COLOR.contrasteAviso) apunta("aviso", `contraste justo: ${ct.ratio.toFixed(2)}:1 sobre ${hex(ct.fondo)} (un texto que no es un rótulo pide ${COLOR.contrasteAviso})`, t, m.s, "contraste");
  }
  // las piezas también: un recuadro que entra en lo que tapa la red, o en su margen. Lo que llega a un borde del cuadro o
  // lo cruza de lado a lado es fondo (se puede tapar) y no cuenta; la marca y lo marcado «fuera» no llegan aquí.
  const Wc = composition.width, Hc = composition.height;
  m.piezas.forEach((r, i) => {
    if (r[0] <= 1 || r[1] <= 1 || r[0] + r[2] >= Wc - 1 || r[1] + r[3] >= Hc - 1 || r[2] > 0.97 * Wc) return;
    const suyo = m.textos.find((t) => t.caja === i) ?? m.textos.find((t) => t.g !== "marca" && t.r[0][0] >= r[0] && t.r[0][1] >= r[1] && t.r[0][0] + t.r[0][2] <= r[0] + r[2] && t.r[0][1] + t.r[0][3] <= r[1] + r[3]);
    const nombre = suyo ? `la pieza de «${suyo.s.slice(0, 30)}»` : `una pieza de ${Math.round(r[2] / kx)}×${Math.round(r[3] / ky)}`;
    if (ignora.some((x) => nombre.toLowerCase().includes(x))) return;
    const c = { x1: r[0] / kx, y1: r[1] / ky, x2: (r[0] + r[2]) / kx, y2: (r[1] + r[3]) / ky };
    for (const z of perfil.zonas) {
      const cae = enZona(z, c, perfil.holgura);
      if (cae) apunta(cae.nivel, cae.que, { s: nombre, r: [r] }, m.s, `zona-${z.id}-pieza`);
    }
  });
}
// el color del vídeo entero: superficies de familias distintas, la misma pieza con dos colores, demasiados colores vivos
const color = analizar(medidas, { area: composition.width * composition.height, lienzo: paleta.lienzo, acentos: paleta.acentos, significado: paleta.significado, ignora: (s) => ignora.some((i) => s.toLowerCase().includes(i)) });
for (const h of color.hallazgos) {
  if (ignora.some((i) => h.etiqueta.toLowerCase().includes(i))) continue;
  for (const s of [...new Set(h.veces)].sort((a, b) => a - b)) apunta(h.nivel, h.que, { s: h.etiqueta, r: [[0, 0, 0, 0]] }, s, h.regla);
}
// el dibujo: tramos en los que casi todo es fondo o casi todo es texto, y el vídeo entero
const conDibujo = medidas.filter((m) => m.dibujo !== undefined);
let resumenDibujo = null;
if (conDibujo.length && !suelto) {
  const orden = (k) => conDibujo.map((m) => m[k]).sort((a, b) => a - b), med = (k) => orden(k)[conDibujo.length >> 1];
  resumenDibujo = { dibujo: Math.round(med("dibujo")), figura: Math.round(med("figura")), palabras: Math.max(...conDibujo.map((m) => m.palabras ?? 0)) };
  const tramos = (cumple) => { const out = []; let a = null, ult = null; for (const m of conDibujo) { if (cumple(m)) { a ??= m.s; ult = m.s; } else { if (a !== null && ult - a >= DIBUJO.segundos - 0.01) out.push([a, ult]); a = null; } } if (a !== null && ult - a >= DIBUJO.segundos - 0.01) out.push([a, ult]); return out; };
  const exento = (s) => (cfg.soloTexto ?? []).some(([a, b]) => s >= a && s <= b);
  const entre = ([a, b]) => conDibujo.filter((m) => m.s >= a && m.s <= b).map((m) => m.s);
  const minimo = ([a, b], k) => Math.round(Math.min(...conDibujo.filter((m) => m.s >= a && m.s <= b).map((m) => m[k])));
  for (const tr of tramos((m) => m.figura < DIBUJO.figuraError && !exento(m.s))) for (const s of entre(tr)) apunta("aviso", `casi nada que mirar: solo el ${minimo(tr, "figura")} % del cuadro tiene algo que no sea texto. Mira el plano: ¿la idea la cuenta algo que actúa, o solo un texto? Si es limpio a propósito, vale`, { s: "el plano", r: [[0, 0, 0, 0]] }, s, `dibujo-${tr[0]}`);
  for (const tr of tramos((m) => m.figura >= DIBUJO.figuraError && m.figura < DIBUJO.figuraAviso && !exento(m.s))) for (const s of entre(tr)) apunta("aviso", `poco que mirar: el ${minimo(tr, "figura")} % del cuadro tiene algo que no sea texto (lo cómodo, ${DIBUJO.figuraAviso} % o más)`, { s: "el plano", r: [[0, 0, 0, 0]] }, s, `dibujo-${tr[0]}`);
  for (const tr of tramos((m) => (m.palabras ?? 0) > DIBUJO.palabras)) for (const s of entre(tr)) apunta("aviso", `${Math.max(...conDibujo.filter((m) => m.s >= tr[0] && m.s <= tr[1]).map((m) => m.palabras))} palabras a la vez en pantalla (más de ${DIBUJO.palabras} se lee, no se mira): ¿lo puede contar un objeto en vez de un texto?`, { s: "el plano", r: [[0, 0, 0, 0]] }, s, `palabras-${tr[0]}`);
  const todo = conDibujo.map((m) => m.s);
  if (!parcial && resumenDibujo.dibujo < DIBUJO.medianaAviso) for (const s of [todo[0], todo[todo.length - 1]]) apunta("aviso", `poco dibujo en el vídeo entero: la mediana es un ${resumenDibujo.dibujo} % del cuadro. No es un defecto si el estilo es limpio a propósito; mira que ningún tramo se quede en solo texto`, { s: "el vídeo entero", r: [[0, 0, 0, 0]] }, s, "dibujo-video");
}
// lo pasajero (un solo fotograma de una entrada, de un muelle que crece o de un fundido) no cuenta, salvo que caiga en una zona tapada
const lista = [...hallazgos.entries()].map(([k, h]) => ({ k: k.split("|")[0], ...h }))
  .filter((h) => h.veces.length > 1 || suelto || h.k.startsWith("zona-"))
  .sort((a, b) => (a.nivel === b.nivel ? a.veces[0] - b.veces[0] : a.nivel === "error" ? -1 : 1));
const tramo = (v) => (v.length > 1 ? `${v[0]}–${v[v.length - 1]} s` : `${v[0]} s`);
const errores = lista.filter((h) => h.nivel === "error"), avisos = lista.filter((h) => h.nivel === "aviso");
for (const h of flag("--todo") ? lista : [...errores, ...avisos.slice(0, 25)]) console.log(`${h.nivel === "error" ? "ARREGLAR" : "aviso   "}  ${tramo(h.veces).padEnd(14)} ${h.k.endsWith("-pieza") || h.k.startsWith("color-") || h.k.startsWith("dibujo-") || h.k.startsWith("palabras-") ? h.texto : `«${h.texto.slice(0, 44)}»`}: ${h.que}${flag("--todo") ? ` (${h.donde})` : ""}`);
if (!flag("--todo") && avisos.length > 25) console.log(`… y ${avisos.length - 25} avisos más (--todo los enseña)`);

if (resumenDibujo) console.log(`dibujo${parcial ? " (solo de lo medido)" : ""}: la mediana es un ${resumenDibujo.dibujo} % del cuadro con algo dibujado y un ${resumenDibujo.figura} % con algo que no es texto; como mucho, ${resumenDibujo.palabras} palabras a la vez. Es un dato para mirar, no una nota`);
const f = firma(p.dir);
const salida = path.join(p.dir, "revision", deEscena ? "medidas-escena.json" : "medidas.json"); // una escena suelta no pisa la medida entera
if (flag("--prueba")) { console.log(`${medidas.length} fotogramas medidos (formato ${perfil.id}): ${errores.length} que arreglar, ${avisos.length} avisos. Es una prueba: no se guarda nada.`); process.exit(0); }
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, JSON.stringify({ firma: f.sha256, formato: perfil.id, fecha: new Date().toISOString(), fotogramas: medidas.length, completo: !parcial, ...(deEscena ? { escenas: deEscena.map((e) => e.id) } : {}), errores: errores.length, avisos: avisos.length, colores: color.resumen, dibujo: resumenDibujo, hallazgos: lista.map(({ k, ...h }) => ({ regla: k, ...h, veces: tramo(h.veces) })) }, null, 1) + "\n");
console.log(`${medidas.length} fotogramas medidos (formato ${perfil.id}, ${perfil.ancho}×${perfil.alto}): ${errores.length} que arreglar, ${avisos.length} avisos → ${path.relative(TALLER, salida).split(path.sep).join("/")}`);
if (!paleta.declarada) console.log(`nota: el vídeo no declara su paleta (video.json → "paleta": { "lienzo": "#…", "acentos": ["#…"] }): no se mide el contraste del texto suelto ni los colores vivos fuera de la paleta.`);
if (deEscena) console.log(`Es solo ${deEscena.map((e) => e.id).join(", ")}: antes de sellar el vídeo hace falta una medida entera («node motor/medir.mjs ${p.slug}»).`);
if (errores.length) { console.log("Arregla lo marcado y vuelve a medir antes de renderizar entero o de llamar a los jueces."); process.exit(1); }
process.exit(0);
