// ¿Está este ordenador listo para hacer vídeos? Dice qué hay y qué falta, con la orden que lo arregla. No instala nada.
//
//   node motor/doctor.mjs
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { clave, TALLER } from "./lib/taller.mjs";

const responde = (orden, args) => { const r = spawnSync(orden, args, { encoding: "utf-8" }); return r.status === 0 ? (r.stdout || r.stderr || "").split("\n")[0].trim() : null; };
const revisiones = [];
const anota = (que, bien, detalle, arreglo) => revisiones.push({ que, bien, detalle, arreglo });

const node = Number(process.versions.node.split(".")[0]);
anota("Node", node >= 20, `versión ${process.versions.node}`, "instala Node 20 o más (nodejs.org)");

for (const programa of ["ffmpeg", "ffprobe"]) {
  const version = responde(programa, ["-version"]);
  anota(programa, !!version, version ? version.split(" ").slice(0, 3).join(" ") : "no está", "instala ffmpeg (Windows: «winget install Gyan.FFmpeg»; Mac: «brew install ffmpeg»; Linux: el paquete ffmpeg)");
}

const paquetes = ["remotion", "@remotion/renderer", "@remotion/bundler", "three", "react"].filter((n) => !existsSync(join(TALLER, "node_modules", n)));
anota("Paquetes del motor", !paquetes.length, paquetes.length ? `faltan ${paquetes.join(", ")}` : "instalados", "«npm install» en la carpeta del taller");

anota("Clave de OpenRouter", !!clave("OPENROUTER_API_KEY"), clave("OPENROUTER_API_KEY") ? "guardada" : "no hay", "«node motor/clave.mjs» abre una página para pegarla (no se escribe en el chat)");
anota("Preferencias", existsSync(join(TALLER, "preferencias.md")), existsSync(join(TALLER, "preferencias.md")) ? "preferencias.md" : "todavía no existe", "pregúntale al creador lo que dice AGENTS.md («Al abrir la carpeta») y guárdalo en preferencias.md");

for (const r of revisiones) console.log(`${r.bien ? "bien " : "FALTA"}  ${r.que}: ${r.detalle}${r.bien ? "" : `\n       → ${r.arreglo}`}`);
const faltan = revisiones.filter((r) => !r.bien);
console.log(faltan.length ? `\n${faltan.length === 1 ? "Falta una cosa. Arréglala" : `Faltan ${faltan.length} cosas. Arréglalas`} y vuelve a pasar el doctor.` : "\nTodo listo: ya se puede pedir un vídeo.");
process.exit(faltan.length ? 1 : 0);
