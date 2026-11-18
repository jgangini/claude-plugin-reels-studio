// Los jueces: nadie aprueba su propio vídeo. Tres revisiones independientes (editorial, arte, movimiento) del vídeo
// entero, con evidencia en fotogramas reales, un juez de audio que escucha por ti (la IA no oye) y una puerta: sin
// veredicto vigente, render.mjs --final no entrega. Y cada dato del vídeo sale de algo
// que se capturó de verdad.
//
//   node motor/jueces.mjs <vídeo> --hechos                              hechos.json contra guion.txt, video.tsx y fuentes/
//   node motor/jueces.mjs <vídeo> --previo                              antes de animar: sella los fotogramas quietos de las
//                                                                      escenas (escenas.mjs) y el brief del juez de arte;
//                                                                      «--previo --veredicto» valida su dictamen
//   node motor/jueces.mjs <vídeo> --preparar [archivo.mp4] [--sin-ciego] sella el candidato: firma, fotogramas, ráfagas,
//                                                                      hojas, audio y los briefs de los tres jueces
//   node motor/jueces.mjs <vídeo> --audio --enviar                      el juez de audio: un modelo escucha el mp3 del vídeo
//   node motor/jueces.mjs <vídeo> --visual --enviar [--rol arte]        jueces por API (segunda opinión, con las imágenes)
//   node motor/jueces.mjs <vídeo> --veredicto [--sin-audio]             valida los dictámenes → revision/jueces/veredicto.json
//   node motor/jueces.mjs <vídeo> --estado
//
// Cómo se usa (plugin/skills/video/SKILL.md §8): medir → escenas → --previo (juez de arte sobre los fotogramas quietos) → el
// creador acepta las escenas en el chat → animar → render entero → --preparar (no sella sin medidas limpias ni sin las
// escenas aceptadas) → tres jueces con contexto limpio, cada uno con su brief
// (revision/jueces/brief-<rol>.md), que escriben revision/jueces/dictamen-<rol>.json → --audio --enviar → --veredicto.
// Un dictamen cita la firma del candidato y fotogramas del catálogo: si el vídeo cambia, hay que volver a pasarlos.
// Los briefs piden mirar como un profesional (medidas, recortes a tamaño real plano a plano, un defecto de acabado
// visible es alto) y el veredicto exige la cobertura: lectura a ciegas (editorial), planos (arte), transiciones (movimiento).
// Cada hallazgo es un defecto (algo roto: bloquea si es crítico o alto) o un criterio (cómo quedaría mejor: no bloquea,
// lo decide el creador). Lo que el creador ya decidió para este vídeo (proyectos/<vídeo>/decisiones.md y lo que dijo al
// aceptar las escenas) va en todos los briefs y no puede ser hallazgo.
// --enviar manda el audio o las imágenes del vídeo a OpenRouter (cuesta céntimos): solo con permiso del creador.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DIBUJO } from "./lib/dibujo.mjs";
import { abrirVideo, TALLER, clave, guionDe, llano } from "./lib/taller.mjs";
import { argumentos } from "./lib/argumentos.mjs";
import { empaquetar, opcionesDeChromium } from "./lib/empaquetar.mjs";
import { carpetaJueces, firma, shaArchivo } from "./lib/firma.mjs";
import { cortesDe, laminasDelVideo, rafagasDe } from "./lib/laminas.mjs";
import { carpetaEscenas, escenasAceptadas, frasesDe, igual, leerEstadoEscenas } from "./lib/escenas.mjs";
import { dondeNo, fraseZonas } from "./lib/perfiles.mjs";
import { compararTextos } from "./lib/parecido.mjs";

const { args, opt, flag } = argumentos();
const posicionales = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && ["--rol"].includes(args[i - 1])));
const p = abrirVideo(posicionales[0]);
// el formato del vídeo (reel, youtube, linkedin): los briefs dicen su tamaño, lo que tapa su red, sus medidas mínimas y
// si lleva el subtítulo dibujado (motor/lib/perfiles.mjs)
const perfil = p.perfil;
const mitad = `${Math.round(p.datos.ancho / 2)}×${Math.round(p.datos.alto / 2)}`, entero = `${p.datos.ancho}×${p.datos.alto}`;
const J = carpetaJueces(p.dir);
const ROLES = ["editorial", "arte", "movimiento"];
const SEVERIDADES = ["critica", "alta", "media", "baja"];
const TIPOS = ["defecto", "criterio"], ORIGENES = ["anterior", "cambio", "nuevo"];
// Solo bloquea un defecto crítico o alto (algo roto que se mide). Un criterio (cómo quedaría mejor) no bloquea: se le
// enseña al creador y decide él. Y lo que un juez abre de nuevas en una ronda de verificación, sobre una imagen que no
// cambió, solo bloquea si es crítico: si no, los jueces no convergen nunca. Sin «tipo», un hallazgo cuenta como defecto.
const tipoDe = (h) => (h?.tipo === "criterio" ? "criterio" : "defecto");
const bloquea = (h, ronda = 1) => h.estado === "abierto" && ["critica", "alta"].includes(h.severidad) && tipoDe(h) === "defecto" && !(ronda >= 2 && h.origen === "nuevo" && h.severidad !== "critica");
const MODELO = process.env.JUEZ_MODELO || p.video.jueces?.modelo || "google/gemini-3.1-flash-lite";
const relJ = (f) => path.relative(J, f).split(path.sep).join("/");
const barras = (f) => f.split(path.sep).join("/");
const leerJson = (f) => JSON.parse(fs.readFileSync(f, "utf-8"));
const escribirJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1) + "\n");

function ffmpeg(a) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...a], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`ffmpeg no pudo con «${a.slice(-1)[0]}»: ${String(r.stderr ?? "").trim().split("\n").pop()}`);
}
const duracionDe = (f) => parseFloat(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf-8" }).stdout);
const normTexto = (s) => String(s).split(/\s+/).map(llano).filter(Boolean).join(" ");

// ---------------------------------------------------------------------------------------------------------------------
// Las frases de la voz: cada una es una «escena» mínima que el juez editorial tiene que reconocer sin leer nada
// ---------------------------------------------------------------------------------------------------------------------
const frases = () => frasesDe(p).map(({ finVoz, ...f }) => f); // lib/escenas.mjs

// ---------------------------------------------------------------------------------------------------------------------
// Los hechos: cada dato que dice la voz, y cada texto que se lee en una pantalla recreada, sale de una fuente capturada
// (fuentes/), y la cita está literalmente ahí. Si alguien «retocó» un dato, falla.
// ---------------------------------------------------------------------------------------------------------------------
const NUMEROS = new Set("cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis veintisiete veintiocho veintinueve treinta cuarenta cincuenta sesenta setenta ochenta noventa cien ciento cientos doscientos trescientos cuatrocientos quinientos seiscientos setecientos ochocientos novecientos mil miles millon millones billon billones mitad tercio doble triple porciento".split(" "));

function comprobarHechos() {
  const f = path.join(p.dir, "hechos.json");
  const errores = [], avisos = [];
  if (!fs.existsSync(f)) return { n: 0, errores: [`falta ${barras(path.relative(TALLER, f))}: cada dato del guion con su fuente capturada y su cita literal (plugin/skills/video/SKILL.md §7, paso 2)`], avisos };
  const hechos = leerJson(f);
  if (!Array.isArray(hechos)) return { n: 0, errores: ["hechos.json tiene que ser una lista"], avisos };
  const guion = guionDe(p.dir).texto;
  const tokens = guion.split(/\s+/).map(llano).filter(Boolean);
  const cubierto = new Array(tokens.length).fill(false);
  const tsx = fs.existsSync(path.join(p.dir, "video.tsx")) ? fs.readFileSync(path.join(p.dir, "video.tsx"), "utf-8") : "";
  const textoDe = (archivo) => {
    const ruta = path.join(p.dir, archivo);
    if (!archivo.startsWith("fuentes/") || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) return null;
    const b = fs.readFileSync(ruta);
    if (b.subarray(0, 4000).includes(0)) return null; // binario
    // las etiquetas solo se quitan de una página: en un archivo de código, «a < b … c > d» no es una etiqueta y
    // quitarlo se llevaba por delante las líneas de en medio (una cita literal de un .py dejaba de aparecer)
    const texto = b.toString("utf-8");
    return normTexto(/\.(html?|xml|svg)$/i.test(archivo) ? texto.replace(/<[^>]+>/g, " ") : texto);
  };
  hechos.forEach((h, k) => {
    const n = k + 1;
    if (!h || (typeof h.dice !== "string" && typeof h.pantalla !== "string") || typeof h.fuente !== "string" || typeof h.cita !== "string") return errores.push(`hecho ${n}: necesita "dice" (lo que dice la voz) o "pantalla" (lo que se lee en una pantalla), "fuente" (archivo de fuentes/) y "cita" (el texto literal de la fuente)`);
    if (typeof h.dice === "string") {
      const d = h.dice.split(/\s+/).map(llano).filter(Boolean);
      let pos = -1;
      for (let i = 0; i + d.length <= tokens.length && pos < 0; i++) if (d.every((t, j) => tokens[i + j] === t)) pos = i;
      if (pos < 0) errores.push(`hecho ${n}: «${h.dice}» no está en guion.txt tal cual (se compara sin tildes ni signos)`);
      else for (let j = 0; j < d.length; j++) cubierto[pos + j] = true;
    }
    if (typeof h.pantalla === "string" && !tsx.includes(h.pantalla)) errores.push(`hecho ${n}: el texto de pantalla «${h.pantalla.slice(0, 60)}» no está tal cual en video.tsx`);
    const texto = textoDe(h.fuente);
    if (texto === null) errores.push(`hecho ${n}: la fuente «${h.fuente}» no es un archivo de texto dentro de fuentes/ (captúrala con motor/capturar.mjs)`);
    else if (!texto.includes(normTexto(h.cita))) errores.push(`hecho ${n}: la cita «${h.cita.slice(0, 80)}» no aparece literalmente en ${h.fuente}`);
  });
  const crudas = guion.split(/\s+/).filter((x) => llano(x));
  tokens.forEach((t, i) => {
    if ((/\d/.test(t) || NUMEROS.has(t)) && !cubierto[i]) errores.push(`la voz dice «${crudas[i]}» (palabra ${i}) y ningún hecho lo respalda: añádelo a hechos.json con su fuente`);
  });
  // frases sin ningún hecho: no es un error (una pregunta o el cierre no necesitan fuente), pero el juez editorial lo mira
  let i0 = 0;
  for (const fr of p.datos.palabras.length ? frases() : []) {
    const n = fr.texto.split(/\s+/).map(llano).filter(Boolean).length;
    if (!cubierto.slice(i0, i0 + n).some(Boolean)) avisos.push(`sin hecho detrás: «${fr.texto}»`);
    i0 += n;
  }
  return { n: hechos.length, errores, avisos };
}

// ---------------------------------------------------------------------------------------------------------------------
// --preparar: sella el candidato y saca la evidencia que van a mirar los jueces
// ---------------------------------------------------------------------------------------------------------------------
async function preparar() {
  const archivo = posicionales[1] ? path.resolve(posicionales[1]) : path.join(p.dir, "revision", `${p.slug}.mp4`);
  if (!fs.existsSync(archivo)) throw new Error(`No encuentro ${archivo}: renderiza el vídeo entero antes («node motor/render.mjs ${p.slug}»).`);
  const dur = duracionDe(archivo);
  if (!Number.isFinite(dur) || Math.abs(dur - p.datos.duracion) > 0.35) throw new Error(`${path.basename(archivo)} dura ${dur.toFixed(2)} s y el vídeo tiene que durar ${p.datos.duracion.toFixed(2)} s: los jueces revisan el vídeo entero, no un tramo.`);
  const hechos = comprobarHechos();
  if (hechos.errores.length && !flag("--sin-hechos")) throw new Error(`Los hechos no cuadran:\n- ${hechos.errores.join("\n- ")}\n(«--sin-hechos» sigue sin ellos y lo deja apuntado en el candidato)`);
  const fr = frases();
  const firmaActual = firma(p.dir);
  // la puerta de las medidas: lo que se puede medir con una regla no se le manda a un juez (motor/medir.mjs)
  if (!flag("--sin-medir")) {
    const fm = path.join(p.dir, "revision", "medidas.json");
    const m = fs.existsSync(fm) ? leerJson(fm) : null;
    const pide = `«node motor/medir.mjs ${p.slug}» antes de sellar («--sin-medir» lo salta solo si el creador lo pide, y queda apuntado en notas.md)`;
    if (!m) throw new Error(`El vídeo no se ha medido: ${pide}.`);
    if (m.firma !== firmaActual.sha256 || !m.completo) throw new Error(`Las medidas son de otra versión del vídeo (o de unos fotogramas sueltos): ${pide}.`);
    if (m.errores) throw new Error(`Las medidas tienen ${m.errores} cosas que arreglar (revision/medidas.json): arréglalas y vuelve a medir antes de gastar una ronda de jueces.`);
  }
  // la puerta de las escenas: los ojos del creador van antes que una ronda de jueces (motor/escenas.mjs)
  if (!flag("--sin-aceptar")) {
    const e = escenasAceptadas(p.dir, firmaActual.sha256, p.slug);
    if (!e.ok) throw new Error(`No se sella sin las escenas aceptadas: ${e.motivo}. («--sin-aceptar» lo salta solo si el creador lo pide, y queda apuntado en notas.md)`);
  }
  // lo que queda de la ronda anterior: sus dictámenes y sus fotogramas, para que esta ronda verifique en vez de volver a auditarlo todo
  let anterior = null;
  const tmpAnt = path.join(p.dir, "revision", "_ronda-anterior");
  fs.rmSync(tmpAnt, { recursive: true, force: true });
  if (fs.existsSync(path.join(J, "candidato.json"))) {
    const ca = leerJson(path.join(J, "candidato.json"));
    if (ca.firma !== firmaActual.sha256) {
      anterior = { ronda: ca.ronda ?? 1, firma: ca.firma, dictamenes: {} };
      fs.mkdirSync(tmpAnt, { recursive: true });
      if (fs.existsSync(path.join(J, "fotogramas"))) fs.cpSync(path.join(J, "fotogramas"), path.join(tmpAnt, "fotogramas"), { recursive: true });
      for (const rol of ROLES) {
        const fd = path.join(J, `dictamen-${rol}.json`);
        if (!fs.existsSync(fd)) continue;
        try { const d = leerJson(fd); if (d.firma === ca.firma) { anterior.dictamenes[rol] = d; fs.copyFileSync(fd, path.join(tmpAnt, `dictamen-${rol}.json`)); } } catch { /* un dictamen roto no cuenta */ }
      }
    } else {
      // la misma versión, sellada otra vez: la ronda no avanza y se conserva lo de la anterior
      anterior = { mismaFirma: true, ronda: ca.ronda ?? 1, previo: ca.anterior ?? null };
      if (fs.existsSync(path.join(J, "anterior"))) { fs.mkdirSync(tmpAnt, { recursive: true }); fs.cpSync(path.join(J, "anterior"), path.join(tmpAnt, "anterior"), { recursive: true }); }
    }
  }
  fs.rmSync(J, { recursive: true, force: true });
  for (const d of ["fotogramas", "ciego", "rafagas", "hojas"]) fs.mkdirSync(path.join(J, d), { recursive: true });

  // los fotogramas con subtítulo, del mp4 tal cual: el gancho, cada frase, cada cambio de golpe y el final
  console.log("fotogramas…");
  // los cambios de golpe; si el vídeo pasa de un plano a otro sin cortes (empujones, fundidos), se buscan los cambios
  // suaves, para que el juez de movimiento tenga fronteras que revisar
  let cambios = cortesDe(archivo), cambiosOrigen = "cortes";
  for (const umbral of [0.15, 0.08]) if (cambios.length < 3) cambios = cortesDe(archivo, umbral);
  if (cambios.length < 3) { cambios = fr.slice(1).map((x) => x.inicio); cambiosOrigen = "frases"; } // sin cortes: cada comienzo de frase es una frontera que revisar
  const tiempos = new Set([0, 0.5, 1]);
  for (const f of fr) { tiempos.add(f.inicio + Math.min(0.3, (f.fin - f.inicio) / 2)); tiempos.add((f.inicio + f.fin) / 2); }
  for (const c of cambios) { tiempos.add(c - 0.3); tiempos.add(c + 0.3); }
  tiempos.add(dur - 0.1);
  // el último fotograma del vídeo está un poco antes de su duración (la pista de audio acaba después): no se pide más allá
  const lista = [...new Set([...tiempos].map((t) => +Math.min(dur - 0.12, Math.max(0, t)).toFixed(2)))].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] >= 0.05);
  const fotogramas = lista.flatMap((t) => {
    const out = path.join(J, "fotogramas", `f-${String(Math.round(t * 1000)).padStart(6, "0")}.png`);
    ffmpeg(["-ss", t.toFixed(3), "-i", archivo, "-frames:v", "1", "-vf", `scale=${Math.round(p.datos.ancho / 2)}:-2`, out]);
    if (!fs.existsSync(out)) { console.warn(`aviso: no hay fotograma en ${t.toFixed(2)} s (el vídeo acaba antes)`); return []; }
    return [{ archivo: relJ(out), segundo: t, sha256: shaArchivo(out) }];
  });

  // qué fotogramas cambiaron desde la ronda anterior (se comparan las imágenes, no los bytes: el vídeo se vuelve a comprimir)
  let ronda = 1, rondaAnterior = null;
  if (anterior && !anterior.mismaFirma) {
    ronda = anterior.ronda + 1;
    const cambiados = [], iguales = [];
    for (const f of fotogramas) {
      const viejo = path.join(tmpAnt, f.archivo);
      if (!fs.existsSync(viejo)) { cambiados.push(f.segundo); continue; }
      const r = spawnSync("ffmpeg", ["-hide_banner", "-i", path.join(J, f.archivo), "-i", viejo, "-lavfi", "psnr", "-f", "null", "-"], { encoding: "utf-8" });
      const m = /average:([\d.]+|inf)/.exec(r.stderr || "");
      (m && (m[1] === "inf" || parseFloat(m[1]) >= 36) ? iguales : cambiados).push(f.segundo);
    }
    fs.mkdirSync(path.join(J, "anterior"), { recursive: true });
    for (const rol of Object.keys(anterior.dictamenes)) fs.copyFileSync(path.join(tmpAnt, `dictamen-${rol}.json`), path.join(J, "anterior", `dictamen-${rol}.json`));
    rondaAnterior = { ronda: anterior.ronda, firma: anterior.firma, cambiados, iguales, veredictos: Object.fromEntries(Object.entries(anterior.dictamenes).map(([r, d]) => [r, d.veredicto])) };
  } else if (anterior?.mismaFirma) {
    ronda = anterior.ronda; rondaAnterior = anterior.previo;
    if (fs.existsSync(path.join(tmpAnt, "anterior"))) fs.cpSync(path.join(tmpAnt, "anterior"), path.join(J, "anterior"), { recursive: true });
  }
  fs.rmSync(tmpAnt, { recursive: true, force: true });

  // en la primera ronda: lo que dijo el juez de arte sobre los fotogramas quietos, antes de animar (--previo)
  let previo = null;
  if (ronda === 1 && fs.existsSync(path.join(P, "candidato.json")) && fs.existsSync(path.join(P, "dictamen-arte.json"))) {
    try {
      const cp = leerJson(path.join(P, "candidato.json")), dp = leerJson(path.join(P, "dictamen-arte.json"));
      if (dp.firma === cp.firma && dp.rol === "arte") {
        const iguales = [], cambiados = [], sinPareja = [];
        for (const fp of cp.fotogramas) {
          const par = fotogramas.find((x) => Math.abs(x.segundo - fp.segundo) < 0.011);
          if (!par) sinPareja.push(fp.segundo);
          else (igual(path.join(J, par.archivo), path.join(P, fp.archivo), 36) ? iguales : cambiados).push(fp.segundo);
        }
        fs.mkdirSync(path.join(J, "previo"), { recursive: true });
        fs.copyFileSync(path.join(P, "dictamen-arte.json"), path.join(J, "previo", "dictamen-arte.json"));
        previo = { firma: cp.firma, pasada: cp.ronda ?? 1, veredicto: dp.veredicto, iguales, cambiados, sinPareja };
      }
    } catch { /* un dictamen previo roto no cuenta */ }
  }

  // los fotogramas sin subtítulo, uno por frase, para la lectura a ciegas del juez editorial (los dibuja el motor)
  const ciego = [];
  if (!flag("--sin-ciego")) {
    console.log("fotogramas sin subtítulo para la lectura a ciegas…");
    const { tomarMotor } = await import("./lib/candado.mjs");
    await tomarMotor("los fotogramas para los jueces", p.slug);
    const { renderStill, selectComposition } = await import("@remotion/renderer");
    const serveUrl = await empaquetar(p);
    const inputProps = { datos: { ...p.datos, sinSubtitulos: true } };
    const composition = await selectComposition({ serveUrl, id: "video", inputProps });
    for (const [i, f] of fr.entries()) {
      const t = +((f.inicio + f.fin) / 2).toFixed(2);
      const output = path.join(J, "ciego", `c-${String(i + 1).padStart(2, "0")}.png`);
      await renderStill({ serveUrl, composition, inputProps, chromiumOptions: opcionesDeChromium(flag("--cpu")), frame: Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps)), output, scale: 0.5 });
      ciego.push({ archivo: relJ(output), segundo: t, frase: f.id, sha256: shaArchivo(output) });
    }
  }

  console.log("ráfagas y hojas…");
  const raf = rafagasDe(archivo, cambios, path.join(J, "rafagas")).map((f, i) => ({ archivo: relJ(f), segundo: cambios[i], sha256: shaArchivo(f) }));
  const hojas = laminasDelVideo(archivo, path.join(J, "hojas"), dur, p.datos.ancho, p.datos.alto).map(relJ);
  const audio = path.join(J, "audio.mp3");
  ffmpeg(["-i", archivo, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "96k", audio]);

  const candidato = {
    esquema: 1, slug: p.slug, fecha: new Date().toISOString(), firma: firmaActual.sha256, ronda, anterior: rondaAnterior, previo,
    video: { archivo: barras(path.relative(p.dir, archivo)), sha256: shaArchivo(archivo), duracion: +dur.toFixed(3), formato: perfil.id, ancho: p.datos.ancho, alto: p.datos.alto, fps: p.datos.fps },
    frases: fr, fotogramas, ciego, cambios: cambios.map((c) => +c.toFixed(2)), cambiosOrigen, rafagas: raf, hojas,
    audio: { archivo: "audio.mp3", sha256: shaArchivo(audio) },
    hechos: { n: hechos.n, errores: hechos.errores, avisos: hechos.avisos },
    entradas: firmaActual.archivos,
  };
  escribirJson(path.join(J, "candidato.json"), candidato);
  for (const rol of ROLES) fs.writeFileSync(path.join(J, `brief-${rol}.md`), brief(rol, candidato));
  if (rondaAnterior) console.log(`ronda ${ronda}: ${rondaAnterior.cambiados.length} fotogramas cambiaron y ${rondaAnterior.iguales.length} siguen igual; los jueces verifican lo anterior y miran lo que cambió`);
  if (previo) console.log(`el juez de arte ya revisó los fotogramas quietos (${previo.veredicto}): ${previo.iguales.length} siguen igual en el vídeo y ${previo.cambiados.length} cambiaron; en esta ronda verifica y mira lo que cambió al animar`);
  if (ronda > 3) console.log(`AVISO: es la ronda ${ronda}. A partir de la tercera no se sigue sin el creador: enséñale el vídeo con lo que queda abierto y que decida él (plugin/skills/video/SKILL.md §8).`);
  console.log(`candidato sellado: firma ${candidato.firma.slice(0, 12)}…, ${fotogramas.length} fotogramas, ${ciego.length} a ciegas, ${cambios.length} cambios de golpe, ${hojas.length} hojas`);
  if (hechos.avisos.length) console.log(`frases sin hecho detrás (lo mira el juez editorial): ${hechos.avisos.length}`);
  console.log(`briefs: ${ROLES.map((r) => barras(path.relative(TALLER, path.join(J, `brief-${r}.md`)))).join(", ")}`);
  console.log(`ahora: tres jueces con contexto limpio, uno por brief (los agentes juez-editorial, juez-arte y juez-movimiento del plugin, que van en Opus; otro modelo solo si el creador lo pide, y se apunta en notas.md); «--audio --enviar»; y «--veredicto».`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Los briefs: lo que recibe cada juez, y nada más. Se escriben para alguien que no ha visto nada del proyecto, y le
// piden mirar como un profesional: con medidas, ampliando el detalle, plano a plano, y con un baremo en el que un
// defecto de acabado visible bloquea la entrega. Lo que el creador fijó en preferencias.md no es hallazgo.
// ---------------------------------------------------------------------------------------------------------------------
/** los planos del vídeo: los tramos entre fronteras (cortes de golpe, o comienzos de frase si no los hay) */
const planosDe = (c) => {
  const b = [0, ...c.cambios, c.video.duracion];
  return b.slice(1).map((hasta, i) => ({ n: i + 1, desde: b[i], hasta }));
};
const seg = (x) => `${x.toFixed(2)} s`;
/** qué vídeo es, quién lo ve y qué le tapa su red: sale del perfil de su formato */
const presenta = (c, verbo = "Es") => `${verbo} ${perfil.es} (${c.video.ancho}×${c.video.alto}, ${c.video.duracion.toFixed(1)} s) para ${perfil.para}: ${perfil.quien}.
${fraseZonas(perfil)}${p.datos.subtitulo === false && perfil.subtitulos === "srt" ? `
No lleva el subtítulo dibujado: va en un archivo aparte (.srt) que ${perfil.red} pone encima, abajo. Que no se vea
subtítulo no es un hallazgo; sí lo es que algo que hay que leer caiga donde ${perfil.red} lo pone.` : ""}`;

// lo que el creador decidió para este vídeo: decisiones.md (lo apunta quien hace el vídeo, con las palabras del
// creador) y lo que dijo al aceptar las escenas. Va en todos los briefs: un juez no reabre lo que él ya decidió.
function decidido() {
  const f = path.join(p.dir, "decisiones.md");
  const propias = fs.existsSync(f) ? fs.readFileSync(f, "utf-8").replace(/^#\s.*\r?\n/, "").trim() : "";
  let dichas = [];
  try {
    const a = leerJson(path.join(carpetaEscenas(p.dir), "aceptaciones.json"));
    const porFrase = new Map();
    for (const [id, x] of Object.entries(a.escenas ?? {})) porFrase.set(x.palabras, [...(porFrase.get(x.palabras) ?? []), id]);
    dichas = [...porFrase].map(([palabras, ids]) => `- Al ver ${ids.length > 6 ? `${ids.length} escenas` : ids.join(", ")}: «${palabras}»`);
  } catch { /* todavía no ha aceptado nada */ }
  if (!propias && !dichas.length) return "";
  return `
## Decidido por el creador: no es hallazgo

Quien encargó el vídeo ya vio estas imágenes y decidió lo que sigue, con sus palabras. No lo reabras: nada de esta
lista puede ser un hallazgo, de ninguna severidad, aunque tú lo harías de otra forma. Si una de estas decisiones rompe
algo que se mide (un texto que deja de leerse, una pieza que se corta), apunta ese defecto y di a qué decisión toca;
la decisión, no.
${propias ? `\n${propias}\n` : ""}${dichas.length ? `\nLo que dijo al aceptar las escenas:\n${dichas.join("\n")}\n` : ""}`;
}

const baremo = (preferencias) => `## El baremo

- **Crítica:** hace que la gente se vaya, o el vídeo dice algo falso.
- **Alta:** no se entiende o no se lee; o un **defecto de acabado visible**: algo descentrado, torcido, que se
  toca o se roza, una línea que pisa una etiqueta, un icono genérico donde toca el real, un texto por debajo de su
  tamaño mínimo, una pantalla que parece una maqueta, un aro o una sombra que no toca, una pieza que parpadea o salta.
  Lo que un profesional mandaría rehacer antes de enseñárselo al cliente es alto **aunque sea pequeño**; no lo rebajes a
  medio para poder aprobar.
- **Media:** afea o distrae, pero no es un defecto medible de los de arriba.
- **Baja:** un detalle que solo se ve ampliando.

### Defecto o criterio

Cada hallazgo dice de qué tipo es (\`tipo\`):

- **defecto:** algo roto que se señala y se mide, y que cualquiera daría por un fallo. Una pieza o un texto cortado por
  el borde o por su contenedor; dos cosas que se pisan; un texto por debajo de su mínimo o que no se lee; algo que va
  centrado en su contenedor y no lo está; un icono genérico donde toca el real; un salto, un parpadeo o una pieza que
  desaparece a medio recorrido; un tramo de más de dos segundos en el que nada cambia; un dato falso; una imagen que
  dice otra cosa que la voz; un plano que es solo texto mientras la voz explica cómo funciona algo.
- **criterio:** tu opinión de oficio sobre cómo quedaría mejor: la composición, cuánto llena el plano, cómo se reparte
  el aire, el estilo, si algo iría mejor en 2D o en 3D, si un movimiento podría explicar más, si sobra un adorno.

**Solo bloquean los defectos críticos o altos.** Un criterio no bloquea, por alta que sea su severidad: se le enseña al
creador y decide él. No vistas un criterio de defecto para que bloquee, ni rebajes un defecto a criterio para poder
aprobar. Si dudas, pregúntate: ¿esto está roto, o yo lo haría de otra manera?

**No es hallazgo** lo que el creador decidió para todos sus vídeos. Léelo en \`${preferencias}\` (apartados «La marca»
y «Cómo se ven»): por ejemplo, la cabecera de la marca arriba y el logo abajo a la derecha están a propósito en zonas que
${perfil.red} tapa, y si pidió 2D es 2D. Tampoco lo es el gusto («yo lo haría más grande»): un hallazgo lleva una medida o
una comparación («el icono está 11 px a la izquierda del centro de su círculo de 208 px, recorte de f-000910») y dice
qué pierde quien mira. Tres hallazgos medidos valen más que siete impresiones; no rellenes.

`;

// las medidas (letra, aire, zonas) son las del perfil del vídeo: en un 16:9 de YouTube no valen las de un reel
const L = perfil.letra;
// lo que el director apuntó que quería que actuara en cada escena (planos.md): el juez lo lee después de mirar
const PLAN_VISUAL = fs.existsSync(path.join(p.dir, "planos.md"))
  ? ` Quien hizo el vídeo apuntó en \`${barras(path.join(p.dir, "planos.md"))}\` qué quería que actuara en cada escena y qué
  tenía que explicar: léelo **después** de mirar y comprueba que eso se ve. Que cumpla su propio plan no lo aprueba: si el
  plan ya era un panel de texto, es alto igual.`
  : "";
const CRITERIOS_ARTE = `- **La imagen explica** (lo primero que miras, antes que el acabado). Tapa lo que se lee: ¿se entiende qué pasa? Tiene que
  haber un objeto que **actúa** y que cuenta la idea de la frase: algo que nace, se mueve, se transforma, pasa de mano
  en mano, se llena o se apaga. Un texto que nombra la idea, una lista, una tabla de campos, una ventana con letras o
  un diagrama de líneas finas con iconos pequeños no la cuentan: la rotulan. Apunta en \`actua\` qué objeto es y qué
  explica, en una frase («dos aros pasan de un robot a otro: solo avanza el que tiene uno»). Si lo único que puedes
  apuntar es «aparece un texto», «se resalta una fila» o «una ventana con letras», es un panel de texto, y es **alto**;
  solo se salva una pantalla recreada con texto real capturado que dure lo que se tarda en leerla y que no sea el
  vídeo entero. Mide dos cosas. **Cuánto llena:** el rectángulo que envuelve todo lo dibujado (sin la marca del
  creador) frente a la parte del cuadro que ${perfil.red} deja ver; apúntalo en \`ocupa\`, en %. Es un dato, no una nota: un
  plano limpio y con aire puede ser justo lo que el creador quiere. Solo es hallazgo (de criterio) si una mitad del
  cuadro queda vacía mientras lo demás se apiña en la otra. **Cuánto hay que leer:** más de ${DIBUJO.palabras} palabras a la vez
  es alto si no es una pantalla capturada. El sujeto se ve bien a tamaño de móvil: no es una fila de iconos de 60 px.
  **No tiene que ser 3D.** El estilo de partida es el 2D limpio y bien diseñado; el 3D va solo donde un objeto que
  actúa lo pide. Una tarjeta, un vídeo, una hoja o una etiqueta van planos. Que un plano sea 2D no es hallazgo; un 3D
  que recarga el plano, o que está puesto sin que nada actúe, es un criterio.${PLAN_VISUAL}
- **El acabado del 3D** (si el plano es en 3D). Tiene que verse como un render de producto, no como un juguete de
  plástico mate: los cuerpos reflejan la luz (cerámica con barniz, cristal, metal) con brillos anchos y suaves; el
  suelo refleja lo que tiene encima; cada pieza tiene su sombra de contacto; los cantos están redondeados y las curvas
  no enseñan facetas; solo resplandece lo que emite luz (unos ojos, un piloto), sin halos que laven el plano ni
  blancos quemados. Color plano sin brillo, cajas de cantos vivos, facetas a la vista, una pieza flotando sin sombra
  o un plano quemado de luz es **alto**.
- **Composición.** Los márgenes del plano son iguales a izquierda y derecha (±10 %). Todo lo que está dentro de un
  contenedor está centrado en él: la desviación no pasa del 2 % del contenedor (en un círculo de 200 px, 4 px). Dos
  piezas sueltas (una figura y una ventana, un rótulo y una tarjeta) distan al menos ${perfil.aire.piezas} px, y si sobra sitio el espacio
  libre se reparte: una pieza no se pega a otra ni a un borde dejando un hueco al otro lado. Mide la distancia entre
  cada pareja de piezas vecinas. Hay rejilla: las tarjetas apiladas empiezan en la misma x, las filas tienen la misma
  altura, los textos de una columna están alineados. Los planos equivalentes (dos ventanas, dos tarjetas, dos escenas
  con la misma estructura) tienen las mismas medidas y los mismos márgenes: pon uno al lado del otro.
- **Diagramas.** Recorre cada línea de punta a punta: ninguna cruza por encima de un nodo, una píldora o una etiqueta.
  Las conexiones son rectas, o curvas ordenadas de la misma familia; todas salen por el mismo lado del nodo de origen y
  entran por el mismo lado del destino, y sus anclajes están alineados. Los nodos equivalentes tienen el mismo tamaño
  (±2 px) y están a la misma distancia. Las líneas miden al menos ${perfil.aire.linea} px de grosor, y nada se monta sobre ellas. Para un
  canal con etapas equivalentes, el título va centrado y las dimensiones igualadas.
- **Iconografía.** Una marca (Facebook, GitHub, YouTube…) lleva su icono real; un concepto (dinero, documento, web) un
  icono de verdad. Un círculo, un cuadrado o un punto de color puestos donde tocaba un icono son relleno, y es alto.
  Cada icono está centrado ópticamente en su círculo o su caja, mide lo mismo que sus hermanos y comparte estilo (trazo,
  relleno, grosor) con los demás del plano.
- **Tipografía** (a ${perfil.ancho}×${perfil.alto}; en el móvil se ve ${perfil.enMovil}). ${perfil.subtitulos === "quemados" ? "Subtítulo y rótulos" : "Rótulos"} principales ≥ ${L.rotulo} px. Lo que hay que
  leer en una pantalla recreada (una pregunta, una respuesta, una cifra) ≥ ${L.pantalla} px; un enlace o un dato que alguien
  copiaría ≥ ${L.enlace} px. Etiquetas secundarias (el nombre de un nodo, una píldora, una clave) ≥ ${L.secundaria} px; si no llegan, no pueden
  llevar información que importe. Nada con letras por debajo de ${L.minima} px. El texto no se corta, no desborda su caja ni se
  pega a su borde (margen interno ≥ ${perfil.aire.borde} px), y no se monta con otro texto. Mide la altura de las mayúsculas en el recorte.
- **Pantallas recreadas.** Texto real y legible, o nada: barras grises de relleno, cajas vacías, botones sin nombre y
  texto de mentira hacen que parezca una maqueta, y eso es alto. Un esqueleto de carga solo vale si imita uno real,
  dura poco y está «cargando». Barra de título, márgenes, radios y letra coherentes entre todas las ventanas del vídeo.
- **Color.** El vídeo tiene una paleta con papeles: un lienzo, una familia de superficies (tarjetas y ventanas), el
  texto y uno o dos acentos. Las superficies son de la misma familia de tono, o grises: una tarjeta azulada junto a una
  ventana gris, o una caja teñida de otro tono que el fondo, se ven de dos juegos distintos, y es alto. La misma pieza
  tiene el mismo color en todos los planos. El acento vale por escaso: marca lo que importa en ese plano, no decora;
  más de tres colores vivos a la vez se ve cargado (medio; alto si compiten con lo que hay que leer). Un bloque lleva
  una sola familia de color: fondo, borde, icono y texto no son de tres colores distintos. El texto secundario sale del
  tono de su fondo, no de un gris cualquiera. El color de una marca ajena (el rojo de YouTube) lleva significado y no
  cuenta como acento. Contraste: 4,5:1 un texto, 3:1 un rótulo grande. Di cada color por su código, no «un azul».
- **Artefactos.** Aros, brillos, sombras o reflejos que no se corresponden con la forma (un arco de brillo suelto dentro
  de una esfera); halos o sombras cortados por su contenedor o por el borde; bordes de un píxel que asoman; formas
  achatadas (un círculo ovalado); costuras entre piezas; texto o formas pixelados; degradados con bandas; algo que se
  ve a medio dibujar en un plano quieto.
- **Zonas de ${perfil.red}.** ${perfil.zonas.length ? `Nada que haya que leer o ver en ${dondeNo(perfil)}, y ${perfil.holgura} px de
  margen de más.` : "No tapa nada del cuadro."} Lo que el creador puso ahí a propósito (su marca) no es hallazgo.
- **Foco y estilo.** Un foco dominante por plano; el encuadre lleno (sin bandas ni cosas pequeñas flotando en vacío),
  con aire (lleno no es apiñado); la cosa de verdad grande y de cerca, limpia como un render de producto; paleta, luz y
  acabado iguales de principio a fin; nada que parezca decoración genérica. Se entiende de qué va mirando solo las
  imágenes.`;

function brief(rol, c) {
  const abs = (f) => barras(path.join(J, f));
  const guion = barras(path.join(p.dir, "guion.txt")), hechos = barras(path.join(p.dir, "hechos.json"));
  const preferencias = barras(path.join(TALLER, "preferencias.md"));
  const mp4 = barras(path.join(p.dir, c.video.archivo));
  const dictamen = abs(`dictamen-${rol}.json`);
  const planos = planosDe(c);
  const listaPlanos = planos.map((x) => `plano ${x.n}: ${x.desde.toFixed(2)}–${x.hasta.toFixed(2)} s`).join(" · ");
  const esquemaExtra = rol === "editorial" ? `,
 "lecturaVisual": [
  { "frase": "frase-01", "archivo": "ciego/c-01.png", "segundo": 1.2, "visto": "lo que viste, literal, antes de leer nada", "correspondencia": "coincide | parcial | no_coincide" }
 ]` : rol === "movimiento" ? `,
 "transiciones": [
  { "segundo": 4.13, "antes": { "segundo": 3.83, "archivo": "fotogramas/f-003830.png", "observacion": "estado al salir" },
    "despues": { "segundo": 4.43, "archivo": "fotogramas/f-004430.png", "observacion": "lo que continúa" },
    "puente": "qué lleva de un plano al otro (o «corte seco sin puente»)", "asienta": "cuándo frena y se queda quieto lo nuevo, y si llega antes de que la voz siga" }
 ],
 "intervalosRevisados": [[0, ${c.video.duracion.toFixed(1)}]]` : `,
 "planos": [
  { "desde": 0, "hasta": ${(c.cambios[0] ?? c.video.duracion).toFixed(2)}, "archivo": "fotogramas/f-000910.png", "segundo": 0.91,
    "ampliado": "qué piezas recortaste a tamaño real (figura, icono, ventana, diagrama) y qué mediste en cada una", "textoMinimo": ${L.pantalla},
    "actua": "qué objeto actúa y qué explica, en una frase (o «solo texto»)", "ocupa": 72 }
 ]`;

  const ant = c.anterior;
  const rondaTxt = !ant ? "" : `
## Esta es la ronda ${c.ronda}: verifica y mira lo que cambió, no vuelvas a auditarlo todo

Otro juez con tu mismo papel revisó la versión anterior del vídeo${ant.veredictos?.[rol] ? ` y dijo **${ant.veredictos[rol]}**. Su dictamen: \`${abs(`anterior/dictamen-${rol}.json`)}\`` : " (su dictamen no se conserva)"}.
Desde entonces cambiaron los fotogramas de ${ant.cambiados.length ? ant.cambiados.map(seg).join(", ") : "ningún segundo del catálogo"}; el resto
(${ant.iguales.length} fotogramas) es la misma imagen que él ya revisó.

1. Comprueba uno a uno sus hallazgos críticos, altos y medios: resuelto, sigue igual o resuelto a medias. Lo que siga
   abierto va en tu dictamen con su severidad; lo resuelto no se menciona.
2. Revisa con todo el baremo los fotogramas que cambiaron y sus fronteras: ahí puede haber defectos nuevos, y un arreglo
   puede haber roto otra cosa.
3. Cada hallazgo dice de dónde sale (\`origen\`): **anterior** (ya estaba en su dictamen y sigue abierto), **cambio**
   (está en un fotograma que cambió o en su frontera) o **nuevo** (está en una imagen que no cambió y él no lo apuntó).
   Un hallazgo nuevo solo bloquea si es crítico: lo demás llega tarde, no bloquea y se le enseña al creador. No
   conviertas en alto lo que él valoró como medio o bajo, ni cambies de criterio de una ronda a otra: un vídeo que solo
   recibe objeciones nuevas sobre imágenes que no han cambiado no converge.
4. La cobertura del dictamen sigue siendo completa (el motor la valida). Para lo que no cambió puedes apoyarte en sus
   entradas, comprobando en el catálogo que la imagen sigue igual.
`;
  const pv = rol === "arte" && !ant ? c.previo : null;
  const previoTxt = !pv ? "" : `
## Antes de animar, otro juez de arte ya revisó los fotogramas quietos

Revisó las escenas de este vídeo cuando solo eran fotogramas quietos y dijo **${pv.veredicto}**. Su dictamen:
\`${abs("previo/dictamen-arte.json")}\`. De los fotogramas que él vio, en el vídeo siguen igual los de
${pv.iguales.length ? pv.iguales.map(seg).join(", ") : "ningún segundo"}; cambiaron los de ${pv.cambiados.length ? pv.cambiados.map(seg).join(", ") : "ningún segundo"}${pv.sinPareja.length ? `; ${pv.sinPareja.length} no tienen pareja en tu catálogo` : ""}.

1. Comprueba uno a uno sus hallazgos críticos, altos y medios: lo que siga abierto va en tu dictamen con su severidad;
   lo resuelto no se menciona.
2. Lo tuyo ahora es lo que él no pudo ver: los estados intermedios (lo que se ve mientras las piezas entran y salen),
   los fotogramas que cambiaron al animar y el vídeo ya comprimido. Eso se revisa con todo el baremo.
3. En las imágenes que siguen igual no abras hallazgos nuevos, salvo un defecto crítico o alto que se pueda medir y
   que él dejara pasar. No conviertas en alto lo que él valoró como medio o bajo: un vídeo que solo recibe objeciones
   nuevas sobre imágenes que no han cambiado no converge.
4. La cobertura del dictamen sigue siendo completa (una entrada por plano; el motor la valida).
`;
  const comun = `# Brief del juez de ${rol} · vídeo «${p.video.titulo ?? p.slug}»

Eres un juez independiente y un profesional de esto. No hiciste este vídeo y no conoces a quien lo hizo: tu trabajo es
decir si se entrega o se vuelve a trabajar, con pruebas y con medidas, como lo haría un director de arte o un animador
senior antes de enseñárselo a un cliente. No hables con los otros jueces ni leas sus dictámenes. No des notas
numéricas: devuelves **aprobar** o **iterar** y hallazgos que citen el segundo y el archivo donde se ve.

${presenta(c)}

${rondaTxt}${previoTxt}${decidido()}
## La evidencia

Candidato sellado: firma \`${c.firma}\` (cópiala tal cual en el dictamen). Catálogo: \`${abs("candidato.json")}\`.
Solo puedes citar como evidencia archivos de ese catálogo con su segundo exacto. Las imágenes del catálogo están a la
**mitad** de tamaño (${mitad}): una medida tomada en ellas, ×2, es la medida real. Da todas las medidas a ${entero}. La
fila amarilla de arriba es el segundo del vídeo.

- Fotogramas ${p.datos.subtitulo === false ? "del vídeo tal cual" : "con subtítulo"} (\`fotogramas/f-<ms>.png\`): ${c.fotogramas.map((f) => seg(f.segundo)).join(", ")}.
- Hojas de contacto del vídeo entero, un fotograma cada tercio de segundo: ${c.hojas.map(abs).join(", ")}.
- Ráfagas a 30 fps alrededor de cada frontera (\`rafagas/en-<s>.jpg\`): ${c.cambios.map(seg).join(", ")}.${c.cambiosOrigen === "frases" ? " El vídeo no tiene cortes de golpe (pasa de un plano a otro con empujones y fundidos): las fronteras que se revisan son los comienzos de frase." : ""}
${c.ciego.length ? `- Fotogramas sin subtítulo, uno por frase (\`ciego/c-NN.png\`): ${c.ciego.map((x) => `${x.archivo} (${seg(x.segundo)})`).join(", ")}.\n` : ""}- Los planos (los tramos entre fronteras): ${listaPlanos}.

**Cómo mirar de cerca.** Las imágenes del catálogo sirven para el barrido; el detalle se juzga a tamaño real. Saca el
fotograma entero a ${entero} y recorta la pieza que miras (la figura, el icono con su círculo, la ventana, el diagrama)
a una carpeta temporal tuya, y lee el recorte: así ves cada pieza al doble de lo que enseña el catálogo (una lupa a 2×).

\`\`\`
ffmpeg -y -ss 12.59 -i "${mp4}" -frames:v 1 <tmp>/p-12590.png
ffmpeg -y -ss 12.59 -i "${mp4}" -frames:v 1 -vf "crop=600:600:240:500" <tmp>/d-12590-esfera.png   (crop=ancho:alto:x:y)
ffmpeg -y -ss 12.40 -t 0.34 -i "${mp4}" -vf "fps=30,scale=${Math.round(p.datos.ancho / 2)}:-2" <tmp>/r-12400-%02d.png            (diez fotogramas seguidos)
\`\`\`

Un recorte de 600×600 cuesta una fracción de un fotograma: saca los que necesites (dos o tres por plano), pero no saques
el vídeo entero a tamaño real ni vuelvas a leer dos veces las mismas imágenes del catálogo. En \`evidencias\` y en los
hallazgos cita siempre el archivo del catálogo más cercano y cuenta en \`observacion\` o \`explicacion\` lo que viste
en el recorte, con su medida.

${baremo(preferencias)}## El dictamen

Escríbelo en \`${dictamen}\` con esta forma (JSON válido, sin comentarios):

\`\`\`json
{
 "esquema": 1,
 "firma": "${c.firma}",
 "rol": "${rol}",
 "agente": "un identificador tuyo único (por ejemplo «juez-${rol}-<fecha-hora>»)",
 "fecha": "ISO 8601",
 "veredicto": "aprobar | iterar",
 "hallazgos": [
  { "severidad": "critica | alta | media | baja", "tipo": "defecto | criterio",${ant ? ` "origen": "anterior | cambio | nuevo",` : ""} "estado": "abierto", "segundo": 12.3, "archivo": "fotogramas/f-012300.png",
    "explicacion": "qué está mal, con su medida, y por qué importa a quien lo ve en el móvil", "comprobacion": "qué tendría que verse (y medirse) para darlo por resuelto" }
 ],
 "evidencias": [
  { "segundo": 0.5, "archivo": "fotogramas/f-000500.png", "observacion": "qué comprobaste ahí" },
  { "segundo": 12.3, "archivo": "fotogramas/f-012300.png", "observacion": "…" }
 ]${esquemaExtra}
}
\`\`\`

Reglas: al menos dos evidencias de archivos distintos. «aprobar» si no queda ningún **defecto** crítico o alto abierto;
«iterar» si queda alguno. Los criterios no bloquean: van en la lista con su \`tipo\` y los decide el creador. Cada hallazgo propone cómo comprobar que se arregló. No inventes lo que no viste: si no pudiste comprobar
algo, dilo en \`observacion\`.
`;

  if (rol === "editorial") return comun + `
## Lo tuyo: que se entienda, y que sea verdad

**Primer pase, a ciegas.** Antes de leer el guion o cualquier otro archivo del proyecto, mira SOLO las imágenes
\`ciego/c-NN.png\`, en orden (una por frase de la voz, sin subtítulo). Para cada una escribe en \`lecturaVisual.visto\` lo
que ves, literal, como lo diría alguien que pasa por ahí: qué objeto, qué pasa, qué dice el texto que hay en pantalla.
No adivines metáforas. Guarda esa lista antes de seguir.

**Segundo pase.** Lee entonces \`${guion}\` (lo que dice la voz) y \`${hechos}\` (cada dato con su fuente). Las frases y
sus tiempos:
${c.frases.map((f) => `- ${f.id} (${f.inicio.toFixed(2)}–${f.fin.toFixed(2)} s): «${f.texto}»`).join("\n")}

Para cada frase, compara lo que viste a ciegas con lo que dice la voz y pon \`correspondencia\`: **coincide** si la
imagen enseña eso (literal y al momento), **parcial** si enseña algo relacionado pero no eso, **no_coincide** si no
tiene que ver o se podría leer al revés. Cualquier parcial o no_coincide es un hallazgo alto, y el veredicto es iterar.

**Tercer pase, con los fotogramas con subtítulo.** Comprueba, y cita dónde:
- El primer segundo (0 s, 0,5 s, 1 s) enseña la promesa, sin esperar, a alguien que no sabe nada del tema.
- Una sola idea; ${perfil.subtitulos === "quemados" ? "se entendería sin sonido; " : ""}cada frase aporta algo nuevo (un tramo que repite lo ya dicho es medio).
- La imagen no insinúa cifras, causas, resultados o funciones que la voz y los hechos no respaldan. Si la imagen dice
  algo que la voz no dice y se podría leer mal, es alto.
- Todo texto que se lee en una pantalla recreada es texto real, y está en hechos.json con su fuente: un texto de relleno,
  un «lorem», una ruta o un nombre inventados son altos. Las barras grises sin letras no cuentan como texto, pero si
  sustituyen a algo que debería leerse, dilo.
- Cada rótulo aporta identidad o relación (quién es, de qué equipo, para qué cliente, qué paso del proceso); un rótulo
  que solo repite lo que dice la voz sobra (medio). Los identificadores de empresa, equipo y cliente van debajo de su
  figura, no sueltos.
${c.hechos.avisos.length ? `- Frases sin hecho detrás (no es un error si son preguntas o el cierre, pero compruébalas): ${c.hechos.avisos.map((a) => a.replace("sin hecho detrás: ", "")).join(" · ")}\n` : ""}- El cierre pide una sola cosa y se acaba cuando está dicho. Si enseña un enlace o un dato para copiar, se lee entero.
No juzgues lo bonito ni el movimiento: eso es de otros jueces.
`;

  if (rol === "arte") return comun + `
## Lo tuyo: el acabado, como lo miraría un director de arte

Dos miradas, y las dos cuentan. **La de móvil**: las hojas de contacto y los fotogramas sin ampliar (piensa en ${perfil.movil});
si algo no se lee así, no se lee. **La de detalle**: plano a plano, cada pieza a tamaño real con los recortes (arriba).
Un plano se da por mirado cuando has recortado y medido cada figura, cada icono con su contenedor, cada ventana o
tarjeta y cada diagrama que hay en él, y lo has comparado con los planos equivalentes.

**Por cada plano** (${listaPlanos}) escribe una entrada en \`planos\`: qué fotograma del catálogo lo representa, qué
recortaste y qué mediste (\`ampliado\`), y el texto más pequeño que hay que leer en él, en px a ${entero} (\`textoMinimo\`;
null si no hay texto). Comprueba en cada uno:

${CRITERIOS_ARTE}

Lo roto que se ve en el recorte a tamaño real (cortado, pisado, descentrado en su contenedor, ilegible, un icono
genérico, un plano que es solo texto) es un **defecto alto**. Cuánto llena el plano, cómo se reparte el aire y si algo
iría mejor en 2D o en 3D son **criterio**. No juzgues el guion ni el ritmo: eso es
de otros jueces.
`;

  return comun + `
## Lo tuyo: cómo se mueve, como lo miraría un animador

${perfil.ritmo}; si se mueve sin sentido o con un fallo, lo nota aunque no
sepa decir qué. Revisa el vídeo en movimiento, no dos fotos: las hojas de contacto (un fotograma cada tercio de segundo),
las ráfagas a 30 fps de cada frontera y, donde dudes, diez fotogramas seguidos de ese instante con ffmpeg (arriba).

**Por cada frontera** (${c.cambios.map(seg).join(", ")}${c.cambiosOrigen === "frases" ? "; son los comienzos de frase, porque no hay cortes de golpe" : "; son los cortes de golpe"}) escribe una
entrada en \`transiciones\`: el estado justo antes, el justo después (dos fotogramas del catálogo a menos de 0,5 s de la
frontera, uno antes y otro después), el \`puente\` (qué lleva de uno a otro: la cámara entra en algo, un objeto que
sigue, un fundido con sentido… o «corte seco sin puente») y \`asienta\` (cuándo frena y se queda quieto lo nuevo). Una
transición tiene tres momentos y se juzgan los tres: **entra** (lo nuevo empieza a dibujarse o a llegar), **pasa** (los
dos conviven con sentido: lo viejo se va mientras lo nuevo llega, nunca dos textos legibles uno encima del otro) y
**asienta** (lo nuevo frena y se queda quieto antes de que la voz siga). Lo que sigue en el plano siguiente se queda en
su sitio: un objeto que se desvanece y vuelve a crecer en el mismo lugar, o que parpadea, es alto. Un corte que lleva a
casi la misma imagen, o un plano que cambia sin que la voz lo pida, es alto.

Mira además, y mide en las ráfagas (la distancia entre posiciones de fotogramas seguidos):
- **Arranque y frenado.** Los pasos entre fotogramas seguidos son pequeños al principio, grandes en medio y pequeños al
  final. Pasos iguales es movimiento lineal; un paso enorme es un teletransporte; los dos son altos. Al asentarse, como
  mucho un rebote pequeño y se para: nada vibra ni sigue derivando después.
- **Nada quieto más de dos segundos.** Compara fotogramas separados un segundo en las hojas: si son idénticos salvo el
  subtítulo, es un tramo muerto, y es alto. Un plano en el que solo late una barra o parpadea un ojo sigue siendo un
  plano quieto: un movimiento secundario aislado no basta.
- **El movimiento explica.** En cada frase, lo que cambia en pantalla es lo que la frase cuenta: un objeto hace algo
  (va, vuelve, se reparte, se llena, se rompe, pasa de mano en mano). Si en un tramo lo único que cambia es que aparece
  un texto, se resalta una etiqueta o late un adorno, ese tramo no explica nada con el movimiento, y es **alto** aunque
  técnicamente «se mueva»; apúntalo con sus segundos. La cámara hace un movimiento por idea y revela una relación (de
  dónde sale algo, qué hay dentro, a dónde llega): dos movimientos a la vez, o uno sin motivo, es medio. Lo que sigue
  de una escena a la siguiente viaja hasta su nuevo sitio: no se corta y vuelve a aparecer.
- **Movimiento secundario con sentido.** Lo que se mueve cuenta algo (el agente mira lo que hace, la barra carga porque
  carga, la cámara entra en lo que la voz nombra). Órbitas, zooms, parallax o temblores sin cambio de información son
  medios; si marean o impiden leer, altos.
- **Nada se solapa ni se corta.** Una pieza no desaparece a medio recorrido, no la tapa otra mientras se lee, no la
  recorta su contenedor ni el borde del plano al moverse, no deja un hueco roto al irse. Las piezas iguales (las filas
  de una lista, los nodos de un diagrama) entran con la misma curva, en orden y con un escalonado regular; los nodos y
  conexiones de un diagrama se revelan uno a uno. El texto de las pantallas solo aparece en su sitio con un fundido; si
  se desplaza o se reescala mientras se lee, «nada», y es alto. La cámara sobre una pantalla solo da empujones cortos y
  frenados entre encuadres quietos.
- **Todo cae en la voz.** Cada cambio cae en la palabra que lo pide, con un margen de 0,15 s (unos diez fotogramas de
  ráfaga). Los tiempos de las frases: ${c.frases.map((f) => `${f.id} ${f.inicio.toFixed(2)} s`).join(", ")}.
- **Principio y final.** En el fotograma 0 ya hay algo dibujándose o llegando, no un plano hecho y parado. El cierre no
  se congela más de un segundo.
De esta lista son **defecto**: un salto o un teletransporte, un parpadeo, una pieza que se corta, se pisa o desaparece
a medio recorrido, dos textos legibles uno encima del otro, un tramo de más de dos segundos en el que nada cambia, un
tramo en el que solo aparece texto mientras la voz explica cómo funciona algo, y un cambio que cae a más de 0,15 s de
su palabra. Son **criterio**: la curva de arranque y frenado, la cámara, el movimiento secundario, el escalonado y que
un movimiento podría explicar más de lo que explica.

Anota en \`intervalosRevisados\` los tramos que revisaste de verdad; tienen que cubrir el vídeo entero. No puedes oír
el vídeo: el audio lo revisa otro juez. No juzgues el guion ni la paleta.
`;
}

// ---------------------------------------------------------------------------------------------------------------------
// --previo: el juez de arte, antes de animar. Mira los fotogramas quietos de cada escena (los de motor/escenas.mjs),
// cuando arreglar un defecto de acabado cuesta segundos y no una ronda entera. Va antes de enseñarle las escenas al
// creador, para que él decida sobre el gusto y no tenga que señalar defectos. En la ronda final, el juez de arte recibe
// este dictamen y solo verifica y mira lo que cambió al animar.
// ---------------------------------------------------------------------------------------------------------------------
const P = path.join(p.dir, "revision", "previo");

function prepararPrevio() {
  const hechos = comprobarHechos();
  if (hechos.errores.length && !flag("--sin-hechos")) throw new Error(`Los hechos no cuadran:\n- ${hechos.errores.join("\n- ")}\n(«--sin-hechos» sigue sin ellos y lo deja apuntado en el candidato)`);
  const firmaActual = firma(p.dir).sha256;
  if (!flag("--sin-medir")) {
    const fm = path.join(p.dir, "revision", "medidas.json");
    const m = fs.existsSync(fm) ? leerJson(fm) : null;
    if (!m || m.firma !== firmaActual || !m.completo) throw new Error(`El vídeo no se ha medido en esta versión: «node motor/medir.mjs ${p.slug}» antes de llamar al juez de arte.`);
    if (m.errores) throw new Error(`Las medidas tienen ${m.errores} cosas que arreglar (revision/medidas.json): arréglalas y vuelve a medir antes de gastar un juez.`);
  }
  const est = leerEstadoEscenas(p.dir);
  if (!est || est.firma !== firmaActual || !est.completo) throw new Error(`Las escenas no están sacadas para esta versión del vídeo: «node motor/escenas.mjs ${p.slug}» antes de llamar al juez de arte.`);
  const E = carpetaEscenas(p.dir);
  const fc = path.join(P, "candidato.json"), fd = path.join(P, "dictamen-arte.json");
  // lo que queda de la pasada anterior: su dictamen y sus fotogramas, para verificar en vez de volver a auditarlo todo
  let ronda = 1, anterior = null;
  const tmp = path.join(p.dir, "revision", "_previo-anterior");
  fs.rmSync(tmp, { recursive: true, force: true });
  if (fs.existsSync(fc)) {
    const ca = leerJson(fc);
    if (ca.firma === firmaActual) {
      console.log(`ya estaba sellado para esta versión (pasada ${ca.ronda ?? 1}): ${barras(path.relative(TALLER, path.join(P, "brief-arte.md")))}`);
      return;
    }
    ronda = ca.ronda ?? 1;
    if (fs.existsSync(fd)) {
      try {
        const d = leerJson(fd);
        if (d.firma === ca.firma) {
          anterior = { ronda, firma: ca.firma, veredicto: d.veredicto };
          ronda += 1;
          fs.mkdirSync(tmp, { recursive: true });
          fs.cpSync(path.join(P, "fotogramas"), path.join(tmp, "fotogramas"), { recursive: true });
          fs.copyFileSync(fd, path.join(tmp, "dictamen-arte.json"));
        }
      } catch { /* un dictamen roto no cuenta */ }
    }
  }
  fs.rmSync(P, { recursive: true, force: true });
  for (const d of ["fotogramas", "enteros"]) fs.mkdirSync(path.join(P, d), { recursive: true });
  const fotogramas = [];
  for (const e of est.escenas) for (const x of e.fotos) {
    const n = path.basename(x.archivo);
    fs.copyFileSync(path.join(E, x.archivo), path.join(P, "fotogramas", n));
    fs.copyFileSync(path.join(E, x.entero), path.join(P, "enteros", n));
    fotogramas.push({ archivo: `fotogramas/${n}`, entero: `enteros/${n}`, segundo: x.segundo, escena: e.id, sha256: shaArchivo(path.join(P, "fotogramas", n)) });
  }
  let ant = null;
  if (anterior) {
    const cambiados = [], iguales = [];
    for (const f of fotogramas) (igual(path.join(P, f.archivo), path.join(tmp, f.archivo)) ? iguales : cambiados).push(f.segundo);
    fs.mkdirSync(path.join(P, "anterior"), { recursive: true });
    fs.copyFileSync(path.join(tmp, "dictamen-arte.json"), path.join(P, "anterior", "dictamen-arte.json"));
    ant = { ...anterior, cambiados, iguales };
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const c = {
    esquema: 1, etapa: "previo", slug: p.slug, fecha: new Date().toISOString(), firma: firmaActual, ronda, anterior: ant,
    video: { duracion: +p.datos.duracion.toFixed(3), formato: perfil.id, ancho: p.datos.ancho, alto: p.datos.alto, fps: p.datos.fps },
    escenas: est.escenas.map((e) => ({ id: e.id, titulo: e.titulo, desde: e.desde, hasta: e.hasta })), fotogramas,
    hechos: { n: hechos.n, errores: hechos.errores, avisos: hechos.avisos },
  };
  escribirJson(fc, c);
  fs.writeFileSync(path.join(P, "brief-arte.md"), briefPrevio(c));
  if (ant) console.log(`pasada ${ronda}: ${ant.cambiados.length} fotogramas cambiaron y ${ant.iguales.length} siguen igual; el juez verifica lo anterior y mira lo que cambió`);
  if (ronda > 2) console.log(`AVISO: es la pasada ${ronda} del juez de arte previo. Son dos como mucho (una y su verificación): lo que quede abierto se le enseña al creador junto con las escenas, y decide él.`);
  console.log(`fotogramas quietos sellados: firma ${c.firma.slice(0, 12)}…, ${c.escenas.length} escenas, ${fotogramas.length} fotogramas`);
  console.log(`brief: ${barras(path.relative(TALLER, path.join(P, "brief-arte.md")))}`);
  console.log(`ahora: el agente juez-arte del plugin con ese brief y nada más (va en Opus); después «node motor/jueces.mjs ${p.slug} --previo --veredicto».`);
}

function briefPrevio(c) {
  const abs = (f) => barras(path.join(P, f));
  const preferencias = barras(path.join(TALLER, "preferencias.md"));
  const ant = c.anterior;
  const porEscena = c.escenas.map((e, i) => `- **${i + 1}. ${e.titulo}** (\`${e.id}\`, ${e.desde.toFixed(1)}–${e.hasta.toFixed(1)} s): ${c.fotogramas.filter((f) => f.escena === e.id).map((f) => `\`${f.archivo}\` (${seg(f.segundo)})`).join(", ")}`).join("\n");
  const ej = c.fotogramas[0];
  const rondaTxt = !ant ? "" : `
## Esta es la segunda pasada: verifica y mira lo que cambió, no vuelvas a auditarlo todo

Otro juez de arte revisó la versión anterior de estos fotogramas y dijo **${ant.veredicto}**. Su dictamen: \`${abs("anterior/dictamen-arte.json")}\`.
Desde entonces cambiaron los fotogramas de ${ant.cambiados.length ? ant.cambiados.map(seg).join(", ") : "ningún segundo"}; el resto (${ant.iguales.length}) es la misma imagen que él ya revisó.

1. Comprueba uno a uno sus hallazgos críticos, altos y medios: resuelto, sigue igual o resuelto a medias. Lo que siga
   abierto va en tu dictamen con su severidad; lo resuelto no se menciona.
2. Revisa con todo el baremo los fotogramas que cambiaron: un arreglo puede haber roto otra cosa.
3. En lo que no cambió no abras hallazgos nuevos, salvo un defecto crítico o alto que se pueda medir y que él dejara
   pasar. No conviertas en alto lo que él valoró como medio o bajo, ni cambies de criterio de una pasada a otra.
4. La cobertura sigue siendo completa (una entrada por escena). Para lo que no cambió puedes apoyarte en sus entradas.
`;
  return `# Brief del juez de arte, antes de animar · vídeo «${p.video.titulo ?? p.slug}»

Eres un juez independiente y un profesional de esto: un director de arte que revisa un vídeo cuando todavía son
fotogramas quietos, antes de que nadie lo anime y antes de que lo vea el cliente. No hiciste este vídeo y no conoces a
quien lo hizo. Lo que tú dejes pasar lo tendrá que señalar el creador, y eso es justo lo que se quiere evitar: tu
trabajo es que a él le lleguen escenas sin defectos de acabado, para que solo tenga que opinar de lo que le gusta. No
des notas numéricas: devuelves **aprobar** o **iterar** y hallazgos que citen la escena, el segundo y el archivo.

${presenta(c, "Será")}

**Qué estás mirando.** Fotogramas sueltos de cada escena, con su texto y su composición definitivos: de cada frase de
la voz, uno a mitad de frase y otro cuando se acaba de decir. Todavía no hay vídeo: no juzgues el movimiento, el ritmo
ni cómo se pasa de una escena a otra (eso lo revisa otro juez con el vídeo entero). Un fotograma de mitad de frase
puede tener piezas que aún no han entrado: no es un defecto que falten, sí lo es que lo que ya está se vea mal.
${rondaTxt}${decidido()}
## La evidencia

Fotogramas sellados: firma \`${c.firma}\` (cópiala tal cual en el dictamen). Catálogo: \`${abs("candidato.json")}\`.
Solo puedes citar como evidencia archivos de ese catálogo con su segundo exacto. Las imágenes de \`fotogramas/\` están a
la **mitad** de tamaño: una medida tomada en ellas, ×2, es la medida real. Da todas las medidas a ${c.video.ancho}×${c.video.alto}.

${porEscena}

**Cómo mirar de cerca.** Las imágenes de \`fotogramas/\` sirven para el barrido; el detalle se juzga a tamaño real. Cada
fotograma está también entero en \`enteros/\` con el mismo nombre: recorta de ahí la pieza que miras (la figura, el
icono con su círculo, la ventana, el diagrama) a una carpeta temporal tuya, y lee el recorte.

\`\`\`
ffmpeg -y -i "${abs(ej.entero)}" -vf "crop=600:600:240:500" <tmp>/d-${ej.escena}-pieza.png   (crop=ancho:alto:x:y)
\`\`\`

Un recorte de 600×600 cuesta una fracción de un fotograma: saca los que necesites (dos o tres por escena), pero no leas
todos los enteros ni dos veces las mismas imágenes. En \`evidencias\` y en los hallazgos cita siempre el archivo de
\`fotogramas/\` y cuenta en \`observacion\` o \`explicacion\` lo que viste en el recorte, con su medida.

${baremo(preferencias)}
## El dictamen

Escríbelo en \`${abs("dictamen-arte.json")}\` con esta forma (JSON válido, sin comentarios):

\`\`\`json
{
 "esquema": 1,
 "etapa": "previo",
 "firma": "${c.firma}",
 "rol": "arte",
 "agente": "un identificador tuyo único (por ejemplo «juez-arte-previo-<fecha-hora>»)",
 "fecha": "ISO 8601",
 "veredicto": "aprobar | iterar",
 "hallazgos": [
  { "severidad": "critica | alta | media | baja", "tipo": "defecto | criterio", "estado": "abierto", "escena": "${ej.escena}", "segundo": ${ej.segundo}, "archivo": "${ej.archivo}",
    "explicacion": "qué está mal, con su medida, y por qué importa a quien lo ve en el móvil", "comprobacion": "qué tendría que verse (y medirse) para darlo por resuelto" }
 ],
 "evidencias": [
  { "segundo": ${ej.segundo}, "archivo": "${ej.archivo}", "observacion": "qué comprobaste ahí" }
 ],
 "escenas": [
  { "escena": "${ej.escena}", "archivo": "${ej.archivo}", "segundo": ${ej.segundo},
    "ampliado": "qué piezas recortaste a tamaño real (figura, icono, ventana, diagrama) y qué mediste en cada una", "textoMinimo": ${L.pantalla},
    "actua": "qué objeto actúa y qué explica, en una frase (o «solo texto»)", "ocupa": 72 }
 ]
}
\`\`\`

Reglas: al menos dos evidencias de archivos distintos. «aprobar» si no queda ningún **defecto** crítico o alto abierto;
«iterar» si queda alguno. Los criterios no bloquean: van en la lista con su \`tipo\` y los decide el creador. Cada hallazgo propone cómo comprobar que se arregló. No inventes lo que no viste: si no pudiste comprobar
algo, dilo en \`observacion\`. Junta todo lo que veas en esta pasada: después de arreglarlo solo habrá una verificación.

## Lo tuyo: el acabado de cada escena, como lo miraría un director de arte

Dos miradas, y las dos cuentan. **La de móvil**: los fotogramas sin ampliar (piensa en ${perfil.movil}); si algo no se lee así,
no se lee. **La de detalle**: escena a escena, cada pieza a tamaño real con los recortes. Una escena se da por mirada
cuando has recortado y medido cada figura, cada icono con su contenedor, cada ventana o tarjeta y cada diagrama que hay
en ella, y la has comparado con las escenas equivalentes.

**Por cada escena** escribe una entrada en \`escenas\`: qué fotograma del catálogo la representa (el más completo), qué
recortaste y qué mediste (\`ampliado\`), y el texto más pequeño que hay que leer en ella, en px a ${entero} (\`textoMinimo\`;
null si no hay texto). Comprueba en cada una:

${CRITERIOS_ARTE}

Lo roto que se ve en el recorte a tamaño real (cortado, pisado, descentrado en su contenedor, ilegible, un icono
genérico, un plano que es solo texto) es un **defecto alto**. Cuánto llena el plano, cómo se reparte el aire y si algo
iría mejor en 2D o en 3D son **criterio**. No juzgues el guion, el ritmo ni el
movimiento: eso es de otros jueces, con el vídeo entero.
`;
}

function validarPrevio(d, c) {
  const fallo = (m) => { throw new Error(`dictamen de arte previo: ${m}`); };
  const enCat = (e) => !!e && Number.isFinite(e.segundo) && c.fotogramas.some((x) => x.archivo === e.archivo && Math.abs(x.segundo - e.segundo) < 0.011);
  if (d.esquema !== 1) fallo("esquema desconocido");
  if (d.firma !== c.firma) fallo(`cita otra firma (${String(d.firma).slice(0, 12)}…): es de otra versión de los fotogramas`);
  if (d.rol !== "arte") fallo(`dice rol «${d.rol}»`);
  if (!esTexto(d.agente)) fallo("sin «agente»");
  if (!["aprobar", "iterar"].includes(d.veredicto)) fallo("el veredicto tiene que ser «aprobar» o «iterar»");
  if (!Array.isArray(d.hallazgos)) fallo("falta la lista «hallazgos» (vacía si no hay)");
  for (const [i, h] of d.hallazgos.entries()) {
    if (!SEVERIDADES.includes(h?.severidad) || !["abierto", "resuelto"].includes(h?.estado) || !Number.isFinite(h?.segundo) || !esTexto(h?.explicacion)) fallo(`hallazgo ${i + 1} incompleto (severidad, estado, segundo, explicacion)`);
    if ((h.tipo !== undefined && !TIPOS.includes(h.tipo)) || (h.origen !== undefined && !ORIGENES.includes(h.origen))) fallo(`hallazgo ${i + 1}: «tipo» es defecto o criterio, y «origen», anterior, cambio o nuevo`);
  }
  if (d.veredicto === "aprobar" && d.hallazgos.some((h) => bloquea(h, c.ronda ?? 1))) fallo("aprueba con un defecto crítico o alto abierto");
  if (!Array.isArray(d.evidencias) || d.evidencias.length < 2) fallo("cita menos de dos evidencias");
  if (new Set(d.evidencias.map((e) => e?.archivo)).size < 2) fallo("las evidencias tienen que ser de archivos distintos");
  for (const e of d.evidencias) if (!enCat(e) || !esTexto(e.observacion)) fallo(`la evidencia «${e?.archivo}» a ${e?.segundo} s no está en el catálogo o no dice qué se comprobó`);
  if (!Array.isArray(d.escenas)) fallo("falta «escenas» (el pase de detalle: una entrada por escena)");
  for (const e of c.escenas) {
    const item = d.escenas.find((x) => x?.escena === e.id);
    if (!item || !esTexto(item.ampliado)) fallo(`la escena «${e.id}» no tiene pase de detalle («ampliado»: qué recortaste a tamaño real y qué mediste)`);
    if (!enCat(item) || c.fotogramas.find((x) => x.archivo === item.archivo)?.escena !== e.id) fallo(`la escena «${e.id}» cita un fotograma que no es suyo (${item.archivo} a ${item.segundo} s)`);
    if (item.textoMinimo != null && !Number.isFinite(item.textoMinimo)) fallo(`la escena «${e.id}»: «textoMinimo» tiene que ser un número de píxeles, o null`);
    if (!esTexto(item.actua) || !Number.isFinite(item.ocupa)) fallo(`la escena «${e.id}» no dice qué objeto actúa y qué explica («actua») o cuánto llena el cuadro («ocupa», en %)`);
  }
}

function veredictoPrevio() {
  const fc = path.join(P, "candidato.json"), fd = path.join(P, "dictamen-arte.json");
  if (!fs.existsSync(fc)) throw new Error(`No hay fotogramas sellados para el juez de arte: «node motor/jueces.mjs ${p.slug} --previo».`);
  const c = leerJson(fc);
  if (c.firma !== firma(p.dir).sha256) throw new Error("El vídeo cambió desde --previo: mide, saca las escenas y vuelve a --previo; el dictamen de antes ya no vale.");
  if (!fs.existsSync(fd)) throw new Error(`Falta el dictamen del juez de arte (revision/previo/dictamen-arte.json, con su brief).`);
  const d = leerJson(fd);
  validarPrevio(d, c);
  const abiertos = d.hallazgos.filter((h) => h.estado === "abierto").sort((a, b) => SEVERIDADES.indexOf(a.severidad) - SEVERIDADES.indexOf(b.severidad) || a.segundo - b.segundo);
  console.log(`arte, antes de animar (pasada ${c.ronda}): ${d.veredicto}, ${d.hallazgos.length} hallazgos  (${d.agente})`);
  for (const h of abiertos) console.log(`  [${h.severidad}] ${h.escena ?? ""} · ${Number(h.segundo).toFixed(2)} s: ${h.explicacion}${h.comprobacion ? ` → ${h.comprobacion}` : ""}`);
  const criterios = abiertos.filter((h) => !bloquea(h) && h.severidad !== "baja").length;
  if (d.veredicto !== "aprobar" && abiertos.some((h) => bloquea(h))) {
    console.log(c.ronda >= 2
      ? "\nITERAR, y ya es la verificación: no hay tercera pasada. Arregla lo que puedas y enséñale al creador las escenas con lo que queda abierto; decide él."
      : "\nITERAR: arregla todo lo alto de una vez, mide, saca las escenas y vuelve a --previo para una sola verificación.");
    process.exit(1);
  }
  console.log(`\n${d.veredicto === "aprobar" ? "APROBADO" : "SIN DEFECTOS QUE BLOQUEEN (el juez pide otra vuelta solo por criterios)"}: ya puedes enseñarle las escenas al creador (node motor/escenas.mjs ${p.slug} --estado dice cuáles).`);
  if (criterios) console.log(`Quedan ${criterios} hallazgos de criterio: no bloquean. Díselos al creador con las escenas, una línea cada uno; decide él.`);
}

// ---------------------------------------------------------------------------------------------------------------------
// OpenRouter, para los jueces por API
// ---------------------------------------------------------------------------------------------------------------------
function claveOR() {
  const k = clave("OPENROUTER_API_KEY");
  if (!k) throw new Error("No hay clave de OpenRouter: «node motor/clave.mjs».");
  return k;
}
async function preguntar(messages, maxTokens = 4000) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${claveOR()}`, "Content-Type": "application/json" }, redirect: "error", signal: AbortSignal.timeout(240000),
    body: JSON.stringify({ model: MODELO, temperature: 0, max_tokens: maxTokens, provider: { data_collection: "deny" }, messages }),
  });
  if (!r.ok) throw new Error(`OpenRouter respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error(`el modelo ${MODELO} no devolvió texto`);
  return { content, uso: j.usage };
}
function json(texto) {
  const v = texto.trim();
  const fenced = /```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```/i.exec(v);
  const bruto = fenced ? fenced[1] : v.slice(v.indexOf("{"), v.lastIndexOf("}") + 1);
  try { return JSON.parse(bruto); } catch { throw new Error(`el modelo no devolvió JSON verificable: ${v.slice(0, 200)}`); }
}
const imagen = (f) => ({ type: "image_url", image_url: { url: `data:image/${f.endsWith(".jpg") ? "jpeg" : "png"};base64,${fs.readFileSync(path.join(J, f)).toString("base64")}` } });
const texto = (t) => ({ type: "text", text: t });

/** lo que se oye en el vídeo contra el guion, palabra a palabra (lib/parecido.mjs) */
const comparar = (oido) => compararTextos(guionDe(p.dir).texto, oido);

async function juezAudio() {
  const c = candidato();
  if (!flag("--enviar")) {
    console.log(`Esto manda el audio del vídeo (${barras(path.relative(TALLER, path.join(J, "audio.mp3")))}, ${(fs.statSync(path.join(J, "audio.mp3")).size / 1024).toFixed(0)} KB) a OpenRouter (${MODELO}) para que lo escuche: cuesta céntimos. Con permiso del creador, añade --enviar.`);
    process.exit(1);
  }
  const mp3 = fs.readFileSync(path.join(J, "audio.mp3"));
  console.log(`escuchando con ${MODELO}…`);
  const { content, uso } = await preguntar([{ role: "user", content: [
    texto(`Escucha esta pista de un vídeo corto en español. Responde SOLO con un JSON con estos campos:
"transcripcion": todas las palabras que se oyen, en orden;
"vozAudible": true si la voz se entiende de principio a fin;
"problemas": lista de defectos que impidan entenderla (dicción rara, palabras cortadas, distorsión, clics, silencios raros, música o efectos que tapen la voz, una frase que falte o se repita); vacía si no hay;
"sonidos": lista de { "segundo": número, "que": qué suena } con cada sonido que no sea la voz (efectos, música), con el segundo aproximado;
"volumen": "bien" | "voz baja" | "efectos altos" | "desigual";
"observacion": una frase sobre cómo suena en conjunto.
No evalúes la imagen: solo oyes.`),
    { type: "input_audio", input_audio: { data: mp3.toString("base64"), format: "mp3" } },
  ] }], 2500);
  const a = json(content);
  if (typeof a.transcripcion !== "string" || typeof a.vozAudible !== "boolean" || !Array.isArray(a.problemas)) throw new Error("el juez de audio omitió transcripcion, vozAudible o problemas");
  const comparacion = comparar(a.transcripcion);
  const veredicto = a.vozAudible && a.problemas.length === 0 && comparacion.coincidencia >= 0.9 ? "apto" : "iterar";
  const d = { esquema: 1, firma: c.firma, rol: "audio", agente: `openrouter/${MODELO}`, modelo: MODELO, fecha: new Date().toISOString(), audioSha256: c.audio.sha256, analisis: a, comparacion, veredicto, uso };
  escribirJson(path.join(J, "dictamen-audio.json"), d);
  console.log(`se oye: ${a.transcripcion}\n`);
  console.log(`coincide con el guion al ${(comparacion.coincidencia * 100).toFixed(0)} %${comparacion.diferencias.length ? `:\n- ${comparacion.diferencias.slice(0, 12).join("\n- ")}` : ""}`);
  if (a.problemas.length) console.log(`problemas: ${a.problemas.join("; ")}`);
  if (Array.isArray(a.sonidos) && a.sonidos.length) console.log(`sonidos oídos: ${a.sonidos.map((s) => `${s.segundo} s ${s.que}`).join(" · ")}`);
  console.log(`volumen: ${a.volumen ?? "?"}. ${a.observacion ?? ""}\nveredicto del audio: ${veredicto} → ${barras(path.relative(TALLER, path.join(J, "dictamen-audio.json")))}`);
}

async function juezVisual(rol) {
  const c = candidato();
  const b = brief(rol, c);
  const reglas = `${b}\n\nResponde SOLO con el JSON del dictamen, con "agente": "openrouter/${MODELO}". No puedes abrir archivos: todas las imágenes que puedes ver van en este mensaje, con su nombre y su segundo delante de cada una; cita exactamente esos nombres y segundos.`;
  let d;
  if (rol === "editorial") {
    if (!c.ciego.length) throw new Error("el juez editorial por API necesita los fotogramas a ciegas: vuelve a --preparar sin --sin-ciego");
    const pase1 = [texto(`Vas a ver ${c.ciego.length} imágenes de un vídeo corto, en orden, sin subtítulos y sin saber de qué va. Para cada una describe literalmente lo que ves (objetos, acción, textos en pantalla), sin adivinar metáforas ni el tema. Responde SOLO con JSON: { "lectura": [ { "archivo": "...", "visto": "..." } ] }.`)];
    for (const x of c.ciego) pase1.push(texto(`${x.archivo} (${x.segundo.toFixed(2)} s):`), imagen(x.archivo));
    console.log(`juez editorial (${MODELO}): primer pase, a ciegas…`);
    const r1 = await preguntar([{ role: "user", content: pase1 }], 3000);
    const lectura = json(r1.content).lectura ?? [];
    const pase2 = [texto(`${reglas}\n\nTu primer pase a ciegas fue este (no lo cambies, úsalo para "visto"):\n${JSON.stringify(lectura)}\n\nguion.txt:\n${guionDe(p.dir).texto}\n\nhechos.json:\n${fs.existsSync(path.join(p.dir, "hechos.json")) ? fs.readFileSync(path.join(p.dir, "hechos.json"), "utf-8") : "(no hay)"}\n\nAhora los fotogramas con subtítulo:`)];
    for (const f of c.fotogramas) pase2.push(texto(`${f.archivo} (${f.segundo.toFixed(2)} s):`), imagen(f.archivo));
    console.log("segundo pase, con el guion…");
    d = json((await preguntar([{ role: "user", content: pase1 }, { role: "assistant", content: r1.content }, { role: "user", content: pase2 }], 6000)).content);
  } else {
    const msg = [texto(reglas), texto("Hojas de contacto del vídeo entero (el segundo está escrito encima de cada fotograma):")];
    for (const h of c.hojas) msg.push(texto(`${h}:`), imagen(h));
    if (rol === "movimiento") for (const r of c.rafagas) msg.push(texto(`${r.archivo} (ráfaga a 30 fps alrededor de ${r.segundo.toFixed(2)} s):`), imagen(r.archivo));
    const paso = rol === "arte" ? Math.max(1, Math.ceil(c.fotogramas.length / 14)) : 1;
    for (const [i, f] of c.fotogramas.entries()) if (rol === "movimiento" ? c.cambios.some((x) => Math.abs(f.segundo - x) <= 0.31) : i % paso === 0) msg.push(texto(`${f.archivo} (${f.segundo.toFixed(2)} s):`), imagen(f.archivo));
    console.log(`juez de ${rol} (${MODELO})…`);
    d = json((await preguntar([{ role: "user", content: msg }], 6000)).content);
  }
  d = { ...d, esquema: 1, firma: c.firma, rol, agente: `openrouter/${MODELO}`, fecha: new Date().toISOString() };
  const out = path.join(J, `dictamen-${rol}.api.json`);
  escribirJson(out, d);
  try { validarDictamen(d, c, rol); console.log(`${barras(path.relative(TALLER, out))}: ${d.veredicto}, ${d.hallazgos?.length ?? 0} hallazgos`); }
  catch (e) { console.log(`${barras(path.relative(TALLER, out))}: ${d.veredicto ?? "?"}, pero el dictamen no pasa la validación: ${e.message}`); }
  for (const h of d.hallazgos ?? []) console.log(`  [${h.severidad}] ${h.segundo} s: ${h.explicacion}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// --veredicto: valida los dictámenes contra el candidato y la firma de ahora
// ---------------------------------------------------------------------------------------------------------------------
function candidato() {
  const f = path.join(J, "candidato.json");
  if (!fs.existsSync(f)) throw new Error(`No hay candidato: «node motor/jueces.mjs ${p.slug} --preparar» después de renderizar el vídeo entero.`);
  return leerJson(f);
}
// una evidencia es un fotograma, una imagen a ciegas o una ráfaga del catálogo con su segundo exacto, o una hoja de contacto
// (hojas/hoja-NN.jpg) con un segundo dentro de los 22 s que cubre
const enCatalogo = (c, e) => {
  if (!e || !Number.isFinite(e.segundo)) return false;
  if ([...c.fotogramas, ...c.ciego, ...c.rafagas].some((x) => x.archivo === e.archivo && Math.abs(x.segundo - e.segundo) < 0.011)) return true;
  const h = /^hojas\/hoja-(\d+)\.jpg$/.exec(e.archivo ?? "");
  return !!h && c.hojas.includes(e.archivo) && e.segundo >= Number(h[1]) - 0.011 && e.segundo < Number(h[1]) + 22;
};
const esTexto = (s) => typeof s === "string" && s.trim().length > 0;

function validarDictamen(d, c, rol) {
  const fallo = (m) => { throw new Error(`dictamen de ${rol}: ${m}`); };
  if (d.esquema !== 1) fallo("esquema desconocido");
  if (d.firma !== c.firma) fallo(`cita otra firma (${String(d.firma).slice(0, 12)}…): es de otra versión del vídeo`);
  if (d.rol !== rol) fallo(`dice rol «${d.rol}»`);
  if (!esTexto(d.agente)) fallo("sin «agente»");
  if (!["aprobar", "iterar"].includes(d.veredicto)) fallo("el veredicto tiene que ser «aprobar» o «iterar»");
  if (!Array.isArray(d.hallazgos)) fallo("falta la lista «hallazgos» (vacía si no hay)");
  for (const [i, h] of d.hallazgos.entries()) {
    if (!SEVERIDADES.includes(h?.severidad) || !["abierto", "resuelto"].includes(h?.estado) || !Number.isFinite(h?.segundo) || !esTexto(h?.explicacion)) fallo(`hallazgo ${i + 1} incompleto (severidad, estado, segundo, explicacion)`);
    if ((h.tipo !== undefined && !TIPOS.includes(h.tipo)) || (h.origen !== undefined && !ORIGENES.includes(h.origen))) fallo(`hallazgo ${i + 1}: «tipo» es defecto o criterio, y «origen», anterior, cambio o nuevo`);
  }
  if (d.veredicto === "aprobar" && d.hallazgos.some((h) => bloquea(h, c.ronda ?? 1))) fallo("aprueba con un defecto crítico o alto abierto");
  if (!Array.isArray(d.evidencias) || d.evidencias.length < 2) fallo("cita menos de dos evidencias");
  if (new Set(d.evidencias.map((e) => e?.archivo)).size < 2) fallo("las evidencias tienen que ser de archivos distintos");
  for (const e of d.evidencias) if (!enCatalogo(c, e) || !esTexto(e.observacion)) fallo(`la evidencia «${e?.archivo}» a ${e?.segundo} s no está en el catálogo del candidato o no dice qué se comprobó`);
  if (rol === "editorial") {
    if (!Array.isArray(d.lecturaVisual)) fallo("falta «lecturaVisual»");
    for (const f of c.frases) {
      const img = c.ciego.find((x) => x.frase === f.id);
      const item = d.lecturaVisual.find((x) => x?.frase === f.id);
      if (!item || !esTexto(item.visto)) fallo(`la frase ${f.id} no tiene lectura a ciegas`);
      if (img && (item.archivo !== img.archivo || Math.abs(item.segundo - img.segundo) > 0.011)) fallo(`la lectura de ${f.id} cita otra imagen (${item.archivo} a ${item.segundo} s)`);
      if (item.correspondencia !== "coincide") fallo(`${f.id}: la imagen «${item.correspondencia}» con la voz («${f.texto}»): exige iterar`);
    }
  }
  // el juez de arte mira plano a plano, a tamaño real; la segunda opinión por API no puede recortar y no se le exige
  if (rol === "arte" && !String(d.agente).startsWith("openrouter/")) {
    if (!Array.isArray(d.planos)) fallo("falta «planos» (el pase de detalle: una entrada por plano)");
    for (const pl of planosDe(c)) {
      const item = d.planos.find((x) => Math.abs((x?.desde ?? -9) - pl.desde) < 0.06 && Math.abs((x?.hasta ?? -9) - pl.hasta) < 0.06);
      if (!item || !esTexto(item.ampliado)) fallo(`el plano ${pl.desde.toFixed(2)}–${pl.hasta.toFixed(2)} s no tiene pase de detalle («ampliado»: qué recortaste a tamaño real y qué mediste)`);
      if (!enCatalogo(c, item)) fallo(`el plano ${pl.desde.toFixed(2)}–${pl.hasta.toFixed(2)} s cita un fotograma fuera del catálogo (${item.archivo} a ${item.segundo} s)`);
      if (item.textoMinimo != null && !Number.isFinite(item.textoMinimo)) fallo(`el plano ${pl.desde.toFixed(2)}–${pl.hasta.toFixed(2)} s: «textoMinimo» tiene que ser un número de píxeles a tamaño real, o null`);
      if (!esTexto(item.actua) || !Number.isFinite(item.ocupa)) fallo(`el plano ${pl.desde.toFixed(2)}–${pl.hasta.toFixed(2)} s no dice qué objeto actúa y qué explica («actua») o cuánto llena el cuadro («ocupa», en %)`);
    }
  }
  if (rol === "movimiento") {
    if (!Array.isArray(d.transiciones)) fallo("falta «transiciones»");
    for (const x of c.cambios) {
      const t = d.transiciones.find((t) => Math.abs((t?.segundo ?? -9) - x) < 0.06);
      if (!t || !esTexto(t.puente)) fallo(`falta la transición de ${x.toFixed(2)} s o su puente`);
      if (!enCatalogo(c, t.antes) || !enCatalogo(c, t.despues)) fallo(`la transición de ${x.toFixed(2)} s cita fotogramas fuera del catálogo`);
      if (!(t.antes.segundo < x && x - t.antes.segundo <= 0.5 && t.despues.segundo >= x && t.despues.segundo - x <= 0.5)) fallo(`la evidencia de la transición de ${x.toFixed(2)} s no está a menos de 0,5 s de la frontera, antes y después`);
    }
    const iv = Array.isArray(d.intervalosRevisados) ? d.intervalosRevisados.filter((a) => Array.isArray(a) && a.length === 2).sort((a, b) => a[0] - b[0]) : [];
    let hasta = 0;
    for (const [a, b] of iv) if (a <= hasta + 0.1) hasta = Math.max(hasta, b);
    if (hasta < c.video.duracion - 0.2) fallo(`«intervalosRevisados» no cubre el vídeo entero (llega a ${hasta.toFixed(1)} de ${c.video.duracion.toFixed(1)} s)`);
  }
}

function veredicto() {
  const c = candidato();
  const actual = firma(p.dir).sha256;
  if (c.firma !== actual) throw new Error(`El vídeo cambió desde --preparar (firma ${c.firma.slice(0, 12)}… → ${actual.slice(0, 12)}…): renderiza entero y vuelve a --preparar; los dictámenes de antes ya no valen.`);
  const errores = [], abiertos = [], jueces = [];
  const archivos = fs.readdirSync(J).filter((n) => /^dictamen-(editorial|arte|movimiento)(\.api)?\.json$/.test(n));
  for (const rol of ROLES) {
    const propios = archivos.filter((n) => n.startsWith(`dictamen-${rol}`));
    if (!propios.length) { errores.push(`falta el dictamen de ${rol} (revision/jueces/dictamen-${rol}.json, con su brief)`); continue; }
    for (const n of propios) {
      let d;
      try { d = leerJson(path.join(J, n)); validarDictamen(d, c, rol); }
      catch (e) { errores.push(`${n}: ${e.message}`); continue; }
      const bloquean = d.hallazgos.filter((h) => bloquea(h, c.ronda ?? 1)).length;
      jueces.push({ rol, agente: d.agente, archivo: n, veredicto: d.veredicto, hallazgos: d.hallazgos.length, bloquean });
      // «iterar» solo para la entrega si hay un defecto que bloquee: pedir otra vuelta por criterios no la para
      if (d.veredicto !== "aprobar" && bloquean) errores.push(`${n}: ${d.agente} dice iterar (${bloquean} ${bloquean === 1 ? "defecto que bloquea" : "defectos que bloquean"})`);
      for (const h of d.hallazgos) if (h.estado === "abierto") abiertos.push({ rol, ...h, bloquea: bloquea(h, c.ronda ?? 1) });
    }
  }
  const agentes = jueces.map((j) => j.agente);
  if (new Set(agentes).size !== agentes.length) errores.push("dos dictámenes vienen del mismo «agente»: los jueces tienen que ser distintos");
  let audio = { estado: "no verificado" };
  const fa = path.join(J, "dictamen-audio.json");
  if (fs.existsSync(fa)) {
    const a = leerJson(fa);
    if (a.firma !== c.firma) errores.push("el dictamen de audio es de otra versión del vídeo");
    else if (a.veredicto !== "apto") errores.push(`el audio no está apto (coincide al ${Math.round((a.comparacion?.coincidencia ?? 0) * 100)} %${a.analisis?.problemas?.length ? `; ${a.analisis.problemas.join("; ")}` : ""})`);
    else audio = { estado: "verificado", agente: a.agente, coincidencia: a.comparacion?.coincidencia, archivo: "dictamen-audio.json" };
  } else if (!flag("--sin-audio")) errores.push("falta el juez de audio («--audio --enviar»), o «--sin-audio» si el creador lo escuchó él mismo");
  const resultado = errores.length ? "iterar" : "aprobado";
  const paraElCreador = abiertos.filter((h) => !h.bloquea && h.severidad !== "baja");
  const v = { esquema: 2, slug: p.slug, firma: c.firma, fecha: new Date().toISOString(), resultado, jueces, audio, errores, hallazgosAbiertos: abiertos.length, bloquean: abiertos.filter((h) => h.bloquea).length, paraElCreador: paraElCreador.length };
  escribirJson(path.join(J, "veredicto.json"), v);
  if (jueces.length) console.log(jueces.map((j) => `${j.rol.padEnd(11)} ${j.veredicto.padEnd(8)} ${j.hallazgos} hallazgos, ${j.bloquean} bloquean  (${j.agente})`).join("\n"));
  console.log(`audio: ${audio.estado}${audio.coincidencia != null ? `, coincide al ${Math.round(audio.coincidencia * 100)} %` : ""}`);
  if (abiertos.length) {
    const marca = (h) => (h.bloquea ? "BLOQUEA" : tipoDe(h) === "criterio" ? "criterio" : h.origen === "nuevo" ? "llegó tarde" : "no bloquea");
    console.log("\nhallazgos abiertos:");
    for (const h of abiertos.sort((a, b) => Number(b.bloquea) - Number(a.bloquea) || SEVERIDADES.indexOf(a.severidad) - SEVERIDADES.indexOf(b.severidad) || a.segundo - b.segundo)) console.log(`  [${h.severidad}, ${marca(h)}] ${h.rol} · ${Number(h.segundo).toFixed(2)} s: ${h.explicacion}${h.comprobacion ? ` → ${h.comprobacion}` : ""}`);
  }
  if (paraElCreador.length) console.log(`\n${paraElCreador.length} hallazgos no bloquean (criterios, o lo que llegó tarde): enséñaselos al creador en el chat, una línea cada uno, junto con el vídeo; decide él si se toca alguno.`);
  if (errores.length) { console.log(`\nveredicto: ITERAR\n- ${errores.join("\n- ")}`); process.exit(1); }
  console.log(`\nveredicto: APROBADO (firma ${c.firma.slice(0, 12)}…). Ya se puede: node motor/render.mjs ${p.slug} --final`);
}

function estado() {
  const actual = firma(p.dir).sha256;
  console.log(`firma de ahora: ${actual.slice(0, 12)}…`);
  if (!fs.existsSync(path.join(J, "candidato.json"))) return console.log("sin candidato (--preparar)");
  const c = candidato();
  console.log(`candidato: ${c.firma.slice(0, 12)}… ${c.firma === actual ? "(vigente)" : "(VIEJO: el vídeo cambió)"} · ${c.fotogramas.length} fotogramas, ${c.cambios.length} cambios, ${c.frases.length} frases`);
  for (const n of fs.readdirSync(J).filter((n) => /^dictamen-.*\.json$/.test(n))) {
    const d = leerJson(path.join(J, n));
    console.log(`${n}: ${d.veredicto} · ${d.agente} ${d.firma === c.firma ? "" : "(de otra versión)"}`);
  }
  const ee = leerEstadoEscenas(p.dir);
  console.log(ee ? `escenas: ${ee.escenas.filter((x) => x.estado === "aceptada").length} de ${ee.escenas.length} aceptadas ${ee.firma === actual && ee.completo ? "(vigente)" : "(de otra versión: vuelve a sacarlas)"}` : "escenas: sin sacar (node motor/escenas.mjs)");
  if (fs.existsSync(path.join(P, "candidato.json"))) {
    const cp = leerJson(path.join(P, "candidato.json"));
    const dp = fs.existsSync(path.join(P, "dictamen-arte.json")) ? leerJson(path.join(P, "dictamen-arte.json")) : null;
    console.log(`arte antes de animar: pasada ${cp.ronda}, ${dp ? (dp.firma === cp.firma ? dp.veredicto : "dictamen de otra versión") : "sin dictamen"} ${cp.firma === actual ? "(vigente)" : "(los fotogramas cambiaron después)"}`);
  }
  const v = path.join(J, "veredicto.json");
  if (fs.existsSync(v)) { const x = leerJson(v); console.log(`veredicto: ${x.resultado} ${x.firma === actual ? "(vigente)" : "(de otra versión)"}`); } else console.log("sin veredicto (--veredicto)");
}

if (flag("--hechos")) {
  const h = comprobarHechos();
  console.log(`${h.n} hechos`);
  for (const a of h.avisos) console.log("aviso:", a);
  if (h.errores.length) { console.log(`- ${h.errores.join("\n- ")}`); process.exit(1); }
  console.log("todos los hechos del guion y de las pantallas están respaldados por su fuente capturada");
} else if (flag("--previo")) { if (flag("--veredicto")) veredictoPrevio(); else prepararPrevio(); }
else if (flag("--preparar")) await preparar();
else if (flag("--audio")) await juezAudio();
else if (flag("--visual")) { for (const rol of opt("--rol") ? [opt("--rol")] : ROLES) await juezVisual(rol); }
else if (flag("--veredicto")) veredicto();
else if (flag("--estado")) estado();
else console.log("Uso: node motor/jueces.mjs <vídeo> --hechos | --previo | --preparar | --audio --enviar | --visual --enviar | --veredicto | --estado (mira la cabecera de este archivo)");
