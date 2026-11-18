// Mide lo que se está dibujando en un fotograma, para motor/medir.mjs: cada texto con su caja en pantalla, su cuerpo de
// letra real (con las escalas aplicadas), si algo lo corta, qué pieza lo contiene y con qué margen, y qué se pisa con
// qué. No dibuja nada: escribe las medidas en la consola del navegador («MEDIR:…») y medir.mjs las recoge. Solo se monta
// con datos.medir; nunca en un render normal.
//
// Marcas que entiende (atributo data-medir en cualquier elemento, vale para todo lo que lleva dentro):
//   data-medir="marca"      la cabecera o el logo del creador: no se le aplican las reglas (lo fija preferencias.md)
//   data-medir="subtitulo"  el subtítulo del motor: solo se comprueba que no caiga en lo que tapa la red
//   data-medir="fuera"      algo que se deja fuera a propósito (apunta el porqué en notas.md)
import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";

type Rect = [number, number, number, number]; // x, y, ancho, alto
type Rgb = [number, number, number];
export type TextoMedido = {
  s: string; // el texto (hasta 70 caracteres)
  r: Rect[]; // una caja por línea
  fs: number; // cuerpo de letra en píxeles de pantalla
  op: number; // opacidad acumulada
  g: string; // grupo (data-medir) o ""
  corte: number; // píxeles que le come un recorte (overflow) o el borde del cuadro; 0 si nada
  elipsis: boolean; // acaba en «…» porque no cabe
  caja: number; // índice de la pieza que lo contiene, o -1
  margen: number; // el menor margen entre el texto y el borde de su pieza (px); -1 si no tiene pieza
  tinta: boolean; // arriba y abajo, el margen se midió hasta la tinta de las letras (si no, se supuso un 15 % del cuerpo)
  chip: boolean; // su pieza es un resaltado o una píldora de una línea (se le pide menos margen)
  tapado: number; // fracción del texto que queda debajo de una pieza ajena pintada después
  encima: string; // otro texto con el que se pisa, o ""
  c: Rgb | null; // el color de las letras
  b: Rgb | null; // el color del fondo sobre el que va (el de la caja con fondo más cercana que lo contiene), o null si va suelto
};
export type Medida = { f: number; textos: TextoMedido[]; piezas: Rect[]; fondos: (Rgb | null)[] }; // fondos: el color de cada pieza, o null si solo tiene borde

const alfa = (c: string) => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return c === "transparent" ? 0 : 1;
  const p = m[1].split(",").map((x) => parseFloat(x));
  return p.length > 3 ? p[3] : 1;
};
/** un color calculado por el navegador («rgb(21, 33, 42)») → [r, g, b]; null si es transparente o no se entiende */
const rgb = (c: string): Rgb | null => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map((x) => parseFloat(x));
  if (p.length < 3 || p.some((x) => !Number.isFinite(x)) || (p.length > 3 && p[3] < 0.5)) return null;
  return [Math.round(p[0]), Math.round(p[1]), Math.round(p[2])];
};
const corta = (a: Rect, b: Rect) => {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? w * h : 0;
};

// La tinta de un texto: cuánto aire hay de la caja de su línea a sus letras, arriba y abajo, en píxeles de pantalla. La
// letra se mide en un lienzo con la misma fuente; si la caja de la línea no mide lo que la fuente dice (otra fuente de
// reserva, texto de SVG), no se puede fiar y devuelve null.
let lienzo: CanvasRenderingContext2D | null | undefined;
function tinta(texto: string, s: CSSStyleDeclaration, k: number, altoLinea: number): [number, number] | null {
  if (lienzo === undefined) lienzo = document.createElement("canvas").getContext("2d");
  let t = texto.replace(/\s+/g, " ").trim();
  if (!lienzo || !t) return null;
  if (s.textTransform === "uppercase") t = t.toUpperCase();
  else if (s.textTransform === "lowercase") t = t.toLowerCase();
  lienzo.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = lienzo.measureText(t);
  const caja = (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent) * k;
  if (!(caja > 0) || Math.abs(caja - altoLinea) > 0.1 * altoLinea) return null;
  return [Math.max(0, (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent) * k), Math.max(0, (m.fontBoundingBoxDescent - m.actualBoundingBoxDescent) * k)];
}
/** el trozo de un texto de varias líneas que cae en la primera (o en la última): hasta donde cambia de renglón */
function renglon(n: Node, crudo: string, alReves: boolean): string {
  const r = document.createRange();
  let y: number | null = null, alto = 0, i = alReves ? crudo.length - 1 : 0;
  for (let vistos = 0; i >= 0 && i < crudo.length && vistos < 240; i += alReves ? -1 : 1, vistos++) {
    r.setStart(n, i);
    r.setEnd(n, i + 1);
    const q = r.getBoundingClientRect();
    if (q.width < 0.5 || q.height < 1) continue; // un espacio que no se dibuja
    if (y === null) { y = q.top; alto = q.height; }
    else if (Math.abs(q.top - y) > alto / 2) break;
  }
  return alReves ? crudo.slice(i + 1) : crudo.slice(0, i);
}
const primeraLinea = (n: Node, crudo: string) => renglon(n, crudo, false);
const ultimaLinea = (n: Node, crudo: string) => renglon(n, crudo, true);

/** grande: la escala del perfil del vídeo (1 en un reel; 1,75 en 16:9, donde todo se dibuja más grande) */
function medir(raiz: HTMLElement, f: number, grande: number): Medida {
  const W = raiz.clientWidth, H = raiz.clientHeight;
  const estilos = new Map<Element, CSSStyleDeclaration>();
  const cs = (e: Element) => estilos.get(e) ?? (estilos.set(e, getComputedStyle(e)), estilos.get(e)!);
  // opacidad acumulada, si está oculto o desenfocado (saliendo), y el grupo
  const estado = (el: Element) => {
    let op = 1, grupo = "", borroso = false;
    for (let e: Element | null = el; e && e !== raiz.parentElement; e = e.parentElement) {
      const s = cs(e);
      if (s.display === "none" || s.visibility === "hidden") return { op: 0, grupo, borroso };
      op *= parseFloat(s.opacity || "1");
      const b = s.filter.match(/blur\(([\d.]+)px\)/);
      if (b && parseFloat(b[1]) > 1.5) borroso = true;
      if (!grupo && e instanceof HTMLElement && e.dataset.medir) grupo = e.dataset.medir;
    }
    return { op, grupo, borroso };
  };
  const escala = (el: Element) => {
    if (el instanceof HTMLElement && el.offsetWidth > 0) return el.getBoundingClientRect().width / el.offsetWidth;
    const g = el as unknown as SVGGraphicsElement;
    if (typeof g.getScreenCTM === "function") { const m = g.getScreenCTM(); if (m) return Math.hypot(m.a, m.b); }
    return el.parentElement ? escala(el.parentElement) : 1;
  };

  // las piezas: cajas con fondo, borde o sombra interior, de tamaño de tarjeta (no el fondo entero)
  const piezas: { el: Element; r: Rect; c: Rgb | null }[] = [];
  for (const el of Array.from(raiz.querySelectorAll<HTMLElement>("div, span, section"))) {
    const s = cs(el);
    const fondo = alfa(s.backgroundColor) > 0.5; // un degradado suele ser un brillo, no una caja
    const borde = (parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderLeftWidth) > 0) || s.boxShadow.includes("inset"); // una raya sola es un separador
    if (!fondo && !borde) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 60 * grande || b.height < 36 * grande || (b.width > 0.97 * W && b.height > 0.6 * H)) continue;
    const e = estado(el);
    if (e.op < 0.55 || e.borroso || e.grupo === "fuera" || e.grupo === "marca") continue;
    piezas.push({ el, r: [b.left, b.top, b.width, b.height], c: fondo ? rgb(s.backgroundColor) : null });
  }

  const textos: (TextoMedido & { el: Element })[] = [];
  const paseo = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = paseo.nextNode(); n; n = paseo.nextNode()) {
    const s = (n.textContent || "").replace(/\s+/g, " ").trim();
    const el = n.parentElement;
    if (!s || !el) continue;
    const e = estado(el);
    if (e.op < 0.55 || e.borroso || e.grupo === "fuera") continue;
    const rango = document.createRange();
    rango.selectNodeContents(n);
    const lineas: Rect[] = [];
    for (const q of Array.from(rango.getClientRects())) {
      if (q.width < 1 || q.height < 1) continue;
      const igual = lineas.find((l) => Math.abs(l[1] - q.top) < q.height / 2);
      if (igual) { const x2 = Math.max(igual[0] + igual[2], q.right); igual[0] = Math.min(igual[0], q.left); igual[2] = x2 - igual[0]; }
      else lineas.push([q.left, q.top, q.width, q.height]);
    }
    if (!lineas.length) continue;
    const x1 = Math.min(...lineas.map((l) => l[0])), y1 = Math.min(...lineas.map((l) => l[1]));
    const x2 = Math.max(...lineas.map((l) => l[0] + l[2])), y2 = Math.max(...lineas.map((l) => l[1] + l[3]));
    // lo que corta un recorte de algún contenedor, o el borde del cuadro
    let corte = Math.max(0, -x1, -y1, x2 - W, y2 - H);
    for (let a: Element | null = el; a && a !== raiz; a = a.parentElement) {
      const sa = cs(a);
      if (sa.overflowX === "visible" && sa.overflowY === "visible") continue;
      const b = a.getBoundingClientRect();
      corte = Math.max(corte, b.left - x1, b.top - y1, x2 - b.right, y2 - b.bottom);
    }
    const sEl = cs(el);
    const k = escala(el);
    const cuerpo = parseFloat(sEl.fontSize) * k;
    // la caja de una línea trae aire propio encima y debajo de las letras: se mide la tinta de verdad (un «¿» o una «g»
    // cuelgan, una «Á» sube) y, si no se puede, se le supone un 15 % del cuerpo
    const crudo = n.textContent || "";
    const medida = tinta(lineas.length > 1 ? primeraLinea(n, crudo) : crudo, sEl, k, lineas[0][3]);
    const medidaAbajo = lineas.length > 1 ? tinta(ultimaLinea(n, crudo), sEl, k, lineas[lineas.length - 1][3]) : medida;
    const aireArriba = medida ? medida[0] : 0.15 * cuerpo, aireAbajo = medidaAbajo ? medidaAbajo[1] : 0.15 * cuerpo;
    // el color de las letras, y el del fondo sobre el que van: la caja con fondo más cercana que las contiene
    const color = rgb(el instanceof SVGElement ? sEl.fill : sEl.color);
    let detras: Rgb | null = null;
    for (let a: Element | null = el; a && a !== raiz.parentElement && !detras; a = a.parentElement) { const sa = cs(a); if (alfa(sa.backgroundColor) > 0.5) detras = rgb(sa.backgroundColor); }
    const elipsis = sEl.textOverflow === "ellipsis" && el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1;
    // la pieza más pequeña que lo contiene, y el margen que le deja
    let caja = -1, margen = -1, area = Infinity, chip = false;
    piezas.forEach((p, i) => {
      if (!p.el.contains(el)) return;
      const a = p.r[2] * p.r[3];
      if (a >= area) return;
      area = a; caja = i; chip = p.r[3] <= 1.9 * cuerpo;
      margen = Math.min(x1 - p.r[0], p.r[0] + p.r[2] - x2, y1 - p.r[1] + aireArriba, p.r[1] + p.r[3] - y2 + aireAbajo);
    });
    textos.push({ s: s.slice(0, 70), r: lineas, fs: cuerpo, op: e.op, g: e.grupo, corte: Math.max(0, Math.round(corte)), elipsis, caja, margen: Math.round(margen), tinta: !!(medida && medidaAbajo), chip, tapado: 0, encima: "", c: color, b: detras, el });
  }

  // lo que se pisa: un texto debajo de una pieza ajena pintada después, y un texto encima de otro
  for (const t of textos) {
    const areaT = t.r.reduce((a, l) => a + l[2] * l[3], 0) || 1;
    for (const p of piezas) {
      if (p.el.contains(t.el) || t.el.contains(p.el)) continue;
      if (!(t.el.compareDocumentPosition(p.el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue; // la pieza va antes: no lo tapa
      const dentro = t.r.reduce((a, l) => a + corta(l, p.r), 0) / areaT;
      if (dentro > t.tapado) t.tapado = Math.round(dentro * 100) / 100;
    }
    for (const u of textos) {
      if (u === t || t.el === u.el || t.el.contains(u.el) || u.el.contains(t.el) || t.el.parentElement === u.el.parentElement) continue;
      const areaU = u.r.reduce((a, l) => a + l[2] * l[3], 0) || 1;
      let pisa = 0;
      for (const a of t.r) for (const b of u.r) pisa += corta(a, b);
      if (pisa / Math.min(areaT, areaU) > 0.2) { t.encima = u.s; break; }
    }
  }
  const red = (r: Rect): Rect => [Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3])];
  return {
    f,
    textos: textos.map(({ el: _el, ...t }) => ({ ...t, r: t.r.map(red), fs: Math.round(t.fs * 10) / 10, op: Math.round(t.op * 100) / 100 })),
    piezas: piezas.map((p) => red(p.r)),
    fondos: piezas.map((p) => p.c),
  };
}

export const Medir: React.FC<{ escala?: number }> = ({ escala = 1 }) => {
  const f = useCurrentFrame();
  const yo = useRef<HTMLSpanElement>(null); // su padre es el cuadro entero del vídeo
  // en el mismo commit que el fotograma, después de los hermanos: las medidas salen antes de la captura
  useLayoutEffect(() => {
    const raiz = yo.current?.parentElement;
    if (!raiz) return;
    const json = JSON.stringify(medir(raiz, f, escala));
    for (let i = 0, n = Math.ceil(json.length / 6000); i < n; i++) console.log(`MEDIR:${f}:${i}:${n}:${json.slice(i * 6000, (i + 1) * 6000)}`);
  });
  return <span ref={yo} data-medir="fuera" style={{ display: "none" }} />;
};
