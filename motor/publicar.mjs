// Lo que se escribe al publicar un vídeo: el título y el texto de cada red. El texto lo escribes tú en
// proyectos/<vídeo>/publicar.md (cómo, en el skill: §8, «El texto para publicar»); esto mide lo que se puede medir con
// una regla (lo que la red corta, los capítulos, los hashtags, los enlaces, las cifras sin fuente) y, cuando el creador
// lo acepta en el chat, lo deja listo para copiar en salida/. Nada se publica: lo pega él.
//
//   node motor/publicar.mjs <vídeo>                                  sin publicar.md, deja la plantilla; con él, lo comprueba
//   node motor/publicar.mjs <vídeo> --tiempos                        dónde empieza cada escena (para los capítulos de YouTube)
//   node motor/publicar.mjs <vídeo> --aceptar --titulo 2 --palabras "…"   lo que aceptó el creador → salida/<vídeo>-publicar.md
//
// publicar.md lleva una sección por cosa (## Títulos, ## Descripción, ## Texto, ## LinkedIn, ## Primer comentario). Las que
// tocan salen del formato del vídeo: un reel lleva Títulos (el de Shorts) y Texto (el pie de Instagram y TikTok), y
// LinkedIn si también se cuelga allí; uno de YouTube, Títulos y Descripción; uno de LinkedIn, LinkedIn y Primer
// comentario. Lo que va entre <!-- y --> no cuenta.
//
// Las cifras de corte («se corta hacia los 140») son aproximadas: las redes no las publican y cambian. Las que sí son
// reglas de la red (100 caracteres de título y 5000 de descripción en YouTube, los capítulos, 3000 en LinkedIn) son errores.
import fs from "node:fs";
import path from "node:path";
import { abrirVideo, TALLER } from "./lib/taller.mjs";
import { argumentos } from "./lib/argumentos.mjs";
import { archivosDe, shaArchivo } from "./lib/firma.mjs";
import { escenasDe, frasesDe } from "./lib/escenas.mjs";

const { args, opt, flag } = argumentos();
const p = abrirVideo(args[0]);
const formato = p.perfil.id;
const archivo = path.join(p.dir, "publicar.md");
const rel = (f) => path.relative(TALLER, f).split(path.sep).join("/");

const LIMITES = {
  titulo: { maximo: 100, comodo: 60 }, // YouTube admite 100; en el móvil se cortan hacia los 50–60
  descripcion: { maximo: 5000, arranque: 150 }, // antes de «…más» se ven unos 100–150 caracteres
  capitulos: { minimos: 3, segundos: 10 }, // regla de YouTube: el primero en 00:00, tres o más, en orden, de 10 s o más
  hashtags: { comodos: 5, maximoYouTube: 60 }, // con más de 60, YouTube los ignora todos
  pie: { maximo: 2200, arranque: 125 }, // el pie de Instagram: 2200, y se corta hacia los 125
  linkedin: { maximo: 3000, movil: 140, ordenador: 210, parrafo: 300 }, // «…ver más» hacia los 140 en el móvil y los 210 en el ordenador
};
const SECCIONES = { reel: ["titulos", "texto"], youtube: ["titulos", "descripcion"], linkedin: ["linkedin", "primer comentario"] };
const NOMBRE = { titulos: "Títulos", descripcion: "Descripción", texto: "Texto", linkedin: "LinkedIn", "primer comentario": "Primer comentario" };

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const plano = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/s$/, "").trim();
const sinVoz = !p.datos.palabras.length;
const escenas = sinVoz ? [] : escenasDe(p);
const frases = sinVoz ? [] : frasesDe(p);

if (flag("--tiempos")) {
  if (sinVoz) throw new Error("Todavía no hay voz: sin voz no se sabe dónde empieza cada escena.");
  for (const e of escenas) console.log(`${mmss(e.desde)}  ${e.titulo}${e.hasta - e.desde < LIMITES.capitulos.segundos ? `   (dura ${(e.hasta - e.desde).toFixed(1)} s: un capítulo pide 10 o más; júntala con otra)` : ""}`);
  console.log(`\nEl vídeo dura ${mmss(p.datos.duracion)}. Los títulos de arriba son los tuyos, de trabajo: un capítulo se titula para quien busca dentro del vídeo.`);
  process.exit(0);
}

if (!fs.existsSync(archivo)) {
  const trozos = {
    titulos: `## Títulos\n<!-- ${formato === "youtube" ? "Tres de verdad distintos, el que recomiendas primero. Lo que se busca, al principio; lo que no cabe en 60 caracteres se corta en el móvil. Completa la portada, no la repite." : "El título del Short (y de la publicación donde lo pidan). Corto: lo que no cabe en 60 caracteres se corta."} -->\n1. \n2. \n3. \n`,
    descripcion: `## Descripción\n<!-- Las dos primeras líneas son lo único que se ve sin abrir: qué va a entender quien lo vea, con las palabras con las que lo buscaría. Después, qué cuenta el vídeo, los enlaces con https://, las referencias si el creador las pide (una lista «Referencias:» con los enlaces que cita la propia fuente capturada), los capítulos y, al final, de tres a cinco hashtags.\nDónde empieza cada escena (los capítulos empiezan en 00:00, son tres o más y duran 10 s o más):\n${escenas.map((e) => `${mmss(e.desde)}  ${e.titulo}`).join("\n") || "(todavía no hay voz)"} -->\n\n`,
    texto: `## Texto\n<!-- El pie de Instagram y TikTok (y la descripción del Short). La primera línea es lo que se ve: no repite lo que ya dice el vídeo. De tres a cinco hashtags, al final. -->\n\n`,
    linkedin: `## LinkedIn\n<!-- Lo primero (unos 140 caracteres) es lo único que se ve antes de «…ver más»: el problema o el resultado, no un saludo. Párrafos de una a tres líneas, en primera persona. El enlace, en el primer comentario. Acaba con una pregunta de verdad. De tres a cinco hashtags, al final. -->\n\n`,
    "primer comentario": `## Primer comentario\n<!-- El enlace (con https://) y una línea que diga qué hay detrás. -->\n\n`,
  };
  const quiere = formato === "reel" ? [...SECCIONES.reel, "linkedin", "primer comentario"] : SECCIONES[formato];
  fs.writeFileSync(archivo, `# Para publicar: ${p.slug}\n<!-- Lo escribes tú con el guion y hechos.json delante (el skill, §8, «El texto para publicar»): no afirma nada que el vídeo no afirme. «node motor/publicar.mjs ${p.slug}» lo comprueba. ${formato === "reel" ? "Si este reel no se cuelga en LinkedIn, borra sus dos secciones. " : ""}-->\n\n${quiere.map((s) => trozos[s]).join("\n")}`);
  console.log(`Plantilla en ${rel(archivo)}: escríbela y vuelve a pasar esto.`);
  process.exit(0);
}

// ---- leer publicar.md ----
const crudo = fs.readFileSync(archivo, "utf-8").replace(/<!--[\s\S]*?-->/g, "");
const secciones = {};
{
  let actual = null;
  for (const l of crudo.split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(l);
    if (m) { actual = plano(m[1]); if (actual === "titulo") actual = "titulos"; secciones[actual] = []; }
    else if (actual) secciones[actual].push(l);
  }
  for (const k of Object.keys(secciones)) secciones[k] = secciones[k].join("\n").trim();
}
const titulos = (secciones.titulos ?? "").split("\n").map((l) => /^\s*(?:\d+[.)]|[-*])\s+(.+)$/.exec(l)?.[1].trim() ?? (/^\s*[^\s#]/.test(l) && !/^\s*(?:\d+[.)]|[-*])\s*$/.test(l) ? l.trim() : "")).filter(Boolean);

const errores = [], avisos = [];
const largo = (s) => [...s].length; // por caracteres, no por unidades UTF-16: un emoji cuenta uno
const primera = (s) => s.split("\n").find((l) => l.trim())?.trim() ?? "";
const enlaces = (s) => s.match(/https?:\/\/\S+/g) ?? [];
const sinEnlaces = (s) => s.replace(/https?:\/\/\S+/g, " ");
// Los enlaces que se le dan a quien lo ve salen de lo capturado: de hechos.json o de algo de fuentes/. Uno que no está
// en ninguna captura puede estar mal escrito o inventado: se avisa. Los del propio creador (su web) valen si están en
// preferencias.md.
function enlacesSinFuente(texto) {
  const todos = [...new Set(enlaces(texto).map((u) => u.replace(/[).,;:!?»"'>\]]+$/, "")))];
  if (!todos.length) return [];
  const leer = (f) => { try { return fs.readFileSync(f, "utf-8"); } catch { return ""; } };
  const fuentes = archivosDe(path.join(p.dir, "fuentes"), (f) => /\.(md|txt|json|html?|ya?ml|csv|log)$/i.test(f) && fs.statSync(f).size < 4e6);
  const capturado = [leer(path.join(p.dir, "hechos.json")), leer(path.join(TALLER, "preferencias.md")), ...fuentes.map(leer)].join("\n").toLowerCase();
  const limpio = (u) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  return todos.filter((u) => !capturado.includes(limpio(u)));
}
const hashtags = (s) => sinEnlaces(s).match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? [];
const sueltos = (s) => sinEnlaces(s).match(/(?<![\w@/.])(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|ai|co|es)\/\S+/gi) ?? [];
const corto = (s, n = 48) => `«${[...s].length > n ? [...s].slice(0, n - 1).join("") + "…" : s}»`;

for (const s of SECCIONES[formato]) if (secciones[s] === undefined && s !== "primer comentario") errores.push(`falta la sección «## ${NOMBRE[s]}»: un vídeo de ${p.perfil.red} la lleva`);
for (const s of Object.keys(secciones)) if (!NOMBRE[s]) avisos.push(`no conozco la sección «${s}»: valen ${Object.values(NOMBRE).join(", ")}`);

// ---- los títulos ----
if (secciones.titulos !== undefined) {
  if (!titulos.length) errores.push("«Títulos» está vacío");
  if (formato === "youtube" && titulos.length && titulos.length < 3) avisos.push(`solo hay ${titulos.length} título${titulos.length > 1 ? "s" : ""}: propón tres de verdad distintos para que el creador elija`);
  // la frase de la portada elegida: el título la completa, no la repite
  let dePortada = "";
  try {
    const e = JSON.parse(fs.readFileSync(path.join(p.dir, "revision", "portadas", "portadas.json"), "utf-8"));
    const v = e.variantes.find((x) => x.letra === e.elegida?.letra);
    // su frase: lo que va al tamaño más grande, junto (un titular partido en dos líneas son dos textos)
    const mayor = Math.max(0, ...(v?.textos ?? []).map((t) => t.enPequeno));
    dePortada = (v?.textos ?? []).filter((t) => t.enPequeno >= mayor * 0.95).map((t) => t.texto).join(" ").replace(/\s+/g, " ").trim();
    if (dePortada.split(" ").length < 2) dePortada = ""; // una sola palabra en común no es repetir la portada
  } catch { /* todavía no hay portada elegida */ }
  titulos.forEach((t, i) => {
    const n = largo(t), cual = `título ${i + 1} ${corto(t)}`;
    if (n > LIMITES.titulo.maximo) errores.push(`${cual}: ${n} caracteres, y YouTube admite ${LIMITES.titulo.maximo}`);
    else if (n > LIMITES.titulo.comodo) avisos.push(`${cual}: ${n} caracteres; en el móvil se corta hacia los 50–60, y hasta ahí se lee «${[...t].slice(0, 55).join("")}»`);
    const mayus = t.split(/\s+/).filter((w) => w.length > 3 && w === w.toUpperCase() && /\p{L}/u.test(w));
    if (mayus.length >= 3) avisos.push(`${cual}: ${mayus.length} palabras en mayúsculas; grita, y no se lee mejor`);
    if (/[!?]{2,}/.test(t)) avisos.push(`${cual}: signos repetidos («!!», «??»)`);
    if (dePortada && plano(t).includes(plano(dePortada))) avisos.push(`${cual} repite la frase de la portada («${dePortada}»): el título y la portada se completan, no dicen lo mismo`);
    titulos.forEach((u, j) => { if (j > i && plano(u) === plano(t)) errores.push(`los títulos ${i + 1} y ${j + 1} son el mismo`); });
  });
}

// ---- la descripción de YouTube ----
const reCapitulo = /^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(\S.*)$/;
if (secciones.descripcion !== undefined) {
  const d = secciones.descripcion;
  if (!d) errores.push("«Descripción» está vacía");
  if (largo(d) > LIMITES.descripcion.maximo) errores.push(`la descripción tiene ${largo(d)} caracteres, y YouTube admite ${LIMITES.descripcion.maximo}`);
  const uno = primera(d);
  if (/^(https?:|#)/.test(uno) || reCapitulo.test(uno)) avisos.push("la descripción empieza por un enlace, un hashtag o un capítulo: lo primero es lo que se ve sin abrirla, y tiene que decir qué va a entender quien vea el vídeo");
  else if (largo(uno) > LIMITES.descripcion.arranque) avisos.push(`la primera línea de la descripción tiene ${largo(uno)} caracteres; sin abrirla se ven unos 100–${LIMITES.descripcion.arranque}: hasta ahí, «${[...uno].slice(0, 120).join("")}»`);
  const caps = d.split("\n").map((l) => reCapitulo.exec(l)).filter(Boolean).map((m) => ({ s: Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]), titulo: m[4].trim(), marca: `${m[1] ? m[1] + ":" : ""}${m[2]}:${m[3]}` }));
  if (caps.length) {
    if (caps[0].s !== 0) errores.push(`el primer capítulo está en ${caps[0].marca}: YouTube pide que el primero sea 00:00`);
    if (caps.length < LIMITES.capitulos.minimos) errores.push(`hay ${caps.length} capítulo${caps.length > 1 ? "s" : ""}: YouTube pide ${LIMITES.capitulos.minimos} o más`);
    caps.forEach((c, i) => {
      const sig = caps[i + 1]?.s ?? p.datos.duracion;
      if (i && c.s <= caps[i - 1].s) errores.push(`el capítulo ${c.marca} no va después del anterior (${caps[i - 1].marca}): van en orden`);
      else if (c.s >= p.datos.duracion) errores.push(`el capítulo ${c.marca} cae fuera del vídeo, que dura ${mmss(p.datos.duracion)}`);
      else if (sig > c.s && sig - c.s < LIMITES.capitulos.segundos) errores.push(`el capítulo ${c.marca} ${corto(c.titulo, 30)} dura ${Math.round(sig - c.s)} s: YouTube pide ${LIMITES.capitulos.segundos} o más`);
      if (largo(c.titulo) > 40) avisos.push(`el capítulo ${c.marca} ${corto(c.titulo, 30)} tiene ${largo(c.titulo)} caracteres: en la barra se leen dos o cuatro palabras`);
      // un capítulo empieza donde empieza una frase (la marca va en segundos enteros)
      const cerca = frases.reduce((a, f) => (Math.abs(f.inicio - c.s) < Math.abs(a - c.s) ? f.inicio : a), Infinity);
      if (frases.length && c.s > 0 && Math.abs(cerca - c.s) > 1.5) avisos.push(`el capítulo ${c.marca} no cae donde empieza una frase (la más cercana empieza en ${mmss(cerca)}): quien salte ahí entra a media frase`);
    });
  } else if (p.datos.duracion >= 120) avisos.push(`el vídeo dura ${mmss(p.datos.duracion)} y la descripción no lleva capítulos: «node motor/publicar.mjs ${p.slug} --tiempos» dice dónde empieza cada escena`);
  const h = hashtags(d);
  if (h.length > LIMITES.hashtags.maximoYouTube) errores.push(`${h.length} hashtags: con más de ${LIMITES.hashtags.maximoYouTube}, YouTube los ignora todos`);
  else if (h.length > LIMITES.hashtags.comodos) avisos.push(`${h.length} hashtags en la descripción: de tres a cinco, y los tres primeros son los que YouTube enseña junto al título`);
  for (const u of sueltos(d)) avisos.push(`«${u}» va sin https://: en la descripción no será un enlace`);
}

// ---- el pie de un reel ----
if (secciones.texto !== undefined) {
  const t = secciones.texto;
  if (!t) errores.push("«Texto» está vacío");
  if (largo(t) > LIMITES.pie.maximo) errores.push(`el pie tiene ${largo(t)} caracteres, e Instagram admite ${LIMITES.pie.maximo}`);
  if (largo(primera(t)) > LIMITES.pie.arranque) avisos.push(`la primera línea del pie tiene ${largo(primera(t))} caracteres; se ven unos ${LIMITES.pie.arranque} antes de «…más»`);
  if (hashtags(t).length > LIMITES.hashtags.comodos) avisos.push(`${hashtags(t).length} hashtags en el pie: de tres a cinco`);
  if (enlaces(t).length || sueltos(t).length) avisos.push("el pie lleva un enlace: en Instagram y TikTok no se puede pulsar; di dónde está (el perfil, el nombre del repositorio)");
}

// ---- LinkedIn ----
if (secciones.linkedin !== undefined) {
  const t = secciones.linkedin, L = LIMITES.linkedin;
  if (!t) errores.push("«LinkedIn» está vacío");
  if (largo(t) > L.maximo) errores.push(`el texto de LinkedIn tiene ${largo(t)} caracteres, y admite ${L.maximo}`);
  const uno = primera(t);
  if (largo(uno) > L.ordenador) errores.push(`el arranque de LinkedIn tiene ${largo(uno)} caracteres: antes de «…ver más» se ven unos ${L.movil} en el móvil y ${L.ordenador} en el ordenador, y ahí se queda en «${[...uno].slice(0, L.movil).join("")}»`);
  else if (largo(uno) > L.movil) avisos.push(`el arranque de LinkedIn tiene ${largo(uno)} caracteres; en el móvil se ven unos ${L.movil}: hasta ahí, «${[...uno].slice(0, L.movil).join("")}»`);
  if (/^(hola|buenas|buenos d[ií]as|hoy quiero|me complace|estoy (muy )?(feliz|emocionad))/i.test(uno)) avisos.push(`el arranque de LinkedIn ${corto(uno)} es un saludo o un anuncio: lo que se ve antes de «…ver más» es el problema o el resultado`);
  // LinkedIn respeta el salto de línea: un párrafo es una línea
  for (const par of t.split("\n")) if (largo(par.trim()) > L.parrafo) avisos.push(`párrafo de ${largo(par.trim())} caracteres en LinkedIn (${corto(par.trim(), 36)}): en el feed se lee en bloques de una a tres líneas`);
  if (enlaces(t).length || sueltos(t).length) avisos.push("el texto de LinkedIn lleva un enlace: suele recortar el alcance (las fuentes no coinciden en cuánto); va en «Primer comentario»");
  if (hashtags(t).length > LIMITES.hashtags.comodos) avisos.push(`${hashtags(t).length} hashtags en LinkedIn: de tres a cinco, al final`);
  if (/comentario/i.test(t) && !secciones["primer comentario"]) avisos.push("el texto manda al primer comentario y no hay sección «## Primer comentario»");
}
if (secciones["primer comentario"]) {
  const c = secciones["primer comentario"];
  if (!enlaces(c).length) avisos.push(`el primer comentario no lleva ningún enlace con https://${sueltos(c).length ? ` («${sueltos(c)[0]}» va sin él)` : ""}`);
}

// ---- lo que se afirma sale de una captura: las cifras del texto están en el guion o en hechos.json ----
{
  const lee = (n) => { try { return fs.readFileSync(path.join(p.dir, n), "utf-8"); } catch { return ""; } };
  const respaldo = (lee("guion.txt") + "\n" + lee("hechos.json")).replace(/(\d)[.\s](?=\d{3}\b)/g, "$1");
  const vistas = new Set();
  for (const [s, cuerpo] of Object.entries(secciones)) {
    const texto = (s === "titulos" ? titulos.join("\n") : sinEnlaces(cuerpo).split("\n").filter((l) => !reCapitulo.test(l)).map((l) => l.replace(/^\s*\d+[.)]\s/, "")).join("\n")).replace(/(\d)[.\s](?=\d{3}\b)/g, "$1");
    for (const m of texto.matchAll(/(?<![\p{L}\d#_-])\d+(?:[.,]\d+)?(?![\p{L}\d_-])/gu)) {
      const n = m[0];
      if (vistas.has(n) || new RegExp(`(?<!\\d)${n.replace(/[.,]/g, "[.,]")}(?!\\d)`).test(respaldo)) continue;
      vistas.add(n);
      avisos.push(`«${n}» (${NOMBRE[s] ?? s}) no está en el guion ni en hechos.json: el texto no afirma nada que el vídeo no afirme`);
    }
  }
}

for (const u of enlacesSinFuente(crudo)) avisos.push(`el enlace ${u} no aparece en nada capturado (hechos.json, fuentes/): compruébalo, o captura su fuente antes de dárselo a quien lo ve`);

// ---- lo medido ----
const enseña = () => {
  if (titulos.length) titulos.forEach((t, i) => console.log(`título ${i + 1}  ${String(largo(t)).padStart(3)} car.  ${t}`));
  for (const s of ["descripcion", "texto", "linkedin", "primer comentario"]) if (secciones[s]) console.log(`${NOMBRE[s].padEnd(18)} ${String(largo(secciones[s])).padStart(4)} car.  arranque de ${largo(primera(secciones[s]))}: ${corto(primera(secciones[s]), 70)}`);
  for (const e of errores) console.log(`  ARREGLAR  ${e}`);
  for (const a of avisos) console.log(`  aviso     ${a}`);
};

if (flag("--aceptar")) {
  const palabras = opt("--palabras");
  if (!palabras || palabras.startsWith("--")) throw new Error("Falta --palabras \"…\": se apunta con lo que dijo el creador en el chat.");
  if (errores.length) { enseña(); throw new Error("Hay cosas que arreglar antes de darlo por aceptado."); }
  let n = 0;
  if (titulos.length > 1) {
    n = Number(opt("--titulo"));
    if (!Number.isInteger(n) || n < 1 || n > titulos.length) throw new Error(`Falta --titulo (de 1 a ${titulos.length}): el título lo elige el creador.`);
  } else if (titulos.length) n = 1;
  // cada trozo dice dónde se pega: un reel va a varias redes
  const donde = { titulo: formato === "reel" ? "Título (YouTube Shorts)" : "Título (YouTube)", descripcion: "Descripción (YouTube)", texto: "Texto (Instagram, TikTok y la descripción del Short)", linkedin: "Texto (LinkedIn)", "primer comentario": "Primer comentario (LinkedIn)" };
  const partes = [`# ${p.slug}: para publicar`];
  if (n) partes.push(`## ${donde.titulo}\n\n${titulos[n - 1]}`);
  for (const s of ["descripcion", "texto", "linkedin", "primer comentario"]) if (secciones[s]) partes.push(`## ${donde[s]}\n\n${secciones[s]}`);
  const salida = path.join(TALLER, "salida", `${p.slug}-publicar.md`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, partes.join("\n\n") + "\n");
  fs.mkdirSync(path.join(p.dir, "revision"), { recursive: true });
  fs.writeFileSync(path.join(p.dir, "revision", "publicar.json"), JSON.stringify({ esquema: 1, fecha: new Date().toISOString(), palabras, titulo: n ? titulos[n - 1] : null, publicar: shaArchivo(archivo), avisos }, null, 1) + "\n");
  console.log(`apuntado («${palabras}»)${n ? `, con el título ${n}` : ""}. Apúntalo también en notas.md. Lo pega él: nada se publica.`);
  console.log(salida);
  process.exit(0);
}

enseña();
console.log(errores.length ? "\nArregla lo marcado antes de enseñárselo al creador." : `\nSe puede enseñar al creador en el chat${titulos.length > 1 ? " (los títulos, para que elija uno)" : ""}. Cuando lo acepte: «node motor/publicar.mjs ${p.slug} --aceptar${titulos.length > 1 ? " --titulo n" : ""} --palabras "…"».`);
process.exit(errores.length ? 1 : 0);
