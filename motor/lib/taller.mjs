// El taller: dónde está, dónde vive cada vídeo, sus claves y lo que el motor necesita saber de un vídeo para dibujarlo.
// Todas las herramientas de motor/ empiezan por aquí.
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { perfilDe } from "./perfiles.mjs";

/** la carpeta del taller: la que contiene motor/, proyectos/ y salida/ */
export const TALLER = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** la voz con la que arranca un vídeo nuevo si el creador no eligió otra (video.json → "voz") */
export const VOZ_DE_PARTIDA = { modelo: "elevenlabs/eleven-v4", id: "l1zE9xgNpUTaQCZzpNJa", velocidad: 1, idioma: "es" };

/** una palabra sin mayúsculas, tildes ni signos, para comparar lo escrito con lo que dice la voz */
export function llano(palabra) {
  return String(palabra).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** la carpeta de un vídeo a partir de su nombre («mi-video»), de «proyectos/mi-video» o de una ruta */
export function carpetaDe(nombre) {
  if (!nombre || nombre.startsWith("--")) throw new Error("Di qué vídeo: su nombre en proyectos/ (por ejemplo «node motor/render.mjs mi-video»).");
  for (const candidata of [join(TALLER, "proyectos", nombre), join(TALLER, nombre), resolve(nombre)]) {
    if (existsSync(join(candidata, "video.json"))) return candidata;
  }
  throw new Error(`No hay ningún vídeo «${nombre}»: tendría que existir proyectos/${nombre}/video.json («node motor/nuevo.mjs ${nombre} "la idea"» lo crea).`);
}

/** una clave guardada en el entorno o en .env.local; "" si no está. Nunca se imprime */
export function clave(nombre) {
  if (process.env[nombre]) return process.env[nombre];
  const archivo = join(TALLER, ".env.local");
  if (!existsSync(archivo)) return "";
  for (const linea of readFileSync(archivo, "utf-8").split(/\r?\n/)) {
    const igual = linea.indexOf("=");
    if (igual > 0 && linea.slice(0, igual).trim() === nombre) return linea.slice(igual + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return "";
}

/** la clave de OpenRouter (voz, tiempos de las palabras y juez de audio), o un error que dice cómo guardarla */
export function claveOpenRouter() {
  const k = clave("OPENROUTER_API_KEY");
  if (!k) throw new Error("Falta la clave de OpenRouter. «node motor/clave.mjs» abre una página en el navegador para pegarla; no se escribe en el chat.");
  return k;
}

const leeJson = (archivo) => JSON.parse(readFileSync(archivo, "utf-8"));
const tienePalabra = (trozo) => llano(trozo) !== "";

/**
 * El guion de un vídeo (guion.txt). Lo que va entre paréntesis como «(pausa 1,5)» no se dice: es un silencio de esos
 * segundos después de la palabra anterior. Devuelve el texto que se le da a la voz y los silencios por número de palabra.
 */
export function guionDe(dir) {
  const escrito = readFileSync(join(dir, "guion.txt"), "utf-8");
  const pausas = {};
  let dicho = "", contadas = 0, cursor = 0;
  const marca = /\(\s*pausa\s+(\d+(?:[.,]\d+)?)\s*s?\s*\)/gi;
  for (let m = marca.exec(escrito); m; m = marca.exec(escrito)) {
    const tramo = escrito.slice(cursor, m.index);
    contadas += tramo.split(/\s+/).filter(tienePalabra).length;
    if (contadas) pausas[contadas - 1] = Number(m[1].replace(",", "."));
    dicho += `${tramo} `;
    cursor = m.index + m[0].length;
  }
  dicho += escrito.slice(cursor);
  return { texto: dicho.split(/\s+/).filter(Boolean).join(" "), pausas };
}

/**
 * subtitulos.txt: un bloque por línea, tal como se va a leer en pantalla. *palabra* es la que se resalta, «|» parte el
 * bloque en dos líneas y lo que empieza por # es un comentario. Tiene que decir, palabra por palabra, lo que dice la voz.
 */
function bloquesEscritos(dir, palabras) {
  const archivo = join(dir, "subtitulos.txt");
  if (!existsSync(archivo)) return null;
  const bloques = [];
  let n = 0;
  readFileSync(archivo, "utf-8").split(/\r?\n/).forEach((linea, numero) => {
    if (!linea.trim() || linea.trim().startsWith("#")) return;
    const suyas = [];
    let salto;
    for (const trozo of linea.trim().split(/\s+/)) {
      if (trozo === "|") { salto = n; continue; }
      const limpio = trozo.replaceAll("*", "");
      if (!tienePalabra(limpio)) continue;
      const dicha = palabras[n];
      const donde = `subtitulos.txt, línea ${numero + 1}`;
      if (!dicha) throw new Error(`${donde}: sobra «${limpio}»: la voz ya terminó.`);
      if (llano(dicha.texto) !== llano(limpio)) throw new Error(`${donde}: está escrito «${limpio}» y la voz dice ahí «${dicha.texto}» (palabra n.º ${n + 1}). El subtítulo tiene que decir lo mismo que la voz.`);
      dicha.texto = limpio; // se ve como está escrito en el subtítulo; el tiempo es el de la voz
      dicha.clave = /^\W*\*.+\*\W*$/.test(trozo);
      suyas.push(n++);
    }
    if (suyas.length) bloques.push(salto !== undefined && salto > suyas[0] ? { palabras: suyas, salto } : { palabras: suyas });
  });
  if (!bloques.length) return null;
  if (n < palabras.length) throw new Error(`subtitulos.txt se queda corto: faltan desde «${palabras.slice(n, n + 5).map((p) => p.texto).join(" ")}…».`);
  return bloques;
}

/** sin subtitulos.txt: bloques de pocas palabras que acaban donde hay un signo de puntuación */
function bloquesAutomaticos(palabras, maximo = 4) {
  const bloques = [];
  let abierto = [];
  palabras.forEach((p, i) => {
    abierto.push(i);
    if (abierto.length === maximo || /[.,;:!?…]["»”)]*$/.test(p.texto)) { bloques.push({ palabras: abierto }); abierto = []; }
  });
  if (abierto.length) bloques.push({ palabras: abierto });
  return bloques;
}

/**
 * Abre un vídeo: lee su video.json, su voz (palabras.json) y sus subtítulos, y deja preparado lo que el motor le pasa
 * al video.tsx (`datos`). `avisos` son cosas que conviene decir pero no impiden seguir.
 */
export function abrirVideo(nombre) {
  const dir = carpetaDe(nombre);
  const video = leeJson(join(dir, "video.json"));
  const perfil = perfilDe(video);
  const medios = join(dir, "medios");
  const avisos = [];

  let palabras = [], bloques = [], duracionDeLaVoz = 0;
  if (existsSync(join(dir, "palabras.json"))) {
    const voz = leeJson(join(dir, "palabras.json"));
    duracionDeLaVoz = voz.duracion;
    palabras = voz.palabras.map((p) => ({ texto: p.texto, inicio: p.inicio, fin: p.fin, clave: false }));
    bloques = bloquesEscritos(dir, palabras);
    if (!bloques) {
      bloques = bloquesAutomaticos(palabras);
      avisos.push("sin subtitulos.txt, el subtítulo se parte solo y no resalta ninguna palabra");
    }
  } else {
    avisos.push(`este vídeo todavía no tiene voz («node motor/voz.mjs ${basename(dir)}»): dura lo que diga "duracion" en video.json, o 10 s`);
  }

  const ancho = video.ancho ?? perfil.ancho, alto = video.alto ?? perfil.alto;
  if (Math.abs(ancho / alto - perfil.ancho / perfil.alto) > 0.02) {
    avisos.push(`el tamaño ${ancho}×${alto} de video.json no tiene la proporción de su formato «${perfil.id}» (${perfil.ancho}×${perfil.alto}): las zonas y las medidas no van a coincidir`);
  }
  // el subtítulo se dibuja si el vídeo lo pide o si en su formato va quemado; con "subtitulo": false, nunca
  let subtitulo = false;
  if (video.subtitulo !== false && (video.subtitulo || perfil.subtitulos === "quemados")) subtitulo = { ...perfil.subtitulo, ...(video.subtitulo ?? {}) };
  const enMedios = (archivo) => (existsSync(join(medios, archivo)) ? archivo : null);

  const datos = {
    slug: basename(dir), formato: perfil.id, perfil, fps: video.fps ?? 60, ancho, alto,
    duracion: video.duracion ?? (duracionDeLaVoz || 10),
    voz: enMedios("voz.mp3"), sonidos: enMedios("sonidos.wav"),
    palabras, bloques, subtitulo,
  };
  return { dir, slug: datos.slug, video, perfil, medios, datos, avisos };
}
