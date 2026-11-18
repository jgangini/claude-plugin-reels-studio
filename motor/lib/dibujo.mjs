// Cuánto del cuadro es dibujo y no fondo, y cuánto de ese dibujo es otra cosa que texto. Es lo que distingue un plano
// que explica con objetos de un panel con letras, líneas finas e iconos pequeños sobre un fondo vacío.
//
// Lo usa medir.mjs con la misma imagen pequeña que ya saca de cada fotograma (un PNG a un décimo de tamaño): cuenta, en
// la parte del cuadro que la red no tapa, los píxeles que no son del color del lienzo.
//   dibujo  % de esa parte del cuadro que tiene algo dibujado
//   figura  % que tiene algo dibujado fuera de las cajas de texto: lo que se ve sin leer
//
// Calibrado con los primeros vídeos del taller (motor/LEEME.md, «El dibujo»): los tres reels de referencia tienen
// una mediana de dibujo del 31 al 40 %; el vídeo de YouTube que el creador encontró «muy básico», del 10 %.
import zlib from "zlib";

/** un PNG de 8 bits sin entrelazar (lo que da el navegador) → { w, h, c (canales), px } */
export function leerPng(buf) {
  let o = 8, w = 0, h = 0, bits = 0, tipo = 0;
  const idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), t = buf.toString("ascii", o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + n);
    if (t === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bits = d[8]; tipo = d[9]; if (d[12]) throw new Error("PNG entrelazado: no se puede leer"); }
    else if (t === "IDAT") idat.push(d);
    else if (t === "IEND") break;
    o += 12 + n;
  }
  if (bits !== 8 || (tipo !== 2 && tipo !== 6)) throw new Error(`PNG de un tipo que no se lee aquí (bits ${bits}, tipo ${tipo})`);
  const c = tipo === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), bpl = w * c, px = Buffer.alloc(h * bpl);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (bpl + 1)], s = y * (bpl + 1) + 1, d = y * bpl;
    for (let x = 0; x < bpl; x++) {
      const a = x >= c ? px[d + x - c] : 0, b = y ? px[d - bpl + x] : 0, cc = x >= c && y ? px[d - bpl + x - c] : 0;
      let v = raw[s + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - cc, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - cc); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : cc; }
      px[d + x] = v & 255;
    }
  }
  return { w, h, c, px };
}

/** la parte del cuadro que la red deja ver, en píxeles del perfil: de la zona de arriba a la de abajo */
export function parteUtil(perfil) {
  const enteras = perfil.zonas.filter((z) => z.desde === undefined && z.hasta === undefined);
  const arriba = enteras.filter((z) => z.lado === "arriba").map((z) => z.limite), abajo = enteras.filter((z) => z.lado === "abajo").map((z) => z.limite);
  return { x1: 0, y1: arriba.length ? Math.max(...arriba) : 0, x2: perfil.ancho, y2: abajo.length ? Math.min(...abajo) : perfil.alto };
}

export const DIBUJO = {
  distinto: 40, // cuánto se aparta un píxel del lienzo (en cualquier canal, de 0 a 255) para contar como dibujo
  // por debajo de esto, sostenido, el plano se ve vacío o es solo texto. Las referencias no bajan de ahí más que un instante
  figuraAviso: 12, figuraError: 6, // % del cuadro con algo que no es texto
  segundos: 2, // lo que tiene que durar para contar (un fundido o una entrada no cuentan)
  medianaAviso: 22, medianaError: 12, // la mediana de dibujo del vídeo entero
  palabras: 18, // más palabras que estas a la vez en pantalla: se lee, no se mira
};

/**
 * Mide una imagen pequeña del fotograma. `lienzo` es [r, g, b] o null (entonces, el color que más se repite);
 * `util` la parte del cuadro que cuenta y `cajas` las cajas de texto y de marca, todo en píxeles del perfil;
 * `k` = ancho de la imagen / ancho del perfil.
 */
export function medirDibujo(img, { lienzo, util, cajas, marca, k }) {
  const { w, h, c, px } = img;
  let L = lienzo;
  if (!L) {
    const cuenta = new Map();
    for (let i = 0; i < w * h; i++) { const o = i * c, q = ((px[o] >> 4) << 8) | ((px[o + 1] >> 4) << 4) | (px[o + 2] >> 4); cuenta.set(q, (cuenta.get(q) ?? 0) + 1); }
    const q = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0];
    L = [((q >> 8) & 15) * 16 + 8, ((q >> 4) & 15) * 16 + 8, (q & 15) * 16 + 8];
  }
  // máscaras: 1 = caja de texto (con un poco de margen), 2 = marca del creador (no cuenta para nada)
  const m = new Uint8Array(w * h);
  const pinta = (r, v, aire) => {
    const x1 = Math.max(0, Math.floor((r[0] - aire) * k)), y1 = Math.max(0, Math.floor((r[1] - aire) * k)), x2 = Math.min(w, Math.ceil((r[0] + r[2] + aire) * k)), y2 = Math.min(h, Math.ceil((r[1] + r[3] + aire) * k));
    for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) if (m[y * w + x] < v) m[y * w + x] = v;
  };
  for (const r of cajas) pinta(r, 1, 6);
  for (const r of marca) pinta(r, 2, 6);
  let total = 0, dibujo = 0, figura = 0;
  const X1 = Math.round(util.x1 * k), X2 = Math.round(util.x2 * k), Y1 = Math.round(util.y1 * k), Y2 = Math.round(util.y2 * k);
  for (let y = Y1; y < Y2; y++) for (let x = X1; x < X2; x++) {
    const v = m[y * w + x];
    if (v === 2) continue;
    total++;
    const o = (y * w + x) * c;
    if (Math.max(Math.abs(px[o] - L[0]), Math.abs(px[o + 1] - L[1]), Math.abs(px[o + 2] - L[2])) > DIBUJO.distinto) { dibujo++; if (v === 0) figura++; }
  }
  return { dibujo: total ? (100 * dibujo) / total : 0, figura: total ? (100 * figura) / total : 0 };
}
