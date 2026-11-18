// El archivo de subtítulos (.srt) de un vídeo, a partir de las palabras de la voz con su tiempo. Es lo que se sube a
// YouTube (y, si se quiere, a LinkedIn) cuando el subtítulo no va dibujado en el vídeo. Cada entrada lleva como mucho
// dos líneas de 42 caracteres, se corta en el final de una frase o en una coma, y dura lo que tarda en decirse.
const tiempo = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** parte un texto en dos líneas lo más iguales posible si no cabe en una */
function enLineas(palabras, linea) {
  const texto = palabras.join(" ");
  if (texto.length <= linea) return texto;
  let mejor = 1, dif = Infinity;
  for (let k = 1; k < palabras.length; k++) {
    const a = palabras.slice(0, k).join(" ").length, b = palabras.slice(k).join(" ").length;
    if (Math.abs(a - b) < dif) { dif = Math.abs(a - b); mejor = k; }
  }
  return `${palabras.slice(0, mejor).join(" ")}\n${palabras.slice(mejor).join(" ")}`;
}

/** palabras: [{ texto, inicio, fin }] (las de datos.palabras) → el texto del .srt */
export function srtDe(palabras, { linea = 42 } = {}) {
  const entradas = [];
  let actual = [];
  const cierra = () => { if (actual.length) entradas.push(actual); actual = []; };
  for (const [i, w] of palabras.entries()) {
    const largo = [...actual, w].map((x) => x.texto).join(" ").length;
    if (actual.length && largo > 2 * linea) cierra(); // no cabe en dos líneas: empieza otra entrada
    actual.push(w);
    const sig = palabras[i + 1];
    const finDeFrase = /[.!?…]["»”)]*$/.test(w.texto) || (sig && /^[¿¡]/.test(sig.texto));
    const pausa = /[,;:]$/.test(w.texto) && actual.map((x) => x.texto).join(" ").length > linea; // una coma, si ya va larga
    if (finDeFrase || pausa) cierra();
  }
  cierra();
  return entradas.map((e, i) => {
    const sig = entradas[i + 1];
    const desde = e[0].inicio;
    // se queda un momento después de la última palabra, sin pisar la entrada siguiente
    const hasta = Math.max(desde + 0.3, Math.min(e[e.length - 1].fin + 0.4, sig ? sig[0].inicio - 0.04 : Infinity));
    return `${i + 1}\n${tiempo(desde)} --> ${tiempo(hasta)}\n${enLineas(e.map((x) => x.texto), linea)}\n`;
  }).join("\n");
}
