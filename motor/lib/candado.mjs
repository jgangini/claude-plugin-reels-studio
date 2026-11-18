// El candado del motor: medir, sacar escenas, dibujar portadas y renderizar abren un navegador y usan la tarjeta
// gráfica; dos a la vez (dos conversaciones sobre la misma carpeta) se pisan y pueden colgar el ordenador. Quien entra
// deja motor/.candado.json con su pid y lo que hace; quien llega después espera a que termine (o falla con
// --sin-esperar). Un candado de un proceso que ya no existe no cuenta.
import fs from "node:fs";
import path from "node:path";
import { TALLER } from "./taller.mjs";

const ARCHIVO = path.join(TALLER, "motor", ".candado.json");
const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
const leer = () => { try { return JSON.parse(fs.readFileSync(ARCHIVO, "utf-8")); } catch { return null; } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const hace = (iso) => { const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)); return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`; };

/** quién tiene el motor ahora mismo, o null */
export function ocupadoPor() {
  const c = leer();
  return c && c.pid !== process.pid && vivo(c.pid) ? c : null;
}

/**
 * Toma el motor para esta herramienta. Si otro lo tiene, espera (hasta `minutos`) y lo dice una vez; con
 * `esperar: false` falla al momento. Lo suelta solo al salir el proceso.
 */
export async function tomarMotor(que, video, { esperar = !process.argv.includes("--sin-esperar"), minutos = 30 } = {}) {
  const mio = { pid: process.pid, que, video, desde: new Date().toISOString() };
  const tope = Date.now() + minutos * 60000;
  let avisado = false;
  for (;;) {
    try {
      fs.writeFileSync(ARCHIVO, JSON.stringify(mio) + "\n", { flag: "wx" });
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      const otro = leer();
      if (!otro || !vivo(otro.pid)) { fs.rmSync(ARCHIVO, { force: true }); continue; } // quedó de un proceso que murió
      const quien = `${otro.que} de «${otro.video}» (pid ${otro.pid}, desde hace ${hace(otro.desde)})`;
      if (!esperar) throw new Error(`El motor está ocupado: ${quien}. Solo va una cosa a la vez; espera a que termine.`);
      if (Date.now() > tope) throw new Error(`El motor sigue ocupado después de ${minutos} min: ${quien}. Si ese proceso está colgado, ciérralo y vuelve a intentarlo.`);
      if (!avisado) { console.log(`el motor está ocupado: ${quien}. Espero a que termine…`); avisado = true; }
      await dormir(3000);
    }
  }
  const suelta = () => { const c = leer(); if (c?.pid === process.pid) fs.rmSync(ARCHIVO, { force: true }); };
  process.on("exit", suelta);
  for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => { suelta(); process.exit(130); });
  return suelta;
}
