// Los argumentos de una herramienta: «node motor/x.mjs <vídeo> --opcion valor --marca».
export function argumentos(lista = process.argv.slice(2)) {
  const args = [...lista];
  /** el valor que sigue a una opción («--paso 0.25» → "0.25"), o undefined si no está */
  const opt = (nombre) => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined; };
  /** ¿está esa marca? («--final») */
  const flag = (nombre) => args.includes(nombre);
  return { args, opt, flag };
}
