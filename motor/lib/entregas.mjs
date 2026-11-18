// La instantánea de cada entrega: render.mjs --final guarda, junto al vídeo que deja en salida/, el código y los datos
// exactos con los que salió (revision/entregas/<fecha>/). Si después se prueba otra cosa y el creador prefiere lo que ya
// tenía, se vuelve a ello con «--restaurar» en vez de reconstruirlo de memoria.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { TALLER } from "./taller.mjs";
import { archivosDe, firma, shaArchivo } from "./firma.mjs";

// lo que decide el vídeo (se guarda y se restaura) y lo que solo acompaña (se guarda, no se restaura)
const DECIDEN = ["video.tsx", "portada.tsx", "video.json", "guion.txt", "subtitulos.txt", "palabras.json", "sonidos.json", "hechos.json", "escenas.json", "planos.md", "publicar.md", "decisiones.md"];
const ACOMPANAN = ["notas.md"];
const carpeta = (p) => path.join(p.dir, "revision", "entregas");
const sello = (d = new Date()) => { const n = (x) => String(x).padStart(2, "0"); return `${d.getFullYear()}-${n(d.getMonth() + 1)}-${n(d.getDate())}_${n(d.getHours())}${n(d.getMinutes())}`; };
const libre = (dir, nombre) => { let n = nombre, i = 2; while (fs.existsSync(path.join(dir, n))) n = `${nombre}-${i++}`; return n; };
const shaMotor = (f) => crypto.createHash("sha256").update(f.archivos.filter((a) => a.archivo.startsWith("@motor/")).map((a) => `${a.archivo}=${a.sha256}`).join("\n")).digest("hex");
const version = () => { try { return JSON.parse(fs.readFileSync(path.join(TALLER, "package.json"), "utf-8")).version; } catch { return null; } };

/** guarda lo que se acaba de entregar; devuelve la carpeta */
export function guardarEntrega(p, salida, { sinJueces = false } = {}) {
  const base = carpeta(p);
  fs.mkdirSync(base, { recursive: true });
  const dir = path.join(base, libre(base, sello()));
  fs.mkdirSync(dir);
  const guardados = [];
  for (const n of [...DECIDEN, ...ACOMPANAN]) {
    const f = path.join(p.dir, n);
    if (!fs.existsSync(f)) continue;
    fs.copyFileSync(f, path.join(dir, n));
    guardados.push(n);
  }
  const f = firma(p.dir);
  const medios = archivosDe(p.medios).map((m) => ({ archivo: path.relative(p.medios, m).split(path.sep).join("/"), sha256: shaArchivo(m) }));
  fs.writeFileSync(path.join(dir, "entrega.json"), JSON.stringify({
    esquema: 1, slug: p.slug, fecha: new Date().toISOString(), firma: f.sha256, motor: shaMotor(f), version: version(), sinJueces,
    salida: { archivo: path.relative(TALLER, salida).split(path.sep).join("/"), sha256: shaArchivo(salida) }, archivos: guardados, medios,
  }, null, 1) + "\n");
  return dir;
}

/** las entregas guardadas, de la más antigua a la más nueva */
export function listarEntregas(p) {
  const base = carpeta(p);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((n) => !n.startsWith("_") && fs.existsSync(path.join(base, n, "entrega.json"))).sort()
    .map((n) => ({ nombre: n, dir: path.join(base, n), ...JSON.parse(fs.readFileSync(path.join(base, n, "entrega.json"), "utf-8")) }));
}

/**
 * Vuelve a poner en la carpeta del vídeo lo que se entregó entonces («ultima» o el nombre de la carpeta). Lo que hay
 * ahora se guarda antes en revision/entregas/_antes-de-restaurar-<fecha>/. No toca medios/ ni notas.md.
 */
export function restaurarEntrega(p, cual) {
  const todas = listarEntregas(p);
  if (!todas.length) throw new Error("Este vídeo no tiene ninguna entrega guardada (se guardan desde la versión 2.0, con «render.mjs --final»).");
  const e = cual === "ultima" ? todas[todas.length - 1] : todas.find((x) => x.nombre === cual);
  if (!e) throw new Error(`No hay ninguna entrega «${cual}». Las que hay: ${todas.map((x) => x.nombre).join(", ")}.`);
  const base = carpeta(p), antes = path.join(base, libre(base, `_antes-de-restaurar-${sello()}`));
  fs.mkdirSync(antes);
  const avisos = [];
  for (const n of DECIDEN) {
    const ahora = path.join(p.dir, n), suyo = path.join(e.dir, n);
    if (fs.existsSync(ahora)) fs.copyFileSync(ahora, path.join(antes, n));
    if (fs.existsSync(suyo)) fs.copyFileSync(suyo, ahora);
    else if (fs.existsSync(ahora)) avisos.push(`${n} no existía en esa entrega: se queda el de ahora`);
  }
  const ahora = new Map(archivosDe(p.medios).map((m) => [path.relative(p.medios, m).split(path.sep).join("/"), shaArchivo(m)]));
  const distintos = (e.medios ?? []).filter((m) => ahora.get(m.archivo) !== m.sha256).map((m) => m.archivo);
  if (distintos.length) avisos.push(`medios/ no se restaura, y ${distintos.length} archivos han cambiado o faltan desde entonces (${distintos.slice(0, 5).join(", ")}${distintos.length > 5 ? "…" : ""}): la voz o los sonidos pueden no ser los de esa entrega`);
  const f = firma(p.dir);
  if (shaMotor(f) !== e.motor) avisos.push("el motor ha cambiado desde esa entrega: el vídeo puede no verse igual; mide y saca las escenas antes de darlo por bueno");
  return { entrega: e, antes, avisos, igual: f.sha256 === e.firma };
}
