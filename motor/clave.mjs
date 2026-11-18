// Guarda la clave de OpenRouter sin que pase por el chat: abre una página en el navegador de este ordenador, la clave
// se pega ahí y queda en .env.local, dentro del taller. Con ella se hacen la voz, los tiempos de las palabras y el juez
// de audio. Cada persona usa la suya: se saca en https://openrouter.ai/keys.
//
//   node motor/clave.mjs            abre la página y espera (diez minutos como mucho)
//   node motor/clave.mjs --estado   dice si hay una clave guardada, sin enseñarla
//   node motor/clave.mjs --sin-abrir  no abre el navegador: solo escribe la dirección (para abrirla a mano)
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { clave, TALLER } from "./lib/taller.mjs";

const NOMBRE = "OPENROUTER_API_KEY";
const ARCHIVO = join(TALLER, ".env.local");

if (process.argv.includes("--estado")) {
  console.log(clave(NOMBRE) ? "Hay una clave de OpenRouter guardada." : "Todavía no hay clave de OpenRouter: «node motor/clave.mjs».");
  process.exit(0);
}

function guardar(valor) {
  const otras = existsSync(ARCHIVO) ? readFileSync(ARCHIVO, "utf-8").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith(`${NOMBRE}=`)) : [];
  writeFileSync(ARCHIVO, [...otras, `${NOMBRE}=${valor}`].join("\n") + "\n", { mode: 0o600 });
}

const paso = randomBytes(12).toString("hex"); // solo quien abrió esta página puede enviar la clave
const pagina = (mensaje = "") => `<!doctype html><html lang="es"><meta charset="utf-8"><title>Clave de OpenRouter</title>
<body style="font: 18px/1.5 system-ui, sans-serif; max-width: 34em; margin: 12vh auto; padding: 0 1em; color: #1b1d22">
<h1 style="font-size: 1.5em">Tu clave de OpenRouter</h1>
<p>Se guarda solo en este ordenador, en el archivo <code>.env.local</code> del taller. No se envía a ningún otro sitio.</p>
<p>Si no tienes una: entra en <b>openrouter.ai/keys</b>, crea una clave y cópiala. Empieza por <code>sk-or-</code>.</p>
<form method="post" action="/${paso}">
<input name="clave" type="password" autocomplete="off" autofocus required style="font: inherit; width: 100%; padding: .5em; box-sizing: border-box">
<p><button style="font: inherit; padding: .5em 1.2em">Guardar</button> <b>${mensaje}</b></p>
</form></body></html>`;

const servidor = createServer((peticion, respuesta) => {
  const html = (texto, codigo = 200) => { respuesta.writeHead(codigo, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); respuesta.end(texto); };
  if (peticion.method === "GET" && peticion.url === "/") return html(pagina());
  if (peticion.method !== "POST" || peticion.url !== `/${paso}`) return html("No encontrado", 404);
  let cuerpo = "";
  peticion.on("data", (trozo) => { cuerpo += trozo; if (cuerpo.length > 4000) peticion.destroy(); });
  peticion.on("end", () => {
    const valor = (new URLSearchParams(cuerpo).get("clave") ?? "").trim();
    if (!/^[\x21-\x7e]{20,}$/.test(valor)) return html(pagina("Eso no parece una clave: cópiala entera y sin espacios."));
    guardar(valor);
    html("<!doctype html><meta charset=utf-8><body style='font: 20px system-ui; margin: 20vh auto; max-width: 30em'>Clave guardada. Ya puedes cerrar esta pestaña y volver al chat.");
    console.log("Clave de OpenRouter guardada en .env.local.");
    servidor.close(() => process.exit(0));
  });
});

servidor.listen(0, "127.0.0.1", () => {
  const direccion = `http://127.0.0.1:${servidor.address().port}/`;
  console.log(`Página para pegar la clave: ${direccion}`);
  const [orden, ...resto] = process.platform === "win32" ? ["cmd", "/c", "start", "", direccion] : process.platform === "darwin" ? ["open", direccion] : ["xdg-open", direccion];
  if (process.argv.includes("--sin-abrir")) return;
  try { spawn(orden, resto, { stdio: "ignore", detached: true }).on("error", () => {}).unref(); } catch { /* si no se abre sola, la dirección ya está escrita arriba */ }
});
setTimeout(() => { console.log("Nadie pegó la clave en diez minutos: vuelve a lanzarlo cuando la tengas."); process.exit(1); }, 10 * 60 * 1000).unref();
