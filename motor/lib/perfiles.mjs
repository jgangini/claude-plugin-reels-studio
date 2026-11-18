// Los perfiles de formato: cada canal tiene su vídeo, hecho en su formato (no se recorta uno del otro). Un vídeo dice
// cuál es el suyo en video.json → "formato": "reel" | "youtube" | "linkedin"; sin declarar es «reel», para que los
// proyectos de antes no cambien. El perfil fija el tamaño, lo que tapa cada red, las medidas mínimas de la letra, el
// aire, la política de subtítulos y cómo es la portada. Lo leen el motor (motor/src, por datos.perfil), medir.mjs, los
// briefs de jueces.mjs, render.mjs y portada.mjs: si una red cambia algo, se cambia aquí y en ningún otro sitio.
//
// Todas las medidas van en píxeles del tamaño del perfil. Las zonas del reel son las de siempre (Instagram, medidas);
// las de YouTube y LinkedIn salen de guías de terceros, no de las propias redes: son
// prudentes y aproximadas. Si dudas, deja más margen.
//
// Una zona es un borde del cuadro que la red tapa: { lado, limite } y, si no ocupa todo el borde, { desde, hasta } en el
// otro eje. «holgura» es el margen de aviso antes de la zona (si falta, el del perfil).

export const PERFILES = {
  reel: {
    id: "reel",
    es: "un reel vertical",
    para: "Instagram/TikTok",
    red: "Instagram",
    quien: "lo ve gente pasando vídeos con el dedo, en el móvil, muchas veces sin sonido",
    ritmo: "Lo ve gente pasando vídeos sin parar: si nada se mueve, se va",
    ancho: 1080, alto: 1920,
    movil: "360×640", enMovil: "a un tercio", // cómo se ve en un móvil en vertical
    escala: 1, // cuánto más grande hay que dibujar que en un reel para que en el móvil se vea igual
    holgura: 20,
    zonas: [
      { id: "arriba", lado: "arriba", limite: 270, holgura: 0, tapa: "la parte de arriba", que: "arriba, bajo la barra de Instagram", cerca: "la barra de Instagram" },
      { id: "abajo", lado: "abajo", limite: 1440, tapa: "la de abajo", que: "abajo, bajo el texto de Instagram", cerca: "lo que tapa Instagram por abajo" },
      { id: "botones", lado: "derecha", limite: 950, desde: 1050, hasta: 1440, tapa: "la columna de botones de la derecha", que: "bajo los botones de Instagram", cerca: "los botones de Instagram", rotulo: "BOTONES" },
    ],
    letra: { minima: 22, secundaria: 26, pantalla: 32, enlace: 36, rotulo: 44 },
    aire: { piezas: 32, borde: 16, linea: 4 }, // entre piezas sueltas, del texto al borde de su pieza, grosor de una línea
    // lo que mide medir.mjs del texto (de su tinta) al borde de su pieza: por debajo de «error» hay que arreglarlo, por
    // debajo de «aviso» se mira; una píldora o un resaltado de una línea va más ceñido (chipError, chipAviso)
    margen: { error: 12, aviso: 16, chipError: 4, chipAviso: 8 },
    subtitulos: "quemados",
    subtitulo: {}, // el de motor/src/Subtitulo.tsx tal cual: está pensado para el reel
    portada: {
      como: "En Instagram, TikTok y Shorts la portada es un fotograma del vídeo: se diseña con lo importante en el centro.",
      // la cuadrícula del perfil de Instagram enseña el centro de la portada, recortado a 3:4 (aproximado)
      zonas: [
        { id: "arriba", lado: "arriba", limite: 240, holgura: 0, que: "arriba, fuera del recorte de la cuadrícula de Instagram", cerca: "el recorte de la cuadrícula" },
        { id: "abajo", lado: "abajo", limite: 1680, holgura: 0, que: "abajo, fuera del recorte de la cuadrícula de Instagram", cerca: "el recorte de la cuadrícula" },
      ],
    },
  },

  youtube: {
    id: "youtube",
    es: "un vídeo horizontal",
    para: "YouTube",
    red: "YouTube",
    quien: "lo ve alguien que hizo clic en una miniatura o lo buscó, con sonido, en el móvil, en el ordenador o en la tele, y que concede medio minuto antes de irse",
    ritmo: "Quien lo ve hizo clic y tiene otro vídeo a un toque: si nada se mueve, se va",
    ancho: 1920, alto: 1080,
    movil: "390×220", enMovil: "a un quinto",
    // un 16:9 en un móvil en vertical se ve 1,8 veces más pequeño que un reel: lo que en el reel es 32 px aquí es 56
    escala: 1.75,
    holgura: 36,
    zonas: [
      // en pausa o al pasar el ratón, el reproductor pone arriba el título y sus iconos; en una tele, el borde se pierde
      { id: "arriba", lado: "arriba", limite: 54, holgura: 0, tapa: "el borde de arriba", que: "arriba, bajo el título y los iconos del reproductor de YouTube", cerca: "el borde de arriba" },
      // abajo van la barra de progreso y los controles (un 10 % del alto) y, justo encima, los subtítulos del .srt
      { id: "abajo", lado: "abajo", limite: 972, holgura: 54, tapa: "la franja de abajo", que: "abajo, bajo la barra y los controles de YouTube", cerca: "donde YouTube pone los subtítulos y la barra" },
    ],
    letra: { minima: 40, secundaria: 46, pantalla: 56, enlace: 64, rotulo: 78 },
    aire: { piezas: 56, borde: 28, linea: 7 },
    margen: { error: 21, aviso: 28, chipError: 7, chipAviso: 14 },
    // la pantalla queda para el dibujo: el subtítulo va en un archivo .srt que YouTube pone encima (render.mjs lo escribe)
    subtitulos: "srt",
    subtitulo: { tamano: 96, interlineado: 108, ancho: 1500, arriba: 700 }, // solo si el vídeo pide quemarlo ("subtitulo": {…})
    portada: {
      como: "La miniatura de YouTube se ve a unos 168×94 px en el móvil: de una a tres palabras enormes, un solo sujeto y mucho contraste. YouTube deja probar hasta tres.",
      minimo: { ancho: 1280, alto: 720 }, pesoMaximoMB: 2,
      // YouTube pone la duración del vídeo en la esquina de abajo a la derecha de la miniatura
      zonas: [{ id: "duracion", lado: "derecha", limite: 1680, desde: 960, holgura: 0, que: "bajo la duración que YouTube pone en la esquina", cerca: "la duración" }],
    },
  },

  linkedin: {
    id: "linkedin",
    es: "un vídeo cuadrado",
    para: "LinkedIn (subido como vídeo nativo)",
    red: "LinkedIn",
    quien: "aparece en el feed entre publicaciones, casi siempre sin sonido, a gente que está trabajando (muchos, en el ordenador), que decide en dos o tres segundos si se queda",
    ritmo: "Aparece en un feed, sin sonido, entre publicaciones: si nada se mueve, lo pasan",
    ancho: 1080, alto: 1080,
    movil: "360×360", enMovil: "a un tercio",
    escala: 1, // ocupa el ancho del móvil, como un reel: valen sus medidas
    holgura: 20,
    zonas: [
      // el reproductor del feed pone abajo la barra, el tiempo y el botón de sonido (un 10 % del alto, aproximado)
      { id: "abajo", lado: "abajo", limite: 972, tapa: "la franja de abajo", que: "abajo, bajo los controles del reproductor de LinkedIn", cerca: "los controles de LinkedIn" },
    ],
    letra: { minima: 22, secundaria: 26, pantalla: 32, enlace: 36, rotulo: 44 },
    aire: { piezas: 32, borde: 16, linea: 4 },
    margen: { error: 12, aviso: 16, chipError: 4, chipAviso: 8 },
    subtitulos: "quemados", // en el feed se ve sin sonido
    subtitulo: { arriba: 780 }, // dos líneas justo encima de los controles; cada vídeo lo mueve en video.json
    portada: {
      como: "En LinkedIn la portada tiene la forma del vídeo, y el primer fotograma tiene que entenderse sin sonido.",
      zonas: [],
    },
  },
};

/** lo que se le pide a una portada cuando se ve en pequeño (portada.mjs): px ya reducida a `miniatura` de ancho */
export const PORTADA = {
  miniatura: 168, // el ancho al que YouTube enseña una miniatura en el móvil
  titular: 11, // el texto más grande, como mínimo (a 1920 de ancho son 126 px; a 1080, 71)
  resto: 8, // por debajo de esto un texto no se lee en pequeño: sobra o va más grande
  palabras: 4, // más palabras grandes que estas no se leen de un vistazo (lo suyo son de una a tres)
  contraste: 3, // entre las letras y su fondo, medido en la miniatura (4,5 es lo cómodo)
};

/**
 * Cuántos fotogramas de portada lleva al final el vídeo entregado (lib/portada-dentro.mjs). En un reel, uno: en Shorts
 * y en algunas cuentas de TikTok la portada solo se elige entre los fotogramas del vídeo. En YouTube y en LinkedIn se
 * sube como imagen, y no va dentro. Va fuera de PERFILES a propósito: es cosa de la entrega y no cambia la firma.
 */
export const PORTADA_DENTRO = { reel: 1 };

/** el perfil de un vídeo, por su video.json (sin "formato" es «reel») */
export function perfilDe(video = {}) {
  const id = video.formato ?? "reel";
  const perfil = PERFILES[id];
  if (!perfil) throw new Error(`video.json: no hay ningún formato «${id}». Los que hay: ${Object.keys(PERFILES).join(", ")} (sin "formato" es reel).`);
  return perfil;
}

const eje = (z) => (z.lado === "arriba" || z.lado === "abajo" ? "y" : "x");
const otro = (z) => (eje(z) === "y" ? "x" : "y");

/**
 * ¿Cae una caja en una zona tapada? La caja va en píxeles del perfil: { x1, y1, x2, y2 }. Devuelve null, o
 * { nivel: "error" | "aviso", que } con la frase que enseña medir.mjs.
 */
export function enZona(z, c, holguraDelPerfil = 20) {
  const h = z.holgura ?? holguraDelPerfil;
  const d = z.desde ?? -Infinity, a = z.hasta ?? Infinity;
  if (eje(z) === "y" ? !(c.x2 > d && c.x1 < a) : !(c.y2 > d && c.y1 < a)) return null; // no pasa por el tramo de la zona
  const v = { arriba: c.y1, abajo: c.y2, izquierda: c.x1, derecha: c.x2 }[z.lado];
  const dentro = z.lado === "arriba" || z.lado === "izquierda" ? z.limite - v : v - z.limite; // > 0: metido en la zona
  const verbo = { arriba: "empieza en", abajo: "acaba en", izquierda: "empieza en", derecha: "llega a" }[z.lado];
  const tramo = z.desde != null ? ` desde ${otro(z)} ${z.desde}` : "";
  if (dentro > 0) return { nivel: "error", que: `${z.que} (${verbo} ${eje(z)} ${Math.round(v)}, límite ${z.limite}${tramo})` };
  if (dentro > -h) return { nivel: "aviso", que: `a menos de ${h} px de ${z.cerca} (${verbo} ${eje(z)} ${Math.round(v)})` };
  return null;
}

const condicion = (z) => `${eje(z)} ${z.lado === "arriba" || z.lado === "izquierda" ? "<" : ">"} ${z.limite}${z.desde != null ? ` desde ${otro(z)} ${z.desde}` : ""}`;
const lista = (xs, ultimo = " y ") => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")}${ultimo}${xs[xs.length - 1]}`);

/** «Instagram tapa la parte de arriba (por encima de y 270), …, medido en 1080×1920.» */
export function fraseZonas(p) {
  if (!p.zonas.length) return `${p.red} no tapa nada del cuadro (${p.ancho}×${p.alto}).`;
  const una = (z) => `${z.tapa} (${z.lado === "arriba" ? `por encima de y ${z.limite}` : z.lado === "abajo" ? `por debajo de y ${z.limite}` : condicion(z)})`;
  return `${p.red} tapa ${lista(p.zonas.map(una))}, medido en ${p.ancho}×${p.alto}.`;
}

/** «y < 270, y > 1440 ni en x > 950 desde y 1050» */
export const dondeNo = (p) => lista(p.zonas.map(condicion), " ni en ");

/** la ficha del perfil, en líneas: lo que comprueba medir.mjs y lo que usan los jueces (medir.mjs --ficha) */
export function ficha(p) {
  const L = p.letra;
  return [
    `Formato ${p.id}: ${p.es} de ${p.ancho}×${p.alto} para ${p.para}. En un móvil se ve ${p.enMovil} (${p.movil}).`,
    `Quién lo ve: ${p.quien}.`,
    `Lo que tapa la red: ${fraseZonas(p)} Margen de aviso: ${p.holgura} px.`,
    `La letra: rótulos ${L.rotulo} o más; lo que se lee en una pantalla recreada, ${L.pantalla} o más; un enlace que se copia, ${L.enlace} o más; etiquetas secundarias, ${L.secundaria} o más; nada por debajo de ${L.minima}.`,
    `El aire: ${p.aire.piezas} px o más entre piezas sueltas; ${p.aire.borde} o más del texto al borde de su pieza; líneas de ${p.aire.linea} px o más.`,
    `Lo que mide medir.mjs del texto al borde de su pieza: por debajo de ${p.margen.error} px, arreglar; por debajo de ${p.margen.aviso}, aviso. En una píldora o un resaltado de una línea: ${p.margen.chipError} y ${p.margen.chipAviso}. Una pieza que entra en lo que tapa la red, arreglar; a menos de ${p.holgura} px, aviso.`,
    p.subtitulos === "srt"
      ? `Los subtítulos: no se dibujan; van en un archivo .srt (render.mjs lo escribe junto al vídeo). Para quemarlos, "subtitulo": {…} en video.json.`
      : `Los subtítulos: quemados en el vídeo${p.subtitulo.arriba ? `, con la primera línea en y ${p.subtitulo.arriba} si video.json no dice otra cosa` : ""}.`,
    `La portada: ${p.portada.como}${p.portada.minimo ? ` Como mínimo ${p.portada.minimo.ancho}×${p.portada.minimo.alto}${p.portada.pesoMaximoMB ? ` y hasta ${p.portada.pesoMaximoMB} MB` : ""}.` : ""}`,
  ];
}
