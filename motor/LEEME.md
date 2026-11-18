# El motor

Las herramientas de esta carpeta convierten la carpeta de un vídeo (`proyectos/<nombre>/`) en imágenes, medidas y un
mp4. Están hechas sobre Remotion: cada vídeo se dibuja con React en su propio `video.tsx`, y el motor pone lo común:
el reloj de la narración, los subtítulos, el sonido, la medición y el render. Cómo se usa cada una para hacer un vídeo
está en `plugin/skills/video/SKILL.md`; aquí está cómo están hechas.

## Qué hay en la carpeta de un vídeo

```
video.json        el título, el formato (reel, youtube, linkedin), la voz, la paleta y los ajustes del vídeo
video.tsx         lo que se ve: un componente de React con «export default» (y, si tiene portada, «export const Portada»)
guion.txt         lo que dice la voz; «(pausa 1,5)» es un silencio de esos segundos en ese punto
subtitulos.txt    opcional: un bloque del subtítulo por línea, *así* la palabra resaltada y «|» para partir en dos líneas
palabras.json     lo escribe voz.mjs: cuánto dura la voz y cuándo empieza y acaba cada palabra
sonidos.json      opcional: qué sonido suena en qué palabra (sonidos.mjs los mezcla en medios/sonidos.wav)
medios/           lo que el vídeo usa con staticFile("…"): voz.mp3, sonidos/, imágenes, vídeos
escenas.json      las escenas del vídeo (nombre y dónde empieza cada una): lo que el creador acepta de una en una
hechos.json       cada dato del guion (y cada texto de pantalla) con su fuente capturada y su cita literal
fuentes/          las fuentes capturadas con capturar.mjs (un repositorio, una página, la salida de un comando)
planos.md         el guion visual: por cada escena, qué actúa, qué hace, qué se entiende, qué se lee y el encuadre
decisiones.md     lo que el creador decidió para este vídeo, con sus palabras y la fecha: va en el brief de los jueces
notas.md          lo que se probó, lo que falló, lo que dijeron los jueces y lo que pidió el creador
revision/         todo lo que se genera para revisar: renders, fotogramas, láminas, medidas.json, las hojas de las
                  escenas y lo que aceptó el creador (escenas/), el juez de arte antes de animar (previo/), las
                  portadas (portadas/), el candidato sellado con sus briefs y dictámenes (jueces/), los clips de una
                  escena (clips/) y la copia exacta de cada entrega (entregas/)
```

## Lo que puede usar un `video.tsx`

```tsx
import React from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import { useNarracion } from "@motor";

export default function Video() {
  const { f, fps, cuando } = useNarracion();
  const aparece = spring({ frame: f - cuando("agente"), fps, config: { damping: 200 } });
  return <AbsoluteFill style={{ opacity: interpolate(aparece, [0, 1], [0.2, 1]) }} />;
}
```

- **`useNarracion()`** (de `@motor`): `f` es el fotograma del vídeo que se está dibujando; `t`, el segundo; `fps` y
  `frames`, los de todo el vídeo; `palabras`, las de la voz, cada una con `desde` y `hasta` en fotogramas; y
  `cuando(palabra, vez, apartirDe)` / `acaba(…)`, el fotograma en que empieza o termina de decirse (sin tildes,
  mayúsculas ni signos; si la voz no la dice, falla diciéndolo). Así cada cosa pasa en su palabra aunque se vuelva a
  grabar la voz.
- **Remotion entero**: `interpolate`, `spring`, `Easing`, `<Sequence>`, `<Img>`, `<OffthreadVideo>`, `staticFile`. Otro
  paquete que haga falta se instala con npm en la carpeta del taller.
- **Los subtítulos** los dibuja el motor encima del vídeo si su formato los lleva dibujados (`src/Subtitulos.tsx`). Se
  ajustan en `video.json` → `"subtitulo": { "arriba": 1200, "tamano": 76, "ancho": 780, "resalte": "#FFD84D",
  "borde": true }`, se quitan con `"subtitulo": false`, y un vídeo puede importar `Subtitulos` y ponerlos él.
- **La letra**: Figtree viene cargada (`LETRA`, de `@motor`). Otra se carga desde el vídeo con
  `@remotion/google-fonts/…`.
- **Pantallas recreadas que no «nadan»** (de `@motor`): `Ventana` (con barra y botones), `Linea` (aparece en su sitio
  con un fundido, nunca se desplaza), `Escribe` (teclea a tantos caracteres por segundo), `Cursor`, `Hueco` (altura
  fija para lo pasajero), `Pensando`, `Bala`, `Entrada`, `Tono.Dim/K/C/B/Ok/Mal` (colores del texto), `PANTALLA` (la
  paleta), `MONO` (la letra) y `empujon(f, fps, cortes)` (la única cámara sobre una pantalla: un zoom corto y frenado
  entre encuadres quietos). Todo depende del fotograma; nada usa `transition` ni `animation` de CSS.
- **`usePerfil()`** (de `@motor`) da el perfil del formato del vídeo: `zonas` (lo que tapa la red), `letra` (rotulo,
  pantalla, enlace, secundaria, minima), `aire`, `ancho` y `alto`. `render.mjs --zonas` pinta las zonas encima.
- **La portada**: `export const Portada = ({ variante }) => …` (1, 2 o 3) dibuja una imagen quieta del tamaño del
  vídeo con sus mismas piezas. `<Instante s={12.5}>…</Instante>` dibuja lo de dentro como está en ese segundo. La saca
  `portada.mjs`.
- **Las marcas para medir** (`data-medir` en cualquier elemento): `"marca"` (la cabecera o el logo del creador: no se
  le aplican las reglas), `"subtitulo"` (solo se mira dónde cae) y `"fuera"` (algo que se deja fuera a propósito).

## Escenas en 3D

Para explicar con objetos que actúan y no con cajas de texto (plugin/skills/video/SKILL.md §4, «La imagen explica»).
Todo sale de `"@motor/3d"`, que va aparte de `"@motor"` para que un vídeo sin 3D no cargue Three.js:

```tsx
import { useNarracion } from "@motor";
import { Escenario, Robot, Aro, camaraPorTramos, proyector, paso, muelle, recorrido, relevo } from "@motor/3d";

export default function Video() {
  const { t, fps, cuando } = useNarracion();               // t: el segundo; todo lo de la escena es función de t
  const cam = camaraPorTramos(ENCUADRES, TRAMOS, t), pr = proyector(cam, 1920, 1080);
  const p = pr([4, 0, 5]);                         // de metros a píxeles: dónde cae ese punto en el cuadro
  return (
    <AbsoluteFill>
      <Escenario ancho={1920} alto={1080} camara={cam}>
        <Robot x={recorrido(-6, RUTA, t)} z={0} t={t} activo={1} />
      </Escenario>
      <div style={{ position: "absolute", left: p.x, top: p.y }}>capturar</div>   {/* lo que se lee, en HTML */}
    </AbsoluteFill>
  );
}
```

- **El tiempo** (`src/tres/tiempo.ts`): `paso(t, desde, dura, curva)` va de 0 a 1; las curvas son `suave` (entre dos
  estados), `llega` (lo que entra) y `seVa` (lo que sale, que dura la mitad); `muelle(t, desde, fps)` para lo físico;
  `destello(t, desde)` sube y vuelve a cero. Dos patrones que explican mucho: `recorrido(inicio, [[cuándo, a dónde]…],
  t)`, algo que avanza por paradas, y `relevo([[cuándo, quién]…], t, sitio)`, algo escaso que pasa de mano en mano
  volando en arco (un cupo, un turno, un mensaje). `velocidad(pos, t)` da la velocidad de algo, para inclinarlo.
- **La cámara** (`src/tres/camara.ts`): `camaraPorTramos(encuadres, tramos, t)` pasa de un encuadre (`{ pos, mira,
  fov }`) al siguiente en cada tramo de voz, con arranque y frenado: un movimiento por idea. `proyector(cam, ancho,
  alto)` da la misma cámara en píxeles (`{ x, y, px, delante }`; `px` es cuánto mide un metro ahí).
- **El escenario** (`src/tres/Escenario.tsx`): `<Escenario ancho alto camara>` pone el lienzo, la cámara, la luz
  cálida con sombras, la de contra, el suelo con rejilla y la niebla que lo funde con el fondo del vídeo (`fondo`).
- **El acabado** (`src/tres/acabado.tsx`): el `Escenario` sale con acabado de estudio, que es lo que separa un render
  de producto de un plástico mate: los materiales reflejan un estudio de luces (paneles: techo, llave cálida, relleno
  frío y contra), el suelo es un espejo pulido con un charco de luz donde mira la cámara y baldosas de 2 m (el reflejo
  se apaga con la altura), lo que emite luz resplandece y el color pasa por una curva de cine. `acabado="plano"` lo
  deja como antes. Sus mandos: `suelo` (el color del charco), `rejilla` (el de las juntas; null las quita), `fondo`
  (el azul noche del horizonte), `foco` ([x, z] del charco), `reflejo`, `resplandor`, `exposicion` y `luz` (por encima
  de 1,15 lo blanco se quema). Con `suelo={null}` el lienzo queda transparente (una capa por delante), sin espejo ni
  resplandor. **Los materiales** van dentro del `<mesh>` en lugar de `<meshStandardMaterial>`: `<Ceramica />` (blanco
  con barniz: un robot, una pieza), `<Cristal />` (negro pulido: un visor), `<Satinado color />` (color vivo: una
  carpeta, una ficha), `<Metal />`, `<Papel />` y `<Emite color fuerza lineas />` (lo que da luz: de 1 a 2 se ve
  encendido, de 3 en adelante resplandece; un azul pide más que un blanco). Un `meshBasicMaterial` ni refleja ni
  recibe luz: solo para una luz plana. `<Contacto x z r />` es la sombra de contacto bajo lo que flota, y
  `cajaRedonda(ancho, alto, fondo, radio)` la geometría de una caja con los cantos redondeados (una de cantos vivos
  se ve de cartón). Las curvas, con vueltas de sobra (una esfera, 64 o más): el brillo delata cada faceta. Lo que
  se hizo antes del acabado (emisivos altos, halos grandes, `luz` por encima de 1) sale más fuerte: se baja.
  `medir.mjs` no pinta el suelo: es fondo, no dibujo.
- **Las piezas** (`src/tres/piezas.tsx`): `Robot` (un agente: flota, mira a cámara, se inclina al avanzar, se enciende
  cuando trabaja y se apaga si su rama no dio nada), `EsferaAgente` (el agente principal; su icono va encima en HTML),
  `Moneda` (una fuente o una marca, con su icono real: `icono={{ relleno: [d…] }}` o `{ trazo: [d…] }`, los trazos de
  su SVG de 24×24), `Hilo` (un hilo de luz que se tiende), `Carril`, `Nodo`, `Franja`, `Peana`, `Bandeja`,
  `Tarjeta` (vuela y se apila), `Barrera`, `Aro`, `Telefono`, `Halo` y `Charco` (luz). Son ladrillos: el objeto
  propio de un tema se modela en su `video.tsx` con Three.js normal (`<mesh>`, `<boxGeometry>`…) dentro del
  `Escenario`, y si sirve para más vídeos se trae aquí.
- **Cosas que hay que saber.** Dentro del `Escenario` no llega `useNarracion()`: calcula fuera y pasa `t` como prop. Nada
  de `useFrame` ni de cargar texturas de archivos (`texturaIcono` las pinta en un lienzo, sin esperas). Si el vídeo ya tiene un `Robot` suyo, importa el del motor con otro nombre (`Robot as Agente`). Lo que se lee
  va siempre en HTML encima del 3D: un texto dentro del lienzo no lo ve `medir.mjs`. Todo en metros, con el suelo en
  y = 0; un robot mide unos 2 de alto.

## El dibujo

`medir.mjs` saca de cada fotograma una imagen a un décimo de tamaño y cuenta (`lib/dibujo.mjs`), en la parte del
cuadro que la red deja ver, los píxeles que no son del color del lienzo: **dibujo** es el % del cuadro con algo
dibujado y **figura**, el % con algo que no es una caja de texto. Todo lo que sale de ahí es **aviso, nunca
«ARREGLAR»** (los umbrales están arriba de `lib/dibujo.mjs`, en `DIBUJO`): dos segundos con figura por debajo del
12 %, una mediana de dibujo por debajo del 22 % o más de 18 palabras a la vez. Es así a propósito: un vídeo en 2D
limpio que su creador prefirió medía un 10 %, y el mismo vídeo rehecho para llenar el cuadro, que descartó, del 23 al
35 %. `video.json` → `"medir": { "soloTexto": [[32, 35]] }` deja fuera unos segundos y `"dibujo": false` quita los
avisos. Dice dónde mirar, nada más.

## Por dentro

Lo que dibuja (`src/`, con Remotion y React):

- `Composicion.tsx`: la composición «video». Envuelve al `video.tsx` del proyecto (`Envoltorio`: espera a la letra, da
  el perfil y la narración a lo de dentro, monta el medidor si se pide) y le añade los subtítulos, las zonas, la voz y
  los sonidos. El tamaño y la duración salen de los datos del vídeo. `index.ts` la registra.
- `reloj.ts`: la narración (`useNarracion`): cada palabra con sus fotogramas y `cuando()` / `acaba()`.
- `Subtitulos.tsx`: el bloque en curso, con cada palabra entrando cuando suena y la clave en otro color.
- `Zonas.tsx`, `perfil.ts`: lo que tapa la red en cada formato, pintado encima para revisar, y `usePerfil()`.
- `Medir.tsx`: montado solo con `datos.medir`, escribe en la consola del navegador cada texto con su caja, su cuerpo de
  letra real, lo que lo corta, la pieza que lo contiene, su margen (hasta la tinta de las letras) y lo que se pisa.
- `Portada.tsx`, `entrada-portada.ts`: la composición «portada». `Instante.tsx`: un momento del vídeo, parado.
- `Pantalla.tsx`: las piezas de las pantallas recreadas. `tipografia.ts`: la letra. `datos.ts`: lo que recibe un vídeo.
- `tres/`: las escenas en 3D (`@motor/3d`; arriba). Entra en la firma solo de los vídeos cuyo `video.tsx` lo importa.

Lo común a las herramientas (`lib/`):

- `taller.mjs`: dónde está el taller, la carpeta de un vídeo, las claves (`.env.local`), el guion con sus pausas, los
  bloques del subtítulo y `abrirVideo()`, que prepara los datos que recibe el vídeo.
- `empaquetar.mjs`: junta el motor con el `video.tsx` de un proyecto (los nombres `@video`, `@motor` y `@motor/3d`).
- `argumentos.mjs`: las opciones de una orden. `candado.mjs`: una sola herramienta usa el motor a la vez
  (`motor/.candado.json`); la que llega después espera, o falla con `--sin-esperar`.
- `perfiles.mjs`: los formatos (reel, youtube, linkedin): tamaño, zonas, letra, aire y subtítulos.
- `firma.mjs`: la firma de un vídeo (un resumen de todo lo que decide cómo se ve y suena, incluido el motor que usa) y
  si hay un veredicto de los jueces vigente para ella.
- `escenas.mjs`: las escenas, sus fotogramas (ningún hueco de más de 2,5 s) y lo que aceptó el creador.
- `color.mjs`, `dibujo.mjs`: lo que mide `medir.mjs` del color y del dibujo. `parecido.mjs`: cuánto se parece lo
  oído a lo escrito. `laminas.mjs`: varias imágenes en una, con ffmpeg. `sonido.mjs`: el volumen de publicación.
- `srt.mjs`: el archivo de subtítulos. `portada-dentro.mjs`: la portada en el último fotograma de un reel entregado.
- `entregas.mjs`: la copia exacta de cada entrega y cómo volver a ella.

Las herramientas (`*.mjs`), cada una con su explicación arriba del archivo: `doctor`, `clave`, `nuevo`, `capturar`,
`voz`, `sonidos`, `render`, `medir`, `escenas`, `portada`, `jueces` y `publicar`.

- `voz.mjs` y el juez de audio de `jueces.mjs` usan OpenRouter con la clave de quien usa el taller: un modelo dice el
  guion (`/audio/speech`), otro lo escucha con el tiempo de cada palabra (`/audio/transcriptions`) y, antes de
  entregar, otro escucha el vídeo. `sonidos.mjs` no necesita clave: fabrica sonidos con ffmpeg y busca en Openverse.
- `jueces.mjs` comprueba `hechos.json`, sella el candidato (firma, fotogramas con y sin subtítulo, ráfagas, láminas,
  audio y un brief por juez) y valida los dictámenes: cada hallazgo es un defecto o un criterio (`tipo`), y solo
  bloquea un defecto crítico o alto. De la segunda ronda en adelante guarda el dictamen anterior y qué fotogramas
  cambiaron, para que los jueces verifiquen en vez de volver a auditarlo todo.

Si cambias el motor, dilo y apúntalo: cambia la firma de los vídeos que lo usan.
