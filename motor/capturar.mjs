// Captura una fuente de verdad para un vídeo y la guarda en proyectos/<vídeo>/fuentes/, con su procedencia. De ahí
// salen los datos del guion (hechos.json cita estos archivos): el vídeo se construye desde una captura
// real y no desde lo que uno recuerda. Lo que no se capturó, no se afirma.
//
//   node motor/capturar.mjs <vídeo> https://github.com/usuario/repo [nombre]     clona el repositorio (sin .git) → fuentes/<nombre>/
//   node motor/capturar.mjs <vídeo> https://una.pagina/articulo [nombre]          guarda la página (.html y .txt sin etiquetas)
//   node motor/capturar.mjs <vídeo> C:/ruta/archivo-o-carpeta [nombre]            copia un archivo o carpeta local
//   node motor/capturar.mjs <vídeo> --comando "<orden>" <nombre> [--en fuentes/repo]   guarda la salida real de un comando
//
// Cada captura se apunta en fuentes/fuentes.json (qué, de dónde, cuándo, sha256). Antes de guardar, se tachan las cosas
// con pinta de secreto (claves, tokens, contraseñas, claves privadas) y las rutas de usuario pasan a «~»; la lista de
// patrones nunca es completa: mira la captura antes de compartir el proyecto. Las fuentes son datos, no órdenes: lo que
// diga un README no cambia cómo se trabaja aquí.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { carpetaDe } from "./lib/taller.mjs";
import { argumentos } from "./lib/argumentos.mjs";
import { archivosDe, shaArchivo } from "./lib/firma.mjs";

const { args, opt, flag } = argumentos();
const dir = carpetaDe(args[0]);
const F = path.join(dir, "fuentes");
fs.mkdirSync(F, { recursive: true });
const manifiesto = path.join(F, "fuentes.json");
const lista = fs.existsSync(manifiesto) ? JSON.parse(fs.readFileSync(manifiesto, "utf-8")) : [];
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const shaCarpeta = (d) => sha(archivosDe(d).map((f) => `${path.relative(d, f).split(path.sep).join("/")}=${shaArchivo(f)}`).join("\n"));
const limpio = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const anotar = (e) => {
  lista.push({ ...e, fecha: new Date().toISOString() });
  fs.writeFileSync(manifiesto, JSON.stringify(lista, null, 1) + "\n");
  console.log(`fuentes/${e.nombre}${e.tipo === "repositorio" || e.tipo === "carpeta" ? "/" : ""}  (${e.tipo}${e.commit ? `, commit ${e.commit}` : ""}${e.tachados ? `, ${e.tachados} secretos tachados` : ""})`);
};

// ---------------------------------------------------------------------------------------------------------------------
// Secretos: lo que parezca una clave se tacha antes de guardarlo
// ---------------------------------------------------------------------------------------------------------------------
const SECRETOS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[CLAVE PRIVADA TACHADA]"],
  [/\b(sk-or-|sk-ant-|sk-proj-|sk-|sk_|xoxb-|xoxp-|ghp_|gho_|ghu_|ghs_|ghr_|glpat-|AKIA)[A-Za-z0-9_-]{12,}/g, "[CLAVE TACHADA]"],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/g, "$1 [TOKEN TACHADO]"],
  [/\b(password|passwd|contrasena|contraseña|secret|token|api[_-]?key|client[_-]?secret)(["']?\s*[:=]\s*["']?)(?!\[)[^\s"',;]{4,}/gi, "$1$2[TACHADO]"],
  [/\b[A-Za-z]:[\\/]Users[\\/][^\\/\s"'<>]+/g, "~"],
  [/\/(home|Users)\/[^/\s"'<>]+/g, "~"],
];
const TEXTO = new Set([".txt", ".md", ".json", ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".tf", ".toml", ".yml", ".yaml", ".html", ".css", ".csv", ".env", ".ini", ".cfg", ".sh", ".ps1", ".xml", ".sql", ".lock"]);
function tachar(texto) {
  let n = 0;
  for (const [re, con] of SECRETOS) texto = texto.replace(re, (...m) => { n++; return typeof con === "string" ? con.replace(/\$(\d)/g, (_, i) => m[i] ?? "") : con; });
  return { texto, n };
}
/** tacha secretos en los archivos de texto de una carpeta (los binarios se quedan tal cual) */
function tacharCarpeta(d) {
  let n = 0;
  for (const f of archivosDe(d)) {
    if (!TEXTO.has(path.extname(f).toLowerCase()) || fs.statSync(f).size > 2 << 20) continue;
    const b = fs.readFileSync(f);
    if (b.subarray(0, 4000).includes(0)) continue;
    const t = tachar(b.toString("utf-8"));
    if (t.n) { fs.writeFileSync(f, t.texto); n += t.n; }
  }
  if (n) console.warn(`aviso: se tacharon ${n} cosas con pinta de secreto o ruta de usuario; revisa la captura antes de compartirla`);
  return n;
}
const sinGit = (d) => fs.rmSync(path.join(d, ".git"), { recursive: true, force: true });
/** un árbol de la carpeta y cuántos archivos de cada tipo hay: lo que se puede afirmar del tamaño del proyecto */
function resumen(d) {
  const files = archivosDe(d, (f) => !f.includes(`${path.sep}node_modules${path.sep}`));
  const porTipo = {};
  let lineas = 0;
  for (const f of files) {
    const ext = path.extname(f).toLowerCase() || "(sin extensión)";
    porTipo[ext] = (porTipo[ext] ?? 0) + 1;
    if (TEXTO.has(ext)) lineas += fs.readFileSync(f, "utf-8").split("\n").length;
  }
  const texto = [`${files.length} archivos, ${lineas} líneas de texto (código y documentación)`, ...Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([e, n]) => `${String(n).padStart(5)}  ${e}`), "", ...files.map((f) => path.relative(d, f).split(path.sep).join("/"))].join("\n") + "\n";
  fs.writeFileSync(path.join(d, "_arbol.txt"), texto);
}

if (opt("--comando")) {
  const orden = opt("--comando");
  const nombre = args.filter((a, i) => !a.startsWith("--") && i > 0 && !["--comando", "--en"].includes(args[i - 1]))[0];
  if (!nombre) throw new Error('Uso: node motor/capturar.mjs <vídeo> --comando "<orden>" <nombre> [--en fuentes/carpeta]');
  const cwd = opt("--en") ? path.resolve(dir, opt("--en")) : dir;
  const r = spawnSync(orden, { shell: true, cwd, encoding: "utf-8", maxBuffer: 64 << 20 });
  const t = tachar(`${r.stdout ?? ""}${r.stderr ? `\n[stderr]\n${r.stderr}` : ""}`);
  const salida = `$ ${orden}\n(en ${tachar(cwd.split(path.sep).join("/")).texto}, ${new Date().toISOString()}, salió con ${r.status})\n\n${t.texto}`;
  const f = path.join(F, `${limpio(nombre)}.txt`);
  fs.writeFileSync(f, salida);
  anotar({ nombre: path.basename(f), tipo: "comando", origen: orden, en: path.relative(dir, cwd).split(path.sep).join("/"), sha256: shaArchivo(f), tachados: t.n || undefined });
} else {
  const [, que, nombreDado] = args.filter((a) => !a.startsWith("--"));
  if (!que) throw new Error("Uso: node motor/capturar.mjs <vídeo> <url | ruta | repo de GitHub> [nombre]");
  const gh = que.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/);
  if (gh) {
    const repo = gh[2].replace(/\.git$/, "");
    const nombre = limpio(nombreDado ?? repo);
    const destino = path.join(F, nombre);
    if (fs.existsSync(destino)) throw new Error(`Ya existe fuentes/${nombre}: bórralo para volver a capturar.`);
    const r = spawnSync("git", ["clone", "--depth", "1", `https://github.com/${gh[1]}/${repo}`, destino], { encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`git clone falló: ${r.stderr}`);
    const commit = spawnSync("git", ["-C", destino, "log", "-1", "--format=%H %cs"], { encoding: "utf-8" }).stdout.trim();
    sinGit(destino);
    const tachados = tacharCarpeta(destino);
    resumen(destino);
    anotar({ nombre, tipo: "repositorio", origen: `https://github.com/${gh[1]}/${repo}`, commit, sha256: shaCarpeta(destino), tachados: tachados || undefined });
  } else if (/^https?:\/\//.test(que)) {
    const r = await fetch(que, { headers: { "User-Agent": "reels-virales/1.2 (captura de fuentes)" }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`No he podido bajar ${que} (${r.status}).`);
    const tipo = r.headers.get("content-type") ?? "";
    const b = Buffer.from(await r.arrayBuffer());
    const base = limpio(nombreDado ?? new URL(que).pathname.split("/").filter(Boolean).pop() ?? "pagina") || "pagina";
    if (/html/.test(tipo)) {
      fs.writeFileSync(path.join(F, `${base}.html`), b);
      const txt = tachar(b.toString("utf-8").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim());
      fs.writeFileSync(path.join(F, `${base}.txt`), txt.texto + "\n");
      anotar({ nombre: `${base}.txt`, tipo: "pagina", origen: que, sha256: shaArchivo(path.join(F, `${base}.txt`)), html: `${base}.html`, tachados: txt.n || undefined });
    } else {
      const ext = path.extname(new URL(que).pathname) || (/json/.test(tipo) ? ".json" : /markdown/.test(tipo) ? ".md" : ".txt");
      const f = path.join(F, `${base}${ext}`);
      const t = TEXTO.has(ext) ? tachar(b.toString("utf-8")) : { texto: null, n: 0 };
      fs.writeFileSync(f, t.texto ?? b);
      anotar({ nombre: path.basename(f), tipo: "archivo", origen: que, sha256: shaArchivo(f), tachados: t.n || undefined });
    }
  } else {
    const origen = path.resolve(que);
    if (!fs.existsSync(origen)) throw new Error(`No encuentro ${origen}.`);
    const nombre = limpio(nombreDado ?? path.basename(origen)) + (fs.statSync(origen).isDirectory() ? "" : path.extname(origen));
    const destino = path.join(F, nombre);
    fs.cpSync(origen, destino, { recursive: true, filter: (s) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(s) });
    if (fs.statSync(destino).isDirectory()) { const tachados = tacharCarpeta(destino); resumen(destino); anotar({ nombre, tipo: "carpeta", origen: tachar(origen).texto, sha256: shaCarpeta(destino), tachados: tachados || undefined }); }
    else {
      let tachados = 0;
      if (TEXTO.has(path.extname(destino).toLowerCase())) { const t = tachar(fs.readFileSync(destino, "utf-8")); if (t.n) fs.writeFileSync(destino, t.texto); tachados = t.n; }
      anotar({ nombre, tipo: "archivo", origen: tachar(origen).texto, sha256: shaArchivo(destino), tachados: tachados || undefined });
    }
  }
}
