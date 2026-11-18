// Convierte un vídeo de proyectos/ en imágenes o en un mp4.
//
//   node motor/render.mjs <vídeo>                       el vídeo entero, para revisarlo → revision/<vídeo>.mp4
//   node motor/render.mjs <vídeo> --fotos 0,2.5,9       fotogramas sueltos (segundos) → revision/fotos/ y una lámina
//   node motor/render.mjs <vídeo> --escena pasos        solo esa escena, en movimiento → revision/clips/pasos.mp4
//   node motor/render.mjs <vídeo> --desde 4 --hasta 9   solo ese tramo → revision/<vídeo>-tramo.mp4
//   node motor/render.mjs <vídeo> --srt                 solo el archivo de subtítulos → revision/<vídeo>.srt
//   node motor/render.mjs <vídeo> --final               la entrega → salida/<vídeo>.mp4 (pide el veredicto de los jueces)
//   node motor/render.mjs <vídeo> --entregas            las entregas guardadas de este vídeo
//   node motor/render.mjs <vídeo> --restaurar ultima    vuelve al código y los datos de una entrega (o su nombre)
//
//   --mitad            a media resolución: mucho más rápido, para ver cómo se mueve
//   --zonas            pinta en rojo lo que tapa la red (solo para revisar)
//   --sin-subtitulos   sin el subtítulo dibujado
//   --cpu              sin tarjeta gráfica (si algo sale distinto o falla)
//   --hilos 4          cuántos fotogramas se dibujan a la vez
//   --salida ruta.mp4  otro sitio para el mp4
//   --sin-jueces       con --final: entrega sin veredicto. Solo si el creador lo pide, y se apunta en notas.md
//   --sin-esperar      falla al momento si otra herramienta está usando el motor, en vez de esperar
//
// El tamaño y los subtítulos salen del formato del vídeo (video.json → "formato"). Donde la red pone ella los
// subtítulos (YouTube), el vídeo no los lleva dibujados y a su lado sale un .srt. El sonido sale siempre al nivel al
// que se publica. Una entrega (--final) deja además una copia exacta de lo entregado en revision/entregas/, y en un
// reel pone la portada elegida en su último fotograma.
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { argumentos } from "./lib/argumentos.mjs";
import { tomarMotor } from "./lib/candado.mjs";
import { empaquetar, opcionesDeChromium } from "./lib/empaquetar.mjs";
import { guardarEntrega, listarEntregas, restaurarEntrega } from "./lib/entregas.mjs";
import { escenasDe } from "./lib/escenas.mjs";
import { veredictoVigente } from "./lib/firma.mjs";
import { lamina } from "./lib/laminas.mjs";
import { entregar } from "./lib/portada-dentro.mjs";
import { nivelar } from "./lib/sonido.mjs";
import { srtDe } from "./lib/srt.mjs";
import { abrirVideo, TALLER } from "./lib/taller.mjs";

const { args, opt, flag } = argumentos();
const p = abrirVideo(args[0]);
const corta = (ruta) => relative(TALLER, ruta).replaceAll("\\", "/");
const revision = join(p.dir, "revision");

// ---- lo que no dibuja nada ----
if (flag("--entregas")) {
  const guardadas = listarEntregas(p);
  if (!guardadas.length) console.log("Este vídeo todavía no tiene ninguna entrega guardada.");
  for (const e of guardadas) console.log(`${e.nombre}   firma ${e.firma.slice(0, 12)}…   motor ${e.version ?? "?"}${e.sinJueces ? "   sin jueces" : ""}   ${e.salida.archivo}`);
  process.exit(0);
}
if (opt("--restaurar")) {
  const r = restaurarEntrega(p, opt("--restaurar"));
  console.log(`Restaurada la entrega ${r.entrega.nombre}. Lo que había antes está en ${corta(r.antes)}.`);
  for (const aviso of r.avisos) console.log(`aviso: ${aviso}`);
  console.log(r.igual ? "El vídeo tiene otra vez la firma de cuando se entregó." : "La firma no es la de entonces (cambió el motor o algún medio): mide, saca las escenas y pasa los jueces antes de volver a entregarlo.");
  console.log("Apúntalo en notas.md, con lo que dijo el creador.");
  process.exit(0);
}
function escribirSrt() {
  if (!p.datos.palabras.length) { console.log("aviso: sin voz no hay subtítulos que escribir"); return null; }
  mkdirSync(revision, { recursive: true });
  const archivo = join(revision, `${p.slug}.srt`);
  writeFileSync(archivo, srtDe(p.datos.palabras));
  console.log(corta(archivo));
  return archivo;
}
if (flag("--srt")) { escribirSrt(); process.exit(0); }

// ---- qué se va a dibujar ----
for (const aviso of p.avisos) console.log(`aviso: ${aviso}`);
const escena = opt("--escena") ? escenasDe(p).find((e) => e.id === opt("--escena")) : null;
if (opt("--escena") && !escena) throw new Error(`No hay ninguna escena «${opt("--escena")}». Las que hay: ${escenasDe(p).map((e) => e.id).join(", ")}.`);
const tramo = escena ? [escena.desde, escena.hasta] : opt("--desde") !== undefined || opt("--hasta") !== undefined ? [Number(opt("--desde") ?? 0), Number(opt("--hasta") ?? p.datos.duracion)] : null;
const final = flag("--final");
if (final && (tramo || flag("--zonas") || flag("--mitad") || opt("--fotos"))) throw new Error("--final es el vídeo entero, a su tamaño y sin marcas: quita lo demás.");
if (final && !flag("--sin-jueces")) {
  const v = veredictoVigente(p.dir);
  if (!v.ok) throw new Error(`No se entrega sin el veredicto de los jueces: ${v.motivo}. Con «--sin-jueces» sale igual, pero solo si el creador lo pide, y se apunta en notas.md.`);
  console.log(`Veredicto vigente (${v.veredicto.jueces.map((j) => j.rol).join(", ")}; audio ${v.veredicto.audio.estado}).`);
} else if (final) console.log("aviso: se entrega sin pasar por los jueces. Apunta en notas.md que lo pidió el creador, con sus palabras.");

await tomarMotor(final ? "la entrega" : opt("--fotos") ? "unos fotogramas" : "un render", p.slug);
console.log("empaquetando…");
const serveUrl = await empaquetar(p);
const inputProps = { datos: { ...p.datos, sinSubtitulos: flag("--sin-subtitulos"), zonas: flag("--zonas") } };
const composition = await selectComposition({ serveUrl, id: "video", inputProps });
const chromiumOptions = opcionesDeChromium(flag("--cpu"));
const scale = flag("--mitad") ? 0.5 : 1;
const fotograma = (segundo) => Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(segundo * composition.fps)));
mkdirSync(revision, { recursive: true });

// ---- fotogramas sueltos ----
if (opt("--fotos")) {
  const carpeta = join(revision, "fotos");
  mkdirSync(carpeta, { recursive: true });
  const fotos = [];
  for (const s of opt("--fotos").split(",").map(Number).filter(Number.isFinite)) {
    const output = join(carpeta, `en-${String(Math.round(s * 1000)).padStart(6, "0")}.png`);
    await renderStill({ serveUrl, composition, inputProps, chromiumOptions, scale, frame: fotograma(s), output, logLevel: "error" });
    fotos.push({ s: s.toFixed(2), output });
    console.log(corta(output));
  }
  if (fotos.length > 1) console.log(corta(lamina(fotos, join(carpeta, "lamina.jpg"))));
  process.exit(0);
}

// ---- un mp4: entero, un tramo o una escena ----
const destino = opt("--salida") ? resolve(opt("--salida")) : escena ? join(revision, "clips", `${escena.id}.mp4`) : join(revision, `${p.slug}${tramo ? "-tramo" : ""}.mp4`);
mkdirSync(join(destino, ".."), { recursive: true });
const sinNivelar = join(revision, `_sin-nivelar-${process.pid}.mp4`);
const empieza = Date.now();
let ultimo = -1;
await renderMedia({
  serveUrl, composition, inputProps, chromiumOptions, scale,
  codec: "h264", crf: 17, pixelFormat: "yuv420p", x264Preset: "medium",
  concurrency: Number(opt("--hilos") ?? 4),
  frameRange: tramo ? [fotograma(tramo[0]), Math.max(fotograma(tramo[0]), fotograma(tramo[1]) - (escena ? 1 : 0))] : null,
  outputLocation: sinNivelar,
  logLevel: "error",
  onProgress: ({ progress }) => { const tanto = Math.floor(progress * 10); if (tanto !== ultimo) { ultimo = tanto; process.stdout.write(`${tanto * 10} % `); } },
});
console.log(`\ndibujado en ${Math.round((Date.now() - empieza) / 1000)} s`);
try { console.log(nivelar(sinNivelar, destino, p.video.sonido)); } finally { rmSync(sinNivelar, { force: true }); }
console.log(corta(destino));

// donde la red pone los subtítulos, el vídeo entero sale con su .srt al lado
const srt = !tramo && p.perfil.subtitulos === "srt" ? escribirSrt() : null;

if (final) {
  const { salida, nota } = entregar(p, destino); // a salida/, con la portada elegida al final si su formato la lleva dentro
  if (nota) console.log(nota);
  if (srt) copyFileSync(srt, salida.replace(/\.mp4$/, ".srt"));
  console.log(`Entregado: ${corta(salida)}${srt ? " (y su .srt)" : ""}`);
  console.log(`Copia de esta entrega: ${corta(guardarEntrega(p, salida, { sinJueces: flag("--sin-jueces") }))}`);
}
process.exit(0);
