// Cuánto se parece lo que se oye a lo que está escrito, palabra por palabra y en orden. Lo usan voz.mjs (para darle su
// tiempo a cada palabra del guion) y el juez de audio (para saber si la voz dice lo que dice el guion).
import { llano } from "./taller.mjs";

/**
 * Empareja dos listas de palabras ya «llanas» respetando el orden: la subsecuencia común más larga. Devuelve, por cada
 * palabra de `a`, la posición de su pareja en `b`, o -1 si no tiene.
 */
export function emparejar(a, b) {
  const comun = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) comun[i][j] = a[i] === b[j] ? comun[i + 1][j + 1] + 1 : Math.max(comun[i + 1][j], comun[i][j + 1]);
  }
  const pareja = new Array(a.length).fill(-1);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) pareja[i++] = j++;
    else if (comun[i + 1][j] >= comun[i][j + 1]) i++;
    else j++;
  }
  return pareja;
}

/** compara un texto escrito con uno oído: qué parte de lo escrito se oye (de 0 a 1) y qué falta o sobra */
export function compararTextos(escrito, oido) {
  const a = String(escrito).split(/\s+/).map(llano).filter(Boolean), b = String(oido).split(/\s+/).map(llano).filter(Boolean);
  const pareja = emparejar(a, b), usadas = new Set(pareja.filter((j) => j >= 0));
  const diferencias = [
    ...a.map((palabra, i) => (pareja[i] < 0 ? `no se oye «${palabra}» (palabra ${i + 1} del guion)` : null)).filter(Boolean),
    ...b.map((palabra, j) => (usadas.has(j) ? null : `se oye de más «${palabra}» (palabra ${j + 1} de lo oído)`)).filter(Boolean),
  ];
  return { coincidencia: a.length ? Math.round((1000 * usadas.size) / a.length) / 1000 : 0, diferencias };
}
