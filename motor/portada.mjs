// Las portadas de un vídeo: dibuja tres variantes con el mismo motor, las reduce al tamaño al que se ven en el móvil
// (168 px de ancho: una miniatura de YouTube) y comprueba que el texto sigue leyéndose. Deja una hoja con las tres, en
// grande y en pequeño, para enseñársela al creador en el chat. No hay jueces: elige él.
//
//   node motor/portada.mjs <vídeo>                               las tres → revision/portadas/portada-a.jpg, -b, -c y hoja.jpg
//   node motor/portada.mjs <vídeo> --solo b                      solo esa variante (la hoja se rehace con las que haya)
//   node motor/portada.mjs <vídeo> --elegir b --palabras "…"     la que elige el creador → salida/<vídeo>-portada.jpg
//   node motor/portada.mjs <vídeo> --dentro                      la elegida, al último fotograma del reel ya entregado
//
// En un reel la portada elegida va también dentro del vídeo, en su último fotograma (lib/portada-dentro.mjs): en Shorts
// y en algunas cuentas de TikTok solo se puede elegir como portada un fotograma del vídeo. Al principio no va nunca: el
// primer segundo es del gancho. `--elegir` se la pone al vídeo si ya está entregado; si no, se la pone `render.mjs --final`.
//
// La portada la dibuja el vídeo: su video.tsx exporta `Portada`, que recibe `variante` (1, 2 o 3) y devuelve una
// imagen quieta del tamaño del vídeo, con sus mismas piezas y su misma letra:
//
//   export const Portada: React.FC<{ variante: number }> = ({ variante }) => …
//
// Dentro valen useNarracion(), usePerfil() e <Instante s={12.5}> (lo de dentro, tal como está en ese segundo del vídeo). Si el
// vídeo ya está sellado o entregado, la portada va en un portada.tsx aparte en su carpeta (con el mismo `export const
// Portada`): video.tsx no cambia y su firma tampoco. La marca del creador se marca con data-medir="marca", como en el
// vídeo. Las tres variantes tienen que ser de verdad distintas (otra palabra, otro sujeto, otra composición).
//
// El tamaño y lo que tapa cada red salen del perfil del vídeo (motor/lib/perfiles.mjs): en YouTube, 1280×720 como
// mínimo, hasta 2 MB, y la duración en la esquina de abajo a la derecha; en un reel, el recorte de la cuadrícula.
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { abrirVideo, TALLER } from "./lib/taller.mjs";
import { argumentos } from "./lib/argumentos.mjs";
import { empaquetar, opcionesDeChromium } from "./lib/empaquetar.mjs";
import { shaArchivo } from "./lib/firma.mjs";
import { igual } from "./lib/escenas.mjs";
import { FUENTE } from "./lib/laminas.mjs";
import { tomarMotor } from "./lib/candado.mjs";
import { enZona, PORTADA } from "./lib/perfiles.mjs";
import { fotogramasDePortada, portadaAlEntregado } from "./lib/portada-dentro.mjs";
import { analizar, deHex, ficha as fichaColor, oklch, otraFamilia, paletaDe } from "./lib/color.mjs";

const { args, opt, flag } = argumentos();
const p = abrirVideo(args[0]);
const perfil = p.perfil;
const LETRAS = ["a", "b", "c"];
const C = path.join(p.dir, "revision", "portadas");
const rel = (f) => path.relative(TALLER, f).split(path.sep).join("/");
const estadoJson = path.join(C, "portadas.json");
const leerEstado = () => (fs.existsSync(estadoJson) ? JSON.parse(fs.readFileSync(estadoJson, "utf-8")) : null);
const escribirEstado = (o) => fs.writeFileSync(estadoJson, JSON.stringify(o, null, 1) + "\n");
function ffmpeg(a, o = {}) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...a], { maxBuffer: 1 << 28, ...o });
  if (r.status !== 0) throw new Error(`ffmpeg falló: ${String(r.stderr || "").trim().split("\n").slice(-3).join(" ")}`);
  return r;
}

// dónde está la portada: en portada.tsx si lo hay, o en video.tsx
const fuente = [path.join(p.dir, "portada.tsx"), path.join(p.dir, "video.tsx")].find(fs.existsSync);
const tienePortada = fuente && /export\s+(const|function)\s+Portada\b/.test(fs.readFileSync(fuente, "utf-8"));

/** en un reel ya entregado, la portada elegida va también en el último fotograma del vídeo de salida/ */
function dentro(pedido = false) {
  const r = portadaAlEntregado(p);
  if (r.hecho) console.log(`la portada ${r.letra.toUpperCase()} va también en el último fotograma del vídeo entregado: ${r.salida}`);
  else if (pedido || fotogramasDePortada(p)) console.log(`${pedido ? "no se ha puesto" : "aviso: no va todavía"} dentro del vídeo: ${r.motivo}.`);
}

if (opt("--elegir")) {
  const letra = String(opt("--elegir")).toLowerCase();
  const palabras = opt("--palabras");
  if (!LETRAS.includes(letra)) throw new Error("--elegir a, b o c: la variante que eligió el creador.");
  if (!palabras || palabras.startsWith("--")) throw new Error("Falta --palabras \"…\": la portada se apunta con lo que dijo el creador en el chat.");
  const e = leerEstado();
  const v = e?.variantes.find((x) => x.letra === letra);
  if (!v) throw new Error(`Todavía no se ha sacado la variante ${letra}: «node motor/portada.mjs ${p.slug}», enséñale la hoja al creador y apunta después la que elija.`);
  if (!fuente || shaArchivo(fuente) !== e.fuente.sha256) throw new Error(`La portada cambió desde que se sacó la hoja: lo que el creador vio ya no es lo que hay. Vuelve a sacarla («node motor/portada.mjs ${p.slug}») y enséñasela otra vez.`);
  const salida = path.join(TALLER, "salida", `${p.slug}-portada.jpg`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.copyFileSync(path.join(C, v.archivo), salida);
  escribirEstado({ ...e, elegida: { letra, fecha: new Date().toISOString(), palabras } });
  if (v.errores.length) console.log(`aviso: la variante ${letra} tenía cosas que arreglar (${v.errores.length}); la elige él, pero díselo.`);
  console.log(`apuntado: portada ${letra} («${palabras}»). Apúntalo también en notas.md.`);
  console.log(salida);
  dentro();
  process.exit(0);
}
if (flag("--dentro")) { dentro(true); process.exit(0); }

if (!tienePortada) throw new Error(`El vídeo no tiene portada: su video.tsx (o un portada.tsx en su carpeta) tiene que exportar «Portada», que recibe «variante» (1, 2 o 3) y dibuja una imagen quieta de ${p.datos.ancho}×${p.datos.alto}. Mira la cabecera de motor/portada.mjs.`);
const cuales = opt("--solo") ? String(opt("--solo")).toLowerCase().split(",").map((s) => s.trim()) : LETRAS;
for (const l of cuales) if (!LETRAS.includes(l)) throw new Error("--solo a, b o c.");
fs.mkdirSync(C, { recursive: true });
fs.mkdirSync(p.medios, { recursive: true });

await tomarMotor("las portadas", p.slug);
console.log("empaquetando…");
const alias = { "@portada": fuente }; // el archivo que exporta «Portada»: portada.tsx si lo hay, o el video.tsx
const serveUrl = await empaquetar(p, { entrada: "entrada-portada.ts", nombres: alias });
const chromiumOptions = opcionesDeChromium(flag("--cpu"));
const navegador = await openBrowser("chrome", { chromiumOptions });
const datos = { ...p.datos, medir: true };
const composition = await selectComposition({ serveUrl, id: "portada", inputProps: { datos, variante: 1 }, puppeteerInstance: navegador });
const min = perfil.portada.minimo;
const scale = min ? Math.max(1, min.ancho / composition.width, min.alto / composition.height) : 1;
const W = Math.round(composition.width * scale), H = Math.round(composition.height * scale);
const kx = composition.width / perfil.ancho, ky = composition.height / perfil.alto;
const mW = PORTADA.miniatura, mH = Math.round((mW * H) / W / 2) * 2;
const m = mW / composition.width; // de píxeles del cuadro a píxeles de la miniatura
const ignora = (p.video.medir?.ignora ?? []).map((s) => String(s).toLowerCase());
// el color del vídeo (lo dejó medir.mjs en revision/medidas.json): la portada tiene que ser de su mismo juego
const paleta = paletaDe(p.video);
const delVideo = (() => { try { return JSON.parse(fs.readFileSync(path.join(p.dir, "revision", "medidas.json"), "utf-8")).colores ?? null; } catch { return null; } })();
const claseDeLuz = (c) => { const L = oklch(c).L; return L < 0.45 ? 0 : L > 0.7 ? 2 : 1; };

/** luminancia relativa (0–1) de cada píxel de una caja de la miniatura */
function luminancias(rgb, caja) {
  const x1 = Math.max(0, Math.floor(caja[0] * m) - 1), y1 = Math.max(0, Math.floor(caja[1] * m) - 1);
  const x2 = Math.min(mW, Math.ceil((caja[0] + caja[2]) * m) + 1), y2 = Math.min(mH, Math.ceil((caja[1] + caja[3]) * m) + 1);
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const out = [];
  for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) {
    const i = (y * mW + x) * 3;
    out.push(0.2126 * lin(rgb[i] / 255) + 0.7152 * lin(rgb[i + 1] / 255) + 0.0722 * lin(rgb[i + 2] / 255));
  }
  return out.sort((a, b) => a - b);
}
/** el contraste entre las letras y su fondo, ya en pequeño: el fondo es lo que más hay en la caja; las letras, lo que más se aparta */
function contraste(rgb, cajas) {
  let peor = Infinity;
  for (const c of cajas) {
    const l = luminancias(rgb, c);
    if (l.length < 12) continue;
    const en = (q) => l[Math.min(l.length - 1, Math.floor(q * l.length))];
    const fondo = en(0.5), r = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    peor = Math.min(peor, Math.max(r(en(0.95), fondo), r(en(0.05), fondo)));
  }
  return peor;
}

const previo = leerEstado();
const variantes = [];
const t0 = Date.now();
for (const [i, letra] of LETRAS.entries()) {
  if (!cuales.includes(letra)) {
    const antes = previo?.variantes.find((x) => x.letra === letra);
    if (antes && fs.existsSync(path.join(C, antes.archivo))) variantes.push(antes);
    continue;
  }
  const png = path.join(C, `portada-${letra}.png`), jpg = path.join(C, `portada-${letra}.jpg`), mini = path.join(C, `portada-${letra}-${mW}.png`);
  const trozos = [];
  // la variante llega al componente por las props de la composición: se elige de nuevo para cada una
  const inputProps = { datos, variante: i + 1 };
  const suya = await selectComposition({ serveUrl, id: "portada", inputProps, puppeteerInstance: navegador });
  await renderStill({
    serveUrl, composition: suya, inputProps, chromiumOptions, frame: 0, scale, output: png, puppeteerInstance: navegador, logLevel: "error",
    onBrowserLog: (l) => { const x = /^MEDIR:(\d+):(\d+):(\d+):(.*)$/s.exec(l.text); if (x) trozos[Number(x[2])] = x[4]; },
  });
  if (!trozos.length) throw new Error(`No llegaron medidas de la variante ${letra}: ¿la portada se dibuja dentro del motor (motor/src/Portada.tsx)?`);
  const medida = JSON.parse(trozos.join(""));
  // la que se sube: JPG, por debajo del peso que admite la red
  let peso = 0;
  for (const q of [2, 4, 7, 11]) {
    ffmpeg(["-i", png, "-q:v", String(q), jpg]);
    peso = fs.statSync(jpg).size / 1048576;
    if (!perfil.portada.pesoMaximoMB || peso <= perfil.portada.pesoMaximoMB) break;
  }
  // en pequeño, como se ve en el móvil
  ffmpeg(["-i", png, "-vf", `scale=${mW}:${mH}:flags=area`, mini]);
  const rgb = ffmpeg(["-i", mini, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]).stdout;

  const errores = [], avisos = [];
  const textos = medida.textos.filter((t) => t.g !== "marca" && !ignora.some((x) => t.s.toLowerCase().includes(x)))
    .map((t) => ({ ...t, enPequeno: t.fs * m, cuerpo: t.fs / ky }));
  const corto = (t) => `«${t.s.slice(0, 40)}»`;
  const pide = (px) => Math.ceil((px * perfil.ancho) / mW);
  const grandes = textos.filter((t) => t.enPequeno >= PORTADA.resto);
  const mayor = textos.reduce((a, t) => (!a || t.enPequeno > a.enPequeno ? t : a), null);
  if (!mayor) avisos.push("no lleva texto: que se entienda sola, en pequeño, de qué va el vídeo");
  else if (mayor.enPequeno < PORTADA.titular) errores.push(`el texto más grande, ${corto(mayor)}, queda en ${mayor.enPequeno.toFixed(1)} px al verse a ${mW} px de ancho: no se lee (pide ${PORTADA.titular} o más: ${pide(PORTADA.titular)} px en el cuadro; ahora mide ${Math.round(mayor.cuerpo)})`);
  for (const t of textos) {
    if (t !== mayor && t.enPequeno < PORTADA.resto) avisos.push(`${corto(t)} queda en ${t.enPequeno.toFixed(1)} px: en pequeño no se lee; sobra, o va a ${pide(PORTADA.resto)} px o más`);
    const x1 = Math.min(...t.r.map((l) => l[0])) / kx, y1 = Math.min(...t.r.map((l) => l[1])) / ky;
    const x2 = Math.max(...t.r.map((l) => l[0] + l[2])) / kx, y2 = Math.max(...t.r.map((l) => l[1] + l[3])) / ky;
    for (const z of perfil.portada.zonas) {
      const cae = enZona(z, { x1, y1, x2, y2 }, 0);
      if (cae) (cae.nivel === "error" ? errores : avisos).push(`${corto(t)}: ${cae.que}`);
    }
    if (t.elipsis) errores.push(`${corto(t)} no cabe: acaba en «…»`);
    else if (t.corte > 3) errores.push(`${corto(t)}: cortado ${t.corte} px por su contenedor o por el borde`);
    if (t.tapado > 0.3) errores.push(`${corto(t)}: otra pieza le tapa el ${Math.round(t.tapado * 100)} %`);
    if (t.encima) errores.push(`${corto(t)} se pisa con «${t.encima.slice(0, 40)}»`);
  }
  for (const t of grandes) {
    const c = contraste(rgb, t.r);
    if (c < PORTADA.contraste) errores.push(`${corto(t)}: poco contraste con su fondo en pequeño (${c.toFixed(1)}; pide ${PORTADA.contraste} o más)`);
    else if (c < 4.5) avisos.push(`${corto(t)}: contraste justo en pequeño (${c.toFixed(1)}; lo cómodo es 4,5)`);
  }
  // el color: las reglas del vídeo, y además contra el vídeo (la misma pieza, el mismo color)
  {
    const col = analizar([{ s: 0, ...medida }], { area: composition.width * composition.height, lienzo: paleta.lienzo, acentos: paleta.acentos, significado: paleta.significado, ignora: (s) => ignora.some((x) => s.toLowerCase().includes(x)) });
    for (const h of col.hallazgos) avisos.push(`${h.etiqueta}: ${h.que}`);
    if (delVideo) {
      for (const s of col.resumen.superficies) {
        const c = deHex(s.hex), suyas = delVideo.superficies.map((x) => deHex(x.hex)).filter((v) => claseDeLuz(v) === claseDeLuz(c));
        if (suyas.length && suyas.every((v) => otraFamilia(c, v))) avisos.push(`la superficie ${fichaColor(c)} no es de la familia de ninguna del vídeo (${suyas.map(fichaColor).join(", ")}): la portada usa las piezas del vídeo con sus colores`);
      }
      for (const [texto, fondos] of Object.entries(col.resumen.fondosDeTexto)) {
        const enVideo = (delVideo.fondosDeTexto ?? {})[texto];
        if (enVideo) for (const f of fondos) if (enVideo.every((v) => otraFamilia(deHex(f), deHex(v)))) avisos.push(`«${texto.slice(0, 40)}» va sobre ${fichaColor(deHex(f))} en la portada y sobre ${enVideo.map((v) => fichaColor(deHex(v))).join(", ")} en el vídeo: la misma pieza con dos colores`);
      }
    } else avisos.push("no se ha medido el vídeo (medir.mjs): no se puede comprobar que la portada sea de su mismo juego de colores");
  }
  const palabras = grandes.reduce((n, t) => n + t.s.split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length, 0);
  if (palabras > PORTADA.palabras) avisos.push(`${palabras} palabras grandes: de un vistazo se leen de una a tres`);
  if (perfil.portada.pesoMaximoMB && peso > perfil.portada.pesoMaximoMB) errores.push(`pesa ${peso.toFixed(1)} MB y ${perfil.red} admite ${perfil.portada.pesoMaximoMB}: simplifica el fondo`);
  variantes.push({
    letra, variante: i + 1, archivo: path.basename(jpg), png: path.basename(png), miniatura: path.basename(mini), ancho: W, alto: H, pesoMB: +peso.toFixed(2),
    textos: textos.map((t) => ({ texto: t.s, cuerpo: Math.round(t.cuerpo), enPequeno: +t.enPequeno.toFixed(1) })), errores, avisos,
  });
  process.stdout.write(`\rportada ${letra}   `);
}
try { await navegador.close({ silent: true }); } catch { /* da igual */ }
console.log(`\nportadas sacadas en ${Math.round((Date.now() - t0) / 1000)} s (formato ${perfil.id}, ${W}×${H})`);

// tres de verdad distintas: dos variantes con la misma imagen no son dos opciones
for (const [i, a] of variantes.entries()) for (const b of variantes.slice(i + 1)) {
  if (igual(path.join(C, a.png), path.join(C, b.png))) for (const v of [a, b]) {
    const otra = v === a ? b.letra : a.letra, txt = `es la misma imagen que la variante ${otra}: tienen que ser distintas`;
    if (!v.errores.includes(txt)) v.errores.push(txt);
  }
}

// la hoja: cada variante en grande y, al lado o debajo, a 168 px de ancho, sin ampliar (como se ve en el móvil)
const hoja = path.join(C, "hoja.jpg");
{
  const M = 16, T = 44, apaisada = W > H; // T: la franja con la letra de cada variante, fuera de la imagen para no taparle nada
  const gW = apaisada ? 560 : 240, gH = Math.round((gW * H) / W / 2) * 2;
  const hw = apaisada ? M + gW + M + mW + M : M + variantes.length * (gW + M);
  const hh = apaisada ? M + variantes.length * (T + gH + M) : M + T + gH + M + mH + 34 + M;
  const entradas = ["-f", "lavfi", "-i", `color=c=0x14161a:s=${hw}x${hh}`];
  const pasos = [];
  let fondo = "0:v";
  for (const [k, v] of variantes.entries()) {
    entradas.push("-i", path.join(C, v.png), "-i", path.join(C, v.miniatura));
    const gx = apaisada ? M : M + k * (gW + M), gy = (apaisada ? M + k * (T + gH + M) : M) + T;
    const mx = apaisada ? M + gW + M : gx + Math.round((gW - mW) / 2), my = apaisada ? gy + Math.round((gH - mH) / 2) : gy + gH + M;
    pasos.push(`[${1 + 2 * k}:v]scale=${gW}:${gH}[g${k}]`);
    pasos.push(`[${fondo}][g${k}]overlay=${gx}:${gy}[a${k}]`);
    pasos.push(`[a${k}][${2 + 2 * k}:v]overlay=${mx}:${my}[b${k}]`);
    pasos.push(`[b${k}]drawtext=fontfile='${FUENTE}':text='${v.letra.toUpperCase()}':x=${gx}:y=${gy - T + 6}:fontsize=34:fontcolor=yellow,drawtext=fontfile='${FUENTE}':text='${mW} px':x=${mx}:y=${my + mH + 8}:fontsize=16:fontcolor=0x9aa0a6[c${k}]`);
    fondo = `c${k}`;
  }
  ffmpeg([...entradas, "-filter_complex", pasos.join(";"), "-map", `[${fondo}]`, "-frames:v", "1", "-q:v", "2", hoja]);
}

escribirEstado({
  esquema: 1, slug: p.slug, formato: perfil.id, fecha: new Date().toISOString(),
  fuente: { archivo: path.basename(fuente), sha256: shaArchivo(fuente) }, hoja: path.basename(hoja), variantes,
  elegida: null,
});
let malas = 0;
for (const v of variantes) {
  console.log(`\nportada ${v.letra.toUpperCase()}  ${rel(path.join(C, v.archivo))}  (${v.ancho}×${v.alto}, ${v.pesoMB} MB)${v.errores.length ? "" : "  se lee en pequeño"}`);
  for (const e of v.errores) console.log(`  ARREGLAR  ${e}`);
  for (const a of v.avisos) console.log(`  aviso     ${a}`);
  if (v.errores.length) malas++;
}
if (variantes.length < 3) console.log(`\nAVISO: solo hay ${variantes.length} de las tres variantes.`);
console.log(`\nLa hoja para enseñársela al creador en el chat: ${rel(hoja)}`);
console.log(malas ? "Arregla lo marcado y vuelve a sacarlas antes de enseñárselas." : `Elige él: «node motor/portada.mjs ${p.slug} --elegir a|b|c --palabras "…"» apunta la que diga y la deja en salida/.`);
process.exit(malas ? 1 : 0);
