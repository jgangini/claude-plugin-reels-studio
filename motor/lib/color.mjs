// El color, medido: de qué familia es cada color (su tono), cuánto contrasta un texto con su fondo, y si las piezas de
// un vídeo hacen juego entre sí. Lo usan medir.mjs (el vídeo) y portada.mjs (la portada, contra el vídeo). Lo que se
// puede medir del color se mide aquí, antes de cualquier juez; el gusto (si la paleta dice lo que tiene que decir) lo
// juzga el juez de arte. Los criterios vienen de la guía del taller (plugin/skills/video/SKILL.md, «El color»), que
// adapta los de Impeccable (github.com/pbakaus/impeccable, Apache 2.0): colores por papel, el acento vale por escaso,
// los neutros solo se tiñen si eso da cohesión, y el contraste se mide, no se mira.
//
// Los colores van como [r, g, b] (0–255). El tono y el croma son los de OKLCH, que se parecen a como ve el ojo.

export const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
export function deHex(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
  if (!m) throw new Error(`«${h}» no es un color (se escribe #RRGGBB).`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
}
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

/** OKLab de un color: [L (0–1), a, b] */
export function oklab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
/** { L (0–1), C (croma: 0 gris, 0.1 vivo, 0.2 muy vivo), h (tono, 0–360) } */
export function oklch(c) {
  const [L, a, b] = oklab(c);
  return { L, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 };
}
/** lo que se parecen dos colores a la vista (0: iguales; 0,02: casi; 0,1: claramente distintos) */
export const distancia = (a, b) => { const A = oklab(a), B = oklab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
export const distTono = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const luminancia = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** el contraste de WCAG entre dos colores (1: ninguno; 4,5: lo que pide un texto; 3: lo que pide un texto grande) */
export function contraste(a, b) {
  const x = luminancia(a), y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** un color a media opacidad sobre un fondo */
export const mezcla = (c, fondo, op) => c.map((v, i) => v * op + fondo[i] * (1 - op));

// Los umbrales. Un neutro es un gris sin teñir; un color vivo es un acento.
export const COLOR = {
  neutro: 0.006, // por debajo de este croma, un color es un gris
  tenido: 0.012, // a partir de aquí se nota de qué tono es
  salto: 0.015, // un gris y un teñido que se llevan esto de croma son de familias distintas
  tono: 40, // grados de tono que separan dos familias
  vivo: 0.09, // a partir de este croma, un color es un acento
  vivosALaVez: 3, // más familias de color vivo que estas en un fotograma se ve cargado
  superficie: 0.03, // una pieza que ocupa esto del cuadro o más es una superficie (una tarjeta, una ventana)
  contrasteError: 3, contrasteAviso: 4.5,
};

const TONOS = [[15, "rosa"], [45, "rojo"], [70, "naranja"], [105, "oro"], [160, "verde"], [210, "turquesa"], [245, "azul verdoso"], [280, "azul"], [320, "violeta"], [360, "rosa"]];
/** «gris neutro», «azul», «azul verdoso»… */
export function nombre(c) {
  const o = oklch(c);
  if (o.C < COLOR.tenido) return "gris neutro"; // por debajo de lo que se nota, se le llama gris
  const t = TONOS.find(([hasta]) => o.h < hasta)[1];
  return o.C < COLOR.vivo ? `${t} apagado` : t;
}
export const ficha = (c) => `${hex(c)} (${nombre(c)})`;

/** ¿son de familias distintas? No por más claro o más oscuro, sino por teñido: otro tono, o uno gris y el otro no */
export function otraFamilia(a, b) {
  const A = oklch(a), B = oklch(b);
  if (A.C >= COLOR.tenido && B.C >= COLOR.tenido) return distTono(A.h, B.h) > COLOR.tono;
  return Math.abs(A.C - B.C) >= COLOR.salto;
}

/** junta colores casi iguales (un fundido, una opacidad): devuelve [{ c, veces: [s…], n }] por orden de aparición */
function juntar(vistos) {
  const out = [];
  for (const v of vistos) {
    const ya = out.find((o) => distancia(o.c, v.c) < 0.02);
    if (ya) { ya.veces.push(v.s); ya.n++; }
    else out.push({ c: v.c, veces: [v.s], n: 1, ...(v.de ? { de: v.de } : {}) });
  }
  return out;
}
const tramo = (v) => { const u = [...new Set(v)].sort((a, b) => a - b); return u.length > 1 ? `${u[0]}–${u[u.length - 1]} s` : `${u[0]} s`; };

/**
 * Lo que se puede decir del color de un vídeo mirando todas sus medidas (las de motor/src/Medir.tsx):
 * muestras: [{ s, textos: [{ s, c, b, g, op, fs }], piezas: [[x, y, w, h]], fondos: [rgb | null] }]
 * opciones: { area (del cuadro, en los mismos píxeles), lienzo: rgb | null, acentos: [rgb], significado: [rgb] (colores
 * de marcas ajenas o con significado: no cuentan como acentos), ignora: (texto) => bool }
 * Devuelve { hallazgos: [{ regla, nivel, etiqueta, que, veces: [s…] }], resumen } (el contraste de cada texto lo mira
 * medir.mjs, texto a texto, con `contrasteDe`).
 */
export function analizar(muestras, { area, lienzo = null, acentos = [], significado = [], ignora = () => false } = {}) {
  const hallazgos = [];
  const yaDicho = new Set(); // parejas de superficies ya señaladas: no se repiten texto a texto
  // 1. las superficies: las piezas grandes con fondo
  const sup = [];
  for (const m of muestras) (m.piezas ?? []).forEach((r, i) => {
    const c = m.fondos?.[i];
    if (c && r[2] * r[3] >= COLOR.superficie * area) sup.push({ c, s: m.s });
  });
  const superficies = juntar(sup).filter((x) => x.n > 1 || muestras.length === 1);
  const clase = (c) => { const L = oklch(c).L; return L < 0.45 ? "oscuras" : L > 0.7 ? "claras" : "medias"; };
  for (const [i, a] of superficies.entries()) for (const b of superficies.slice(i + 1)) {
    if (clase(a.c) !== clase(b.c) || !otraFamilia(a.c, b.c)) continue;
    yaDicho.add(`${hex(a.c)}|${hex(b.c)}`).add(`${hex(b.c)}|${hex(a.c)}`);
    hallazgos.push({ regla: "color-superficies", nivel: "aviso", etiqueta: `${hex(a.c)} y ${hex(b.c)}`, veces: [...a.veces, ...b.veces],
      que: `dos superficies ${clase(a.c)} de familias distintas: ${ficha(a.c)}, en ${tramo(a.veces)}, y ${ficha(b.c)}, en ${tramo(b.veces)}. Las tarjetas y ventanas de un vídeo son de la misma familia, o se ve de dos juegos` });
  }
  if (lienzo && oklch(lienzo).C >= 0.008) for (const a of superficies) {
    const A = oklch(a.c);
    if (clase(a.c) === clase(lienzo) && A.C >= COLOR.salto && distTono(A.h, oklch(lienzo).h) > COLOR.tono) {
      hallazgos.push({ regla: "color-lienzo", nivel: "aviso", etiqueta: hex(a.c), veces: a.veces,
        que: `superficie teñida de otro tono que el lienzo: ${ficha(a.c)} sobre ${ficha(lienzo)}. Se tiñe con el tono del lienzo, o se deja gris` });
    }
  }
  // 2. el mismo texto sobre fondos de familias distintas: la misma pieza con dos colores
  const porTexto = new Map();
  for (const m of muestras) for (const t of m.textos ?? []) {
    if (!t.b || t.g || t.s.length < 6 || ignora(t.s)) continue;
    if (!porTexto.has(t.s)) porTexto.set(t.s, []);
    porTexto.get(t.s).push({ c: t.b, s: m.s });
  }
  const fondosDeTexto = {};
  for (const [texto, vistos] of porTexto) {
    const fondos = juntar(vistos);
    fondosDeTexto[texto] = fondos.map((f) => hex(f.c));
    for (const [i, a] of fondos.entries()) for (const b of fondos.slice(i + 1)) {
      if (clase(a.c) !== clase(b.c)) continue; // de una tarjeta oscura a un informe claro no es la misma pieza
      if (!otraFamilia(a.c, b.c) || [...yaDicho].some((k) => { const [x, y] = k.split("|").map(deHex); return distancia(x, a.c) < 0.02 && distancia(y, b.c) < 0.02; })) continue;
      hallazgos.push({ regla: "color-pieza", nivel: "aviso", etiqueta: `«${texto.slice(0, 40)}»`, veces: [...a.veces, ...b.veces],
        que: `la misma pieza con dos colores: va sobre ${ficha(a.c)} en ${tramo(a.veces)} y sobre ${ficha(b.c)} en ${tramo(b.veces)}` });
    }
  }
  // 3. los colores vivos: cuántas familias a la vez, y cuáles se salen de los acentos declarados
  const todosVivos = [];
  const cargados = new Map(); // n → { veces, colores }
  for (const m of muestras) {
    const vivos = [];
    const mira = (c, de) => { if (c && oklch(c).C >= COLOR.vivo) { vivos.push({ c, s: m.s, de }); todosVivos.push({ c, s: m.s, de }); } };
    for (const t of m.textos ?? []) if (!t.g && !ignora(t.s)) mira(t.c, `«${t.s.slice(0, 24)}»`);
    (m.fondos ?? []).forEach((c) => mira(c, "una pieza"));
    const familias = [];
    for (const v of vivos) if (!familias.some((f) => distTono(oklch(f.c).h, oklch(v.c).h) <= COLOR.tono)) familias.push(v);
    if (familias.length > COLOR.vivosALaVez) {
      const k = familias.length, ya = cargados.get(k) ?? { veces: [], colores: familias };
      ya.veces.push(m.s);
      cargados.set(k, ya);
    }
  }
  for (const [k, v] of cargados) hallazgos.push({ regla: "color-vivos", nivel: "aviso", etiqueta: `${k} colores vivos a la vez`, veces: v.veces,
    que: `${v.colores.map((x) => `${ficha(x.c)} en ${x.de}`).join(", ")}. Más de ${COLOR.vivosALaVez} familias de color vivo en un plano se ve cargado: el acento vale por escaso` });
  const vivos = juntar(todosVivos).filter((x) => x.n > 1 || muestras.length === 1);
  if (acentos.length) for (const v of vivos) {
    if ([...acentos, ...significado].some((a) => distTono(oklch(a).h, oklch(v.c).h) <= 30)) continue;
    hallazgos.push({ regla: "color-fuera", nivel: "aviso", etiqueta: hex(v.c), veces: v.veces,
      que: `color vivo fuera de la paleta declarada: ${ficha(v.c)}, en ${v.de ?? "una pieza"} (acentos: ${acentos.map(hex).join(", ")}). Si es el color de una marca ajena o lleva significado, apúntalo en "significado"; si no, sobra o es un acento más` });
  }
  const linea = (x) => ({ hex: hex(x.c), nombre: nombre(x.c), luz: +oklch(x.c).L.toFixed(3), croma: +oklch(x.c).C.toFixed(3), tono: Math.round(oklch(x.c).h), veces: tramo(x.veces) });
  return { hallazgos, resumen: { lienzo: lienzo ? hex(lienzo) : null, acentos: acentos.map(hex), superficies: superficies.map(linea), vivos: vivos.map(linea), fondosDeTexto } };
}

/**
 * El contraste de un texto con su fondo: { ratio, fondo } o null si no se sabe sobre qué va (sin pieza con fondo y sin
 * lienzo declarado, o a medio fundido).
 */
export function contrasteDe(t, lienzo = null) {
  const fondo = t.b ?? lienzo;
  if (!t.c || !fondo || (t.op ?? 1) < 0.95) return null; // a medio fundido no se mide: el contraste es el del texto ya asentado
  return { ratio: contraste(t.c, fondo), fondo };
}

/** la paleta que declara un vídeo en video.json → "paleta": { "lienzo": "#07080D", "acentos": ["#FFC46B"], "significado": ["#FF5A5A"] } */
export function paletaDe(video = {}) {
  const p = video.paleta ?? {};
  return { declarada: !!video.paleta, lienzo: p.lienzo ? deHex(p.lienzo) : null, acentos: (p.acentos ?? (p.acento ? [p.acento] : [])).map(deHex), significado: (p.significado ?? []).map(deHex) };
}
