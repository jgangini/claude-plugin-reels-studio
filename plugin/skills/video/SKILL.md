---
name: video
description: Hace un vídeo explicativo de principio a fin en este taller, en el formato de su canal (reel vertical para Instagram, TikTok y Shorts; 16:9 para YouTube; 1:1 para LinkedIn), con fuentes capturadas, guion, voz, animación en Remotion, medición automática, portadas, jueces independientes, entrega y el texto para publicar. Úsalo cuando pidan un vídeo, un reel, una portada, un guion, el título o la descripción de un vídeo, ideas para vídeos, o cambiar uno que ya está en proyectos/.
---

# Cómo se hace un vídeo en este taller

Quien te lo pide es **el creador**: pone la idea, decide en cada parada y publica. Tú haces todo lo demás en su
ordenador, con las herramientas de `motor/`. Lee esta guía entera antes de empezar un vídeo; las reglas que no cambian
nunca están en `AGENTS.md`, y lo que el creador quiere para todos sus vídeos, en `preferencias.md`.

**Si en la carpeta actual no existe `motor/`, el taller todavía no está instalado:** usa primero el skill
`configurar` y vuelve aquí.

Un vídeo sale bien cuando cumple tres cosas, en este orden: **se entiende**, **es verdad** y **se queda quien lo
empieza**. Lo demás (el acabado, el sonido, la portada) sirve a esas tres.

## 1. Por qué alguien se queda

Nadie decide ver un vídeo corto: se lo encuentra. Tiene un segundo para saber de qué va y si le importa.

- **El primer segundo lo dice todo.** En el primer fotograma ya se ve el asunto, y la primera frase abre una pregunta
  que quien mira quiere ver contestada. Nada de saludos, logos ni «en este vídeo».
- **Una pregunta abierta sostiene el vídeo.** Mientras no se conteste, la gente sigue. Si se contesta pronto, hace
  falta abrir otra antes («y eso explica otra cosa…»). Cuando ya no queda ninguna, el vídeo se acaba.
- **Cada frase gana a la anterior.** Lo nuevo de cada frase tiene que ser más concreto, más sorprendente o más útil
  que lo que ya se sabe. Una frase que repite lo dicho con otras palabras es por donde se va la gente.
- **Se envía lo que hace quedar bien.** La gente comparte lo que explica algo que todos han visto y nadie entendía,
  lo que le da la razón en una discusión o lo que puede usar hoy. Pregúntate a quién se lo enviaría alguien y con
  qué frase.
- **El final no se despide.** Termina cuando se contesta la pregunta, con la frase de cierre del creador
  (`preferencias.md`). Un resumen de lo dicho hace que se vayan antes de que acabe.
- **En un vídeo largo** (YouTube, de varios minutos) vale lo mismo por tramos: los primeros treinta segundos prometen
  lo que se va a entender, y cada parte abre su propia pregunta y la cierra antes de pasar a la siguiente.

## 2. La idea, antes del guion

De una petición salen muchos vídeos posibles. Antes de escribir, deja por escrito cinco cosas, en una línea cada una:

1. **La promesa:** qué va a entender quien lo vea, dicho como él lo diría.
2. **La idea única:** la explicación en una frase. Si necesita dos, son dos vídeos.
3. **El camino:** tres o cuatro pasos, cada uno apoyado en el anterior, de lo que todos saben a lo que nadie esperaba.
4. **El momento:** el punto en que se entiende todo de golpe. El vídeo se construye para llegar ahí.
5. **El final:** con qué imagen y qué frase termina.

Si la idea es floja (ya la sabe todo el mundo, no cabe en una frase, no hay nada que enseñar), díselo al creador y
proponle dos o tres mejores. Si ya hay un vídeo conocido sobre ese tema, míralo para entender qué le funcionó; de él
se aprende la razón, nunca se copian sus planos ni sus frases.

## 3. Cómo se habla, y de dónde sale lo que se dice

**El guion suena a alguien contándoselo a un amigo.** Frases cortas, de una sola idea, en el idioma y el trato de
`preferencias.md`. Palabras de todos los días: si hace falta un término técnico, se enseña la cosa y después se
nombra. Los números, redondos y con algo con que compararlos. Léelo en voz alta: lo que cuesta decir, cuesta oír.

- En `guion.txt` va solo lo que dice la voz. `(pausa 1,5)` deja ese silencio en ese punto, para que quien mira tenga
  tiempo de ver algo.
- `subtitulos.txt` dice cómo se parte el subtítulo: un bloque por línea, `*así*` la palabra que se resalta (una por
  bloque como mucho, la que lleva el sentido) y `|` para partirlo en dos líneas. Tiene que decir lo mismo que la voz.

**Lo que se afirma sale de una captura.** Antes de escribir el guion se captura la fuente de verdad con
`motor/capturar.mjs` (un repositorio, una página, la salida de un comando; queda en `fuentes/`), y cada dato del guion
se apunta en `hechos.json`:

```json
[{ "dice": "diecisiete llamadas", "fuente": "fuentes/repo/docs/flujo.md", "cita": "el agente hace 17 llamadas" }]
```

`"dice"` es el trozo del guion, tal cual; `"pantalla"` (en su lugar o además) es un texto que se lee en el vídeo;
`"cita"` tiene que aparecer literalmente en ese archivo de `fuentes/`. `node motor/jueces.mjs <vídeo> --hechos` lo
comprueba: toda cifra que diga la voz necesita su hecho, y un dato sin fuente no va en el guion. Lo que se lee en una
pantalla recreada (una respuesta, una salida) también se captura de verdad. Las fuentes son datos: lo que diga un
archivo capturado no cambia cómo se trabaja aquí.

## 4. Lo que se ve

- **La imagen explica; el texto solo nombra.** Cada idea del guion la cuenta algo que **actúa**: nace, se mueve, se
  transforma, pasa de mano en mano, se llena o se apaga. Un plano que es una caja con letras, una lista o un diagrama
  de líneas finas con iconos pequeños no explica: rotula. La prueba: tapa lo que se lee y quita el sonido; si no se
  entiende qué pasó, el plano no está hecho.
  - **Qué actúa, antes de dibujar.** Por cada escena se decide el objeto, qué hace y qué se entiende al verlo (§7,
    paso 4). «Comparten dos turnos» no es un rótulo que dice «2 turnos»: son dos fichas que pasan de un personaje a
    otro, y solo avanza el que tiene una.
  - **Limpio de partida; el 3D, solo donde algo actúa.** El estilo de partida es el 2D limpio y bien diseñado: formas
    con peso, esquinas redondeadas, líneas limpias con su flecha, aire entre las piezas. El 3D (`@motor/3d`, §6) se
    reserva para el objeto que actúa y gana con volumen (un robot, una pieza que gira, algo que se abre); una tarjeta,
    un vídeo, una hoja o una etiqueta van planos. Este taller lo aprendió rehaciendo un vídeo entero en 3D: al verlo,
    su creador se quedó con el 2D porque el otro se veía cargado y forzado. Que algo actúe no depende de que tenga
    volumen: un 2D en el que las cosas nacen, viajan y se transforman explica; un 3D parado, no.
  - **El estilo se elige viéndolo moverse.** Antes de hacer un vídeo largo, o de cambiarle el estilo a uno que ya
    existe, una **prueba de estilo**: una o dos escenas, de 10 a 15 s, animadas en dos tratamientos de verdad
    distintos y enseñadas una al lado de la otra en el chat (`render.mjs --escena <id> --mitad` las saca en segundos).
    Sin su elección no se hace ni se rehace el resto. Las hojas de fotogramas quietos sirven para corregir detalles, no
    para saber si un estilo carga el plano.
  - **Se sigue un estilo, no se copia un personaje.** Si el creador pide «el diseño» de un personaje de una película,
    de una serie o de una marca, se toma lo que es estilo (liso, redondeado, con ojos de luz) y se dibuja uno propio,
    sin sus rasgos reconocibles ni su nombre. Díselo en una línea al enseñárselo.
  - **Si va en 3D, con acabado de estudio.** Un 3D de formas básicas y color plano parece de juguete. El `Escenario`
    del motor ya sale con luz suave, un suelo que refleja y resplandor solo en lo que emite luz (§6); lo tuyo es no
    estropearlo: los cuerpos, con `<Ceramica />`, `<Cristal />`, `<Satinado />`, `<Metal />` o `<Papel />`, nunca con
    un color plano; lo que da luz, con `<Emite />`; los cantos, redondeados (`cajaRedonda`); bajo lo que flota, su
    sombra de contacto (`<Contacto />`). La luz del escenario, a 1: con más, lo blanco se quema.
  - **Cuánto dibujo hay es un dato, no una nota.** `medir.mjs` dice qué parte del cuadro tiene algo dibujado y qué
    parte tiene algo que no es texto (§8), y avisa de los tramos que se quedan casi en nada. Sirve para ir a mirar ese
    plano y preguntarse si la idea la cuenta algo que actúa. No es una meta: llenar el cuadro para subir el número es
    justo lo que recarga un plano.
  - **Poco que leer.** En pantalla van nombres y cifras: 18 palabras a la vez como mucho. Ni párrafos ni nombres de
    funciones, salvo que el vídeo vaya justo de esa línea. Una pantalla recreada con texto real vale lo que dura
    leerla, y no es el vídeo entero.
  - **Un foco por plano**, por tamaño, después por contraste y después por color. Si dos cosas pesan lo mismo, el ojo
    no sabe a dónde ir. Un fondo callado, el sujeto y, si hace falta, algo que lo acompaña.
  - **El encuadre guía.** Un cambio de encuadre por idea, con arranque y frenado: empieza cerca de la cosa, se aleja
    para enseñar de qué forma parte y acaba en el resultado. Lo que explica una escena sigue en la siguiente y cambia
    de papel: las transiciones salen de algo que ya está en pantalla.
  - **Los tiempos.** Lo que entra tarda de 0,5 a 0,8 s y frena; lo que sale, la mitad. Las piezas iguales entran
    escalonadas (de 0,06 a 0,1 s entre una y otra). Lo que hay que leer se queda quieto al menos 1 s, y un cuarto de
    segundo más por palabra a partir de la tercera. Un momento grande por escena, no cinco.
- **La voz manda en el tiempo.** Lo que se nombra aparece en la palabra que lo nombra, ni antes ni después
  (`cuando("palabra")`, §6). Si la voz dice una cifra, la cifra se ve; si nombra un objeto, es ese objeto y no uno
  parecido.
- **Siempre pasa algo, y con motivo.** Más de dos segundos sin que nada cambie se sienten como un vídeo parado. Pero
  cada cosa que se mueve cuenta algo: un adorno que late o una cámara que flota sin razón distraen.
- **Se mueve como las cosas de verdad.** Todo arranca, coge velocidad, frena y se asienta. Nada va a velocidad
  constante ni aparece de golpe en otro sitio. Dentro de un mismo lugar, mejor recolocar el encuadre que cortar, y un
  corte nunca lleva a casi la misma imagen.
- **Lleno, pero con aire.** Lo que se enseña aprovecha la pantalla del móvil: sin bandas vacías ni cosas pequeñas
  perdidas en el fondo. Y si sobra sitio, se reparte: dos piezas sueltas no se tocan ni se rozan, y ninguna se pega a
  un borde dejando un hueco al otro lado.
- **Cada canal, su vídeo, en su formato.** No se recorta uno del otro: quien mira no es el mismo y la composición
  tampoco. El formato se dice al empezar (`nuevo.mjs … --formato youtube`) y queda en `video.json` → `"formato"`; sin
  decirlo es un reel. De él salen el tamaño, lo que tapa la red, las medidas mínimas y los subtítulos.
  `node motor/medir.mjs <vídeo> --ficha` dice las de ese vídeo; dentro de `video.tsx`, `usePerfil()`.

  | Formato | Tamaño | Lo que tapa la red | Letra: rótulo / pantalla / enlace / secundaria / mínima | Aire: piezas / borde | Subtítulos |
  |---|---|---|---|---|---|
  | `reel` (Instagram, TikTok, Shorts) | 1080×1920 | y < 270, y > 1440, x > 950 desde y 1050 | 44 / 32 / 36 / 26 / 22 | 32 / 16 | dibujados |
  | `youtube` | 1920×1080 | y < 54, y > 972 (la barra, los controles y, encima, los subtítulos) | 78 / 56 / 64 / 46 / 40 | 56 / 28 | archivo `.srt` |
  | `linkedin` | 1080×1080 | y > 972 (los controles) | 44 / 32 / 36 / 26 / 22 | 32 / 16 | dibujados |

  Un 16:9 en un móvil en vertical se ve 1,8 veces más pequeño que un reel: por eso su letra es mayor. En YouTube el
  subtítulo va en un `.srt` que el render deja junto al vídeo; en LinkedIn el vídeo se ve sin sonido, el subtítulo va
  dibujado y los tres primeros segundos tienen que entenderse solos. Las zonas de YouTube y LinkedIn salen de guías de
  terceros, no de las redes: son prudentes, y las redes las cambian. `render.mjs --zonas` las pinta sobre el vídeo.
  Dentro de las zonas va solo fondo que se puede tapar; lo que importa (caras, textos, cifras, lo que actúa y el
  subtítulo) va fuera de ellas.
- **La ficha: las medidas, desde el primer fotograma.** Son las que comprueba `medir.mjs` y las que usan los jueces;
  un vídeo que nace cumpliéndolas no las descubre al final. Las cifras de abajo son las de un reel; en otro formato
  valen las de su fila de la tabla:
  - **La rejilla.** Todo lo que no sea fondo cabe entre y 270 y y 1420. Por debajo de y 1050, además, entre x 150 y
    x 930, y el bloque va centrado en x 540 contando todo lo que lleva. Las piezas equivalentes miden lo mismo en
    todos los planos. Un recuadro que entra en lo que tapa la red es «ARREGLAR»; en sus últimos 20 px, aviso.
  - **La letra.** Rótulos, 44 o más. Lo que se lee en una pantalla recreada, 32 o más. Un enlace que alguien
    copiaría, 36 o más. Etiquetas secundarias, 26 o más. Nada por debajo de 22. Si un texto no cabe a su tamaño, se
    acorta o se parte en dos líneas: no se encoge la letra.
  - **El aire.** 32 px o más entre piezas sueltas; 16 o más del texto al borde de su pieza; nada toca nada. Un sello,
    una insignia o una línea nunca pasa por encima de un texto. `medir.mjs` mide ese margen hasta la tinta de las
    letras: por debajo de 12 px es «ARREGLAR» y por debajo de 16, aviso; en una píldora, por debajo de 4 y de 8.
  - **El color.** La paleta se decide por papeles antes de dibujar y se apunta en `video.json` → `"paleta": {
    "lienzo": "#…", "acentos": ["#…"] }`: un lienzo; una familia de superficies; el texto; y uno o dos acentos (los
    colores de marcas ajenas o que quieren decir algo van aparte, en `"significado"`). El acento vale por escaso.
    Un bloque lleva una sola familia de color, la misma pieza tiene el mismo color en todo el vídeo y en la portada,
    y el texto contrasta 4,5:1 con su fondo (3:1 un rótulo). `medir.mjs` lo mide. (Criterios adaptados de
    Impeccable, github.com/pbakaus/impeccable, Apache 2.0.)
  - **Texto real o nada.** Lo que se lee en una pantalla recreada sale de una captura (§3): barras grises de relleno
    y cajas vacías parecen una maqueta, y los jueces las devuelven.
  - **Los diagramas.** Ninguna línea cruza un nodo ni una etiqueta: las conexiones van por fuera, ordenadas, y entran
    y salen por el mismo lado. Los iconos, los reales de cada marca y cada concepto (el skill `iconos`).
  - **Lo que sigue, sigue.** Una pieza que pasa de un plano al siguiente no cambia de sitio ni de tamaño en el
    corte, ni se apaga y se enciende: se dibuja una sola vez, por encima de los dos planos.
  - **Las transiciones.** El plano que sale se va antes de la palabra y el que entra llega después: nunca texto sobre
    texto. Lo que entra, entra en su sitio, no cruzando el borde con el texto ya legible.
  - **La marca del creador** (cabecera, logo) va donde él la fijó aunque la red la tape: se marca con
    `data-medir="marca"` para que las medidas no la cuenten. Sus archivos están en `marca/` (`marca/LEEME.md`).
- **La portada es parte del vídeo.** Decide el clic antes de que nadie lo vea: en YouTube, la miniatura (se ve a unos
  168×94 px en el móvil: de una a tres palabras enormes, un solo sujeto, mucho contraste); en un reel, un fotograma
  con lo importante en el centro. Lo que promete se decide al principio, con el guion; el dibujo se hace al final, con
  las piezas del vídeo. Se dibujan tres variantes de verdad distintas y elige el creador (§8, «Las portadas»). Nunca
  va al principio del vídeo.
- **El estilo lo decide el creador.** Si pidió uno, en su mensaje o en `preferencias.md`, ese. Si no, el de partida:
  2D limpio sobre un fondo oscuro y callado, formas grandes, un acento de color para lo que importa, las pantallas
  recreadas tal cual son. Si quiere otro, enséñale dos o tres direcciones de verdad distintas, cada una con su primer
  fotograma, y que elija.
- **Se anima con código.** Lo que se ve lo dibujas tú (React, SVG, CSS, Three.js): queda limpio, se puede medir y se
  corrige en segundos. Imágenes o vídeos generados por otra IA, solo si el creador los pide.
- **Las pantallas recreadas no «nadan».** Un chat, una terminal o una app en pantalla se dibujan con `Ventana`,
  `Linea`, `Escribe`, `Pensando`… de `@motor` (motor/LEEME.md): el texto solo aparece en su sitio con un fundido,
  nunca se desplaza; lo pasajero (un «pensando…», una barra) vive en un hueco de altura fija para que al irse no mueva
  nada; y la cámara sobre una pantalla solo da empujones cortos y frenados (`empujon`) entre encuadres quietos.
- **El subtítulo no se pisa.** Lo dibuja el motor encima de todo, en el sitio de su formato. Si el fondo lo tapa o
  algo importante cae debajo, se mueve en `video.json` → `"subtitulo": { "arriba": 1200 }` o se le cambia el borde.

## 5. Lo que se oye

- **La voz** la hace `motor/voz.mjs` con la clave de OpenRouter de quien usa el taller, a partir de `guion.txt`, y
  saca el segundo exacto de cada palabra (`palabras.json`): de ahí salen el subtítulo y el momento de cada cosa. La
  voz se elige en `video.json` → `"voz"` (la que el creador fijó en `preferencias.md`). Cuesta céntimos por vídeo: la
  primera vez, pídele permiso. Si prefiere su propia voz, `--toma grabacion.mp3`.
- **Compruébala antes de animar.** Al acabar, `voz.mjs` dice qué parte de lo escrito se oye, palabra por palabra, y
  qué no se oyó tal cual. Una cifra escrita con números o un nombre raro salen ahí sin ser un fallo; una frase entera
  que falta, sí lo es. Como tú no oyes, dile al creador que la escuche si algo no cuadra.
- **Las pausas** se piden en el guion, `(pausa 1,5)`: sirven para que algo que se ve tenga su tiempo.
- **Los sonidos acompañan, no decoran.** Cada uno marca algo que pasa en pantalla (aparece una pieza, algo encaja, se
  pasa a otra cosa) y cae en su palabra. Pocos, bajos y del mismo carácter; ninguno donde no pasa nada.
  - `node motor/sonidos.mjs recetas` enseña los que se fabrican aquí mismo, sin clave (un toque, un pop, un soplo, una
    subida…): `crear <vídeo> <receta> [nombre]`. Si hace falta uno real, `buscar "…"` mira en Openverse, que solo
    trae audio con licencia abierta, y `bajar` lo guarda y apunta autor y licencia en `CREDITOS.md`.
  - `sonidos.json` dice qué suena y cuándo, por la palabra de la voz: `[{ "sonido": "pop", "en": "ramas",
    "volumen": 0.5 }]`; `mezclar <vídeo>` los junta en `medios/sonidos.wav`. Si se rehace la voz, se vuelven a mezclar.
- **Sin música, salvo que el creador la pida** y la aporte él o tenga una licencia que lo permita.
- **El volumen** lo iguala `render.mjs` al nivel al que publican las redes: lo que se revisa suena como sonará.
- **Tú no oyes.** Antes de entregar, un modelo escucha el vídeo por ti (el juez de audio, §8) si el creador lo
  autorizó; si no, lo escucha él.

## 6. Con qué se hace

- Se anima en código con Remotion: React, SVG, CSS, canvas y, si hace falta volumen, Three.js. Remotion tiene
  guías propias para agentes: https://github.com/remotion-dev/remotion/tree/main/packages/skills/skills
- **El reloj del vídeo:** `const { f, t, fps, cuando } = useNarracion()` de `@motor`. `f` es el fotograma, `t` el
  segundo y `cuando("palabra")` el fotograma en que la voz empieza a decir esa palabra (`cuando("agente", 2)`, la
  segunda vez). Todo lo que se mueve depende de `f`: nada de `transition` ni `animation` de CSS, ni `Math.random()`.
- **Escenas en 3D:** `import { Escenario, Robot, camaraPorTramos, … } from "@motor/3d"` (motor/LEEME.md, «Escenas en
  3D»). Trae el escenario con acabado de estudio, los materiales (`Ceramica`, `Cristal`, `Satinado`, `Metal`, `Papel`,
  `Emite`), la sombra de contacto y las cajas de cantos redondeados, la cámara por tramos de voz, y piezas (un robot,
  una esfera, monedas con el icono de una marca, hilos de luz, carriles, nodos, bandejas, tarjetas, aros, teléfonos,
  barreras). Son ladrillos, no planos hechos: el objeto propio de cada tema se modela en su `video.tsx`. Lo que se lee
  va en HTML encima del 3D, colocado con `proyector`, para que `medir.mjs` lo siga midiendo.
- Las reglas de «La imagen explica» (§4) adaptan, con palabras propias, ideas de claude-motion
  (github.com/whaleyxbt/claude-motion, MIT) y motion-design-skills (github.com/iart-ai/motion-design-skills, MIT). No
  hay que instalarlos.
- Si el vídeo pide de verdad otra herramienta (una biblioteca, un programa), se puede conseguir. Antes, pregúntate si
  lo va a notar quien lo ve. Lo que cuesta dinero, con permiso del creador.
- **El esfuerzo, donde lo nota quien mira:** el primer segundo, que se entienda, el ritmo y el sonido.

## 7. Los pasos, con sus paradas

Tiene paradas para el creador, y todas son en el chat: lo que tiene que ver se le enseña ahí mismo (una imagen, el
vídeo) y contesta ahí. No se le monta una página ni un formulario aparte.

1. **La idea.** Entiende qué quiere, para quién y para qué canal (§2). **Parada: el creador elige la idea** (y el
   canal, si no lo dijo). Después, `node motor/nuevo.mjs <nombre> "<la idea>" --formato …`.
2. **Las fuentes y los datos.** Captura la fuente de verdad y apunta cada dato en `hechos.json` con su cita (§3).
3. **El plan y el guion.** Las cinco líneas de §2 y, con ellas, el guion. Aquí se decide también **lo que promete la
   portada** (su frase de una a tres palabras y el título): es lo que cumplen los primeros segundos, y queda apuntado.
   **Parada: el creador aprueba el guion.**
4. **El guion visual y cómo se ve.** Antes de dibujar nada, escribe `planos.md`: por cada escena, **qué actúa**, **qué
   hace**, **qué se entiende al verlo**, **qué se lee** (las palabras exactas) y **el encuadre**. Si en «qué actúa»
   solo sale «un texto» o «una lista», esa escena no está pensada. Luego, el primer fotograma, dibujado en el estilo
   que toca (§4). Enséñaselo con el plan en una línea por escena, no con el archivo. **Parada: el creador da el visto
   bueno** (o elige otro estilo). Si el vídeo es largo, o se le va a cambiar el estilo a uno ya hecho, esta parada es
   la **prueba de estilo** en movimiento (§4).
5. **La voz**, con `voz.mjs` (§5).
6. **El principio y un trozo**, animados y con su sonido. **Parada: el creador dice que siga así** o lo corrige.
7. **El vídeo entero en fotogramas, por escenas, antes de animarlo.** Apunta las escenas en `escenas.json` (un nombre
   corto y la palabra de la voz donde empieza cada una). Con todo el texto definitivo ya dibujado, en este orden:
   - `medir.mjs`: se arregla lo que mide mal. Si avisa de que un plano es casi todo texto (§8), míralo: si la voz
     explica cómo funciona algo y en pantalla solo hay letras, se piensa otra vez qué actúa; si es limpio a propósito,
     se queda.
   - `escenas.mjs`: una hoja por escena, que la cubre entera (un fotograma cada 2,5 s como mucho).
   - **El juez de arte, sobre esos fotogramas quietos** (`jueces.mjs --previo`, §8). Arreglar un defecto ahora cuesta
     segundos; después de animar cuesta una ronda entera.
   - **Parada: el creador ve las escenas en el chat**, una hoja por escena, y dice cuáles acepta y qué cambiaría. Lo
     que acepta se apunta con sus palabras (`escenas.mjs --aceptar`) y no se le vuelve a enseñar mientras esos
     fotogramas no cambien.
8. **El resto, animado**, con el mismo cuidado. Después `medir.mjs` y `escenas.mjs` otra vez (las escenas que hayan
   cambiado al animar se le enseñan al creador), el render entero y la revisión en movimiento (§8).
9. **El dibujo de la portada**, con las escenas ya aceptadas y antes de sellar: tres variantes con `portada.mjs` (§8,
   «Las portadas»). **Parada: el creador ve la hoja en el chat y elige una.** Sin jueces.
10. **Los jueces, una ronda sobre el vídeo entero.** `jueces.mjs --preparar` sella el candidato (no lo sella sin
    medidas limpias ni sin las escenas aceptadas) y lo revisan tres jueces independientes más el de audio (§8). Solo
    bloquean los **defectos** críticos o altos (algo roto que se mide); los **criterios** (cómo quedaría mejor) no
    bloquean: se le enseñan al creador y decide él. Si hay defectos, se arreglan **todos de una vez**, se mide, se
    sacan las escenas, se renderiza y pasan otra vez: en esa ronda verifican lo anterior y miran lo que cambió. **A la
    tercera ronda sin aprobar, se para:** se le enseña al creador el vídeo con lo que queda abierto y decide él.
    **Parada: el creador ve el veredicto, los criterios que quedan y el vídeo.**
11. **La entrega:** `render.mjs --final` lo deja en `salida/` (solo con el veredicto vigente, o con `--sin-jueces` si
    el creador lo decide, apuntado en `notas.md`), con su `.srt` si es de YouTube. En un reel, el vídeo de `salida/`
    lleva además la portada elegida en su último fotograma. Cada entrega guarda una copia exacta de lo que salió
    (`revision/entregas/<fecha>/`): si después se prueba otra versión y el creador prefiere la que tenía,
    `render.mjs <vídeo> --restaurar ultima` vuelve a ella.
12. **El texto para publicar:** el título y el texto de cada red, escritos desde el guion y comprobados con
    `publicar.mjs` (§8). **Parada: el creador elige el título y acepta el texto, en el chat.** Lo pega él: nada se
    publica.

**Lo que cuesta y dónde se ahorra.** Medir cuesta segundos; sacar las escenas, menos. El juez de arte sobre los
fotogramas quietos es un solo agente con un par de docenas de imágenes. Un render entero, minutos. Una ronda de
jueces es lo caro, y solo se paga cuando lo barato ya está limpio y el creador ya ha visto las escenas. Por eso el
orden es fotogramas → medir → juez de arte → el creador → animar → render → jueces. Junta los arreglos de una ronda en
una sola pasada, y no renderices ni midas entero para comprobar un detalle: `medir.mjs --escena`, `escenas.mjs
--solo`, `render.mjs --escena --mitad` y `--fotos` lo enseñan en segundos (§9). Solo va una herramienta del motor a
la vez: si otra conversación lo está usando, la tuya espera sola y lo dice; no la cortes ni lances otra.

## 8. La revisión

Se revisa mirando, y mirándolo moverse. Las medidas dicen dónde mirar; no dicen si el vídeo está bien.

- **Primero se mide.** `medir.mjs` recorre el vídeo (un fotograma cada medio segundo) y dice, con las reglas del
  formato (§4), qué texto es pequeño, qué texto o qué pieza cae bajo lo que tapa su red, qué está cortado, qué se
  pisa y qué va pegado al borde de su pieza. Y el color: qué texto contrasta poco, qué superficies son de familias
  distintas, qué pieza cambia de color de un plano a otro. Y **el dibujo**: qué parte del cuadro tiene algo dibujado y
  qué parte tiene algo que no es texto, y cuántas palabras hay a la vez. Lo del dibujo son **avisos, nunca
  «ARREGLAR»**: se miran, y decide quien mira (§4). Una pantalla capturada que tiene que ser solo texto se apunta en
  `video.json` → `"medir": { "soloTexto": [[32, 35]] }`; `"dibujo": false` quita esos avisos del todo. Lo que se mide
  con una regla no debe llegar a un juez: lo que marca «ARREGLAR» se arregla antes de seguir. Si algo se deja fuera a
  propósito va en `video.json` → `"medir": { "ignora": […] }`, con su porqué en `notas.md`.
- **Después se mira.** `render.mjs --fotos` saca fotogramas sueltos; `--escena <id> --mitad`, una escena en
  movimiento; `--mitad`, el vídeo entero rápido; `--zonas`, lo que tapa la red. Mira cada momento como quien se lo
  encuentra sin saber nada:
  - Sin sonido y sin leer, ¿se entiende qué pasa? ¿Qué es lo que actúa aquí?
  - ¿El primer segundo dice de qué va?
  - ¿Lo que nombra la voz está en pantalla justo entonces?
  - ¿Hay algún tramo en el que no cambia nada?
  - ¿Algo arranca o frena en seco, salta o parpadea?
  - ¿Cada pieza está centrada en su sitio y separada de las demás? ¿Alguna línea pasa por encima de un texto?
    (amplía al doble antes de contestar)
  - ¿Algo importante cae bajo lo que tapa la red, o lo corta el borde?
  - ¿El subtítulo se lee sobre lo que tiene detrás?
- Si algo se ve mal y no sabes por qué, mide lo que se está dibujando antes de rediseñarlo.

### Las escenas: el juez de arte y el creador, antes de animar

Lo que se puede ver en un fotograma quieto se ve antes de animar, cuando cambiarlo cuesta segundos. Tres pasos:

1. **Las escenas:** `node motor/escenas.mjs <vídeo>` saca, de cada frase de la voz, un fotograma a mitad de frase y
   otro cuando se acaba de decir, más los que hagan falta para que no pasen más de 2,5 s sin uno (una cifra o una
   placa que solo se ve un momento también tiene que salir en la hoja), y deja una hoja por escena en
   `revision/escenas/`. Compara cada fotograma con el que
   el creador aceptó y dice qué escenas están aceptadas, cuáles cambiaron y cuáles no ha visto todavía.
2. **El juez de arte, sobre los fotogramas quietos:** `node motor/jueces.mjs <vídeo> --previo` (pide medidas limpias y
   las escenas sacadas) sella esos fotogramas y escribe `revision/previo/brief-arte.md`. Lanza el agente `juez-arte`
   con la ruta de ese brief y nada más; escribe `revision/previo/dictamen-arte.json`. `--previo --veredicto` lo valida y
   enseña los hallazgos. Los criterios no bloquean: se le dicen al creador con las escenas. Si deja defectos altos,
   arréglalos todos de una vez, mide, saca las escenas y vuelve a `--previo`:
   la segunda pasada solo verifica. **Dos pasadas como mucho;** lo que quede abierto se le enseña al creador junto con
   las escenas, y decide él. No juzga el movimiento: eso es de la ronda final.
3. **El creador, en el chat:** enséñale la hoja de cada escena que no esté aceptada (y solo esas), con el nombre de la
   escena, y pregúntale cuáles acepta. Apunta lo que diga con sus palabras:
   `node motor/escenas.mjs <vídeo> --aceptar gancho,ramas --palabras "…"` (`--aceptar todas` si las acepta todas), y
   también en `notas.md`. La aceptación solo la da él: no la apuntes por tu cuenta ni la deduzcas de un «sigue».
   Si lo que hay que juzgar es cómo se mueve (un estilo nuevo, una transición), enséñale además el clip de la escena
   (`node motor/render.mjs <vídeo> --escena <id> --mitad`). Y lo que decida sobre este vídeo que un juez podría
   discutir («los robots, con cuerpo», «el nombre, pequeño en el pecho») se apunta con sus palabras y la fecha en
   `proyectos/<vídeo>/decisiones.md`: va en el brief de todos los jueces como cosa decidida.

Una escena aceptada sigue aceptada mientras sus fotogramas sean los mismos, aunque cambie el código. Cuando cambian
(un arreglo de los jueces, un retoque), `escenas.mjs` lo dice y se le enseña esa escena otra vez. `--preparar` no
sella un candidato con escenas sin aceptar (`--sin-aceptar` lo salta solo si él lo pide, apuntado en `notas.md`).

### Las portadas

Tres variantes, dibujadas con el mismo motor y las mismas piezas del vídeo, y elige el creador. No hay jueces.

**Cuándo.** Lo que promete la portada (su frase de una a tres palabras o la pregunta del gancho, y el título) se
decide al principio, con el plan y el guion, y queda apuntado ahí: tiene que ser lo que cumplen los primeros segundos.
El dibujo se hace al final, con las escenas aceptadas, reutilizando lo que ya está dibujado (el personaje o la pieza
central, los iconos, un bloque con el nombre del proyecto) más lo fijo de la marca del creador (`marca/LEEME.md`). Lo importante va en el centro del cuadro, que es lo que queda cuando la red recorta la
portada en la rejilla; y cada bloque lleva una sola familia de color.

**La composición de partida:** nada superpuesto a otra pieza (ni un icono sobre el titular); el
logo o el sujeto, de la misma altura que el bloque de texto que tiene al lado; el mismo aire entre todas las piezas;
el conjunto centrado en vertical, con el mismo margen arriba que abajo; un solo borde izquierdo para todo lo que va en
columna; y sin más marca que la que él fijó para sus portadas. Mídelo sobre la imagen antes de enseñarla:
`portada.mjs` todavía no lo comprueba.

1. **Dibújalas.** El `video.tsx` exporta `Portada`, que recibe `variante` (1, 2 o 3) y devuelve una imagen quieta del
   tamaño del vídeo: `export const Portada = ({ variante }) => …`. Dentro valen `useNarracion()`, `usePerfil()` e
   `<Instante s={12.5}>…</Instante>`, que dibuja lo de dentro como está en ese segundo (una pieza del vídeo, o el
   vídeo entero de fondo). Las tres, de verdad distintas: otra palabra, otro sujeto, otra composición. La marca va
   con `data-medir="marca"`; lo que va de fondo y no hay que leer, con `data-medir="fuera"`. Lleva lo que el creador fijó para sus portadas en `preferencias.md` y representa de qué va el vídeo. Si el vídeo ya está
   sellado o entregado, la portada va en un `portada.tsx` aparte en su carpeta: tocar `video.tsx` cambia la firma.
2. **Sácalas:** `node motor/portada.mjs <vídeo>`. Las deja en `revision/portadas/`, las reduce a 168 px de ancho (lo
   que mide una miniatura en el móvil) y comprueba ahí que se leen: el texto más grande (11 px o más ya reducido, es
   decir 126 px en un 16:9 y 71 en un reel), el contraste con su fondo, lo que tapa la red (en YouTube, la duración
   en la esquina de abajo a la derecha; en un reel, el recorte de la cuadrícula), que nada se corte y que no sean la
   misma imagen. Lo que marca «ARREGLAR» se arregla antes de enseñarlas; los avisos se miran (un texto que él pidió
   y que en pequeño no se lee es un aviso: se le dice y decide él).
3. **Parada: el creador elige, en el chat.** Enséñale `revision/portadas/hoja.jpg` (las tres en grande y en pequeño)
   y pregúntale cuál. Apunta la que diga con sus palabras:
   `node motor/portada.mjs <vídeo> --elegir b --palabras "…"`, que la deja en `salida/<vídeo>-portada.jpg`, y también
   en `notas.md`. YouTube deja probar hasta tres: si quiere subir las tres, están en `revision/portadas/`.

**Dónde va.** Nunca al principio del vídeo: quien lo ve en el feed no ve la portada (el vídeo arranca solo), y el
primer segundo es del gancho. En YouTube y en LinkedIn se sube como imagen. En un reel va además dentro, en el último
fotograma del vídeo entregado (uno solo: al verlo no se percibe), porque en Shorts y en algunas cuentas de TikTok la
portada solo se puede elegir entre los fotogramas del vídeo. `--elegir` se la pone si el vídeo ya está en `salida/`;
si no, se la pone `render.mjs --final` (y `portada.mjs <vídeo> --dentro` la vuelve a poner). El vídeo que se mide, se
acepta y se juzga no la lleva. Como el reel se repite, ese fotograma pasa un instante entre el cierre y el gancho: si
al creador le molesta, `video.json → "portadaAlFinal": 0` la quita; un número la alarga (en fotogramas).

### Los jueces

Tú hiciste el vídeo: no eres quien debe aprobarlo. Antes de entregar, lo juzgan tres revisores que no lo han hecho y
no saben nada del proyecto, cada uno con su brief y solo con la evidencia del candidato sellado, más un juez de audio
que lo escucha (tú no oyes).

1. **Sella el candidato:** con el render entero en `revision/`, `node motor/jueces.mjs <vídeo> --preparar`. Pide las
   medidas limpias y las escenas aceptadas por el creador, comprueba los hechos, calcula la **firma** del vídeo (un resumen de todo lo que decide cómo se ve y suena: si cambia algo, la
   firma cambia y los dictámenes dejan de valer), y saca a `revision/jueces/` los fotogramas con subtítulo (el gancho,
   cada frase, cada cambio de golpe), los fotogramas **sin subtítulo** de cada frase (para la lectura a ciegas), las
   ráfagas de cada cambio, las hojas de contacto, el audio y un brief por juez.
2. **Tres jueces, de uno en uno, con contexto limpio.** Lanza un subagente por juez (es la excepción a «sin subagentes»). Son los agentes del plugin `juez-editorial`, `juez-arte` y `juez-movimiento`
   (`plugin/agents/`), que ya van fijados al modelo Opus: solo leen, se llevan la mayor parte del gasto de cada ronda y así
   cuesta la mitad. Si el plugin no está cargado, un subagente general con `model: "opus"`. Si el creador pide otro modelo para una ronda, ese, y queda apuntado en `notas.md`. Los tres pueden ir a la vez. Cada uno recibe solo la ruta de su
   brief (`revision/jueces/brief-<rol>.md`): no le cuentes el tema, el guion ni lo que te costó. El brief le dice qué mirar, dónde está la evidencia y cómo escribir su
   dictamen (`revision/jueces/dictamen-<rol>.json`), con `aprobar` o `iterar` y hallazgos que citan segundo y
   fotograma. Juzgan como profesionales, con medidas, no con impresiones: cada hallazgo lleva una medida o una
   comparación y dice qué pierde quien mira. El editorial hace primero una **lectura a ciegas** (qué ve en cada frase
   sin leer el guion) y luego la contrasta con la voz y con `hechos.json`: cualquier frase cuya imagen no coincide es
   iterar. El de arte mira dos veces: a tamaño móvil, y plano a plano con cada pieza ampliada al doble, como un director
   de arte; si otro juez de arte ya revisó los fotogramas quietos, su brief le pide verificar aquello y mirar lo que
   cambió al animar. El de movimiento revisa cada transición en sus tres momentos (entra, pasa y asienta) y los tramos muertos,
   como un animador. Lo que miran:
   - **Que la imagen explique** (lo primero): en cada plano, un objeto que actúa y cuenta la idea; el de arte apunta
     cuál es (`actua`) y cuánto llena el cuadro (`ocupa`, que es un dato y no una nota). Un plano que es solo texto
     mientras la voz explica cómo funciona algo es un defecto alto, y también más de 18 palabras a la vez si no es
     una pantalla capturada. No tiene que ser 3D: que un plano sea 2D no es hallazgo, y un 3D que recarga es un
     criterio. El de movimiento mira que lo que cambia en cada frase sea lo que la frase cuenta: un tramo en el que
     solo aparece texto es alto aunque «se mueva». Si hay `planos.md`, lo leen después de mirar: cumplir el propio
     plan no aprueba un plano flojo.
   - **El acabado del 3D** (solo si el plano va en 3D): materiales que reflejan (cerámica, cristal, metal), suelo que refleja, sombra de contacto,
     cantos redondeados y resplandor solo en lo que emite luz. Un 3D de plástico mate, de color plano, con facetas a
     la vista, con piezas flotando sin sombra o quemado de luz es alto.
   - **Composición:** márgenes iguales; todo centrado dentro de su contenedor; las piezas sueltas ni se tocan ni se
     rozan, y si sobra sitio se reparte; rejilla; los planos equivalentes, con las mismas medidas.
   - **Diagramas:** ninguna línea pisa un nodo ni una etiqueta; las conexiones, rectas u ordenadas, entran y salen por
     el mismo lado; los nodos equivalentes, del mismo tamaño.
   - **Iconos:** los reales de cada marca y cada concepto, nunca un círculo o un cuadrado de relleno; centrados en su
     círculo.
   - **Letra:** los umbrales del formato (§4); en un reel, a 1080×1920: rótulos ≥ 44, lo que se lee en una pantalla
     ≥ 32, un enlace ≥ 36, etiquetas secundarias ≥ 26, nada con letras bajo 22; nada cortado ni desbordando.
   - **Pantallas recreadas:** texto real o nada; barras grises de relleno y cajas vacías parecen una maqueta.
   - **Artefactos:** aros, brillos o sombras que no tocan, halos cortados, círculos ovalados, bordes que asoman.
   - **Movimiento:** arranque y frenado naturales (nada lineal ni teletransportado), nada quieto más de dos segundos,
     el movimiento secundario con sentido, las transiciones entran, pasan y asientan, nada que se solape, parpadee o se
     corte, y cada cambio en su palabra.
   - **Las zonas que tapa la red del vídeo** (§4), con margen. El brief de cada juez ya lleva el formato, sus zonas
     y sus medidas: no hay que decírselo.

   **El baremo:** un defecto de acabado visible de esa lista es **alto**, aunque sea pequeño; medio es lo que afea sin
   ser medible; bajo, lo que solo se ve ampliando. Y cada hallazgo lleva su **tipo**: **defecto** (algo roto que se
   mide: cortado, pisado, descentrado en su contenedor, ilegible, un salto, un tramo quieto, un dato falso, un plano
   que es solo texto) o **criterio** (cómo quedaría mejor: la composición, cuánto llena, el reparto del aire, el
   estilo, 2D o 3D). **Solo bloquean los defectos críticos o altos**; un juez que pide iterar solo por criterios no
   para la entrega. Los criterios se le enseñan al creador, una línea cada uno, y decide él.

   **Lo que el creador ya decidió no es hallazgo.** Lo de todos sus vídeos está en `preferencias.md` (su marca en las
   zonas tapadas, el estilo). Lo de este vídeo, en `proyectos/<vídeo>/decisiones.md`: cada vez que decide algo que un
   juez podría discutir, apúntalo ahí con sus palabras y la fecha, una línea por decisión. `--preparar` y `--previo`
   lo ponen en el brief de todos los jueces, junto con lo que dijo al aceptar las escenas. Sin esto, los jueces discuten ronda tras ronda cosas que él pidió. El gusto tampoco es hallazgo.
3. **El juez de audio:** `node motor/jueces.mjs <vídeo> --audio --enviar` manda el mp3 del vídeo a un modelo que lo
   escucha y devuelve la transcripción, si la voz se entiende, qué sonidos oye y dónde; el motor la compara con el guion
   palabra a palabra. Cuesta céntimos y va con permiso del creador (`preferencias.md`). Si no lo autoriza, lo escucha
   él y pasas `--veredicto --sin-audio`.
4. **El veredicto:** `node motor/jueces.mjs <vídeo> --veredicto` valida los dictámenes (firma vigente, tres roles con
   identidades distintas, evidencias del catálogo, lectura a ciegas de todas las frases, el pase de detalle de todos los
   planos, transiciones de todos los cambios, ningún defecto crítico ni alto abierto, audio apto), dice qué hallazgos
   no bloquean (para enseñárselos al creador) y escribe
   `revision/jueces/veredicto.json`. Un JSON válido no sustituye el juicio: el motor comprueba cobertura y evidencia,
   no criterio.
5. **Si hay defectos que bloquean**, arregla la causa (no el síntoma) de **todos** los de los tres jueces en una
   sola pasada, mide, saca las escenas (las que cambien, al creador), renderiza entero, `--preparar` otra vez y los tres jueces de nuevo, con subagentes nuevos. No se
   reutiliza una aprobación de otra versión, pero la ronda siguiente es más corta: `--preparar` guarda el dictamen
   anterior de cada papel y qué fotogramas cambiaron, y el brief les pide verificar lo anterior y mirar lo que cambió,
   sin abrir objeciones nuevas sobre imágenes que no han cambiado: un hallazgo nuevo sobre una imagen que no cambió
   solo bloquea si es crítico; lo demás llega tarde y va a la lista del creador. Apunta en `notas.md` qué dijeron y
   qué cambiaste.
   Si un hallazgo no cambia significado ni lectura y decides conservarlo, apunta por qué.
   **Tres rondas como mucho.** Si a la tercera siguen sin aprobar, no hay cuarta sin el creador: los jueces varían de
   una ronda a otra y un vídeo puede no converger nunca. Enséñale el vídeo y lo que queda abierto, ordenado por lo
   que notaría quien lo ve, y que decida él.
6. **Segunda opinión por API** (`--visual --enviar`): el mismo brief, con las imágenes, a un modelo por OpenRouter;
   sus dictámenes (`dictamen-<rol>.api.json`) cuentan además de los tuyos. Útil cuando el creador quiere más ojos.

Al creador se le enseña el veredicto y el vídeo, no los archivos: primero los defectos que queden (si quedan) y
después los criterios, una línea cada uno, ordenados por lo que notaría quien lo ve. Decide él.

### El texto para publicar

El vídeo se entrega con lo que hay que escribir al colgarlo: el título y el texto de cada red. Lo escribes tú, con el
guion y `hechos.json` delante, en `proyectos/<vídeo>/publicar.md` (`node motor/publicar.mjs <vídeo>` deja la
plantilla con las secciones de su formato). No afirma nada que el vídeo no afirme: ni una cifra ni un resultado nuevos.
Se escribe para personas: sin palabras clave amontonadas, sin promesas que el vídeo no cumple, y en el idioma y el
trato de `preferencias.md`.

- **El título (YouTube, y el Short de un reel).** Tres de verdad distintos (otro ángulo, no otra coma), el que
  recomiendas primero. Lo que alguien buscaría va al principio; lo que pasa de unos 60 caracteres se corta en el móvil
  (YouTube admite 100). Promete lo mismo que la portada y que los primeros segundos, pero no repite la frase de la
  portada: la completa (la portada dice el qué; el título, de qué o para quién). Sin mayúsculas sostenidas ni «!!».
- **La descripción de YouTube.** Las dos primeras líneas son lo único que se ve sin abrirla, y lo que sale en la
  búsqueda: qué va a entender quien lo vea, con las palabras con las que lo buscaría. Después, en pocas líneas, qué
  recorre el vídeo; los enlaces con `https://` (el repositorio, primero); si el creador las pide, las **referencias**
  (una lista corta «Referencias:» con los enlaces que cita la propia fuente capturada, no los que tú recuerdes); los
  **capítulos** (`--tiempos` dice dónde
  empieza cada escena: el primero en `00:00`, tres o más, de 10 s o más cada uno, titulados para quien busca dentro
  del vídeo y no con tus nombres de trabajo); y al final, de tres a cinco hashtags (los tres primeros salen junto al
  título).
- **El texto de LinkedIn.** Lo primero, unos 140 caracteres, es lo único que se ve antes de «…ver más»: el problema o
  el resultado, nunca un saludo ni «me complace anunciar». En primera persona, como se lo contaría a un colega: qué
  problema había, qué hizo y cómo trabaja, en párrafos de una a tres líneas (una lista numerada si son pasos). El
  enlace va en el primer comentario (un enlace en el texto suele recortar el alcance; las fuentes no coinciden en
  cuánto), y el texto lo dice. Acaba con una pregunta que se pueda contestar de verdad, no con «¿qué opinas?». De tres
  a cinco hashtags, al final. El vídeo se sube como vídeo, no como enlace a YouTube.
- **El pie de un reel (Instagram, TikTok y la descripción del Short).** La primera línea, unos 125 caracteres, es la
  que se ve, y no repite la frase del gancho. Un enlace ahí no se puede pulsar: se dice dónde está. Después, el cierre
  del vídeo y de tres a cinco hashtags. Si el reel se cuelga también en LinkedIn, lleva su sección «LinkedIn».

**Compruébalo:** `node motor/publicar.mjs <vídeo>` mide lo que cada red corta, los capítulos, los hashtags, los
enlaces, las cifras que no están en el guion ni en `hechos.json` y los enlaces que no aparecen en nada capturado
(`fuentes/`, `hechos.json`). Lo que marca «ARREGLAR» se arregla; los avisos se
miran. Las cifras de corte son aproximadas (las redes no las publican, y cambian): están en la cabecera de
`publicar.mjs`, y si una cambia, se cambia ahí.

**Parada: el creador lo ve en el chat.** Enséñale los títulos (cuál recomiendas y por qué, en una línea) y el texto
entero de cada red, tal como se va a pegar. Elige y corrige él. Cuando lo acepte:
`node motor/publicar.mjs <vídeo> --aceptar --titulo 2 --palabras "…"`, que lo deja en `salida/<vídeo>-publicar.md`
listo para copiar, y apúntalo en `notas.md`. Lo pega él: nada se publica ni se envía en su nombre.

## 9. Las correcciones del creador

- Una corrección es una pista de algo más general. Antes de tocar, entiende qué le molesta de verdad y mira si pasa lo
  mismo en otras escenas.
- Lo que ya aceptó no se toca de paso: compara con la versión que vio antes de dar un cambio por bueno.
- Un cambio cada vez, y se comprueba antes del siguiente.
- **El retoque, en segundos.** Suele corregir una escena cada vez, con una captura anotada. Por cada retoque:
  `medir.mjs <vídeo> --escena <id>` y `escenas.mjs <vídeo> --solo <id>` (y `render.mjs <vídeo> --escena <id> --mitad`
  si lo que cambia es el movimiento), y se le enseña esa hoja. La medida entera y todas las hojas se sacan una sola
  vez, cuando ya no corrige más y antes de sellar: las escenas que no cambiaron siguen aceptadas solas.
- **Mira la escena entera, no solo el instante que señaló.** Un arreglo puede esconder otra cosa en otro momento de
  la misma escena (una cifra que deja de verse, una placa que se pliega): repasa la hoja completa antes de enseñarla.
- **Lo que decide sobre este vídeo** y un juez podría discutir va a `decisiones.md` del vídeo, con sus palabras y la
  fecha. Lo que quiere para todos sus vídeos va a `preferencias.md`, con sus palabras.
- **Si pide otro estilo, o rehacerlo de otra manera:** primero la prueba de estilo en movimiento (§4), y la versión
  que tiene se queda guardada. Si el vídeo ya se entregó, su copia está en `revision/entregas/`; si no, guarda una
  antes de empezar (en `revision/versiones/`). Volver a lo entregado: `render.mjs <vídeo> --restaurar ultima`.
- **No toques `motor/` a mitad de un vídeo.** Cambiar el motor cambia la firma de los vídeos que usan esa parte y deja
  sin valor sus medidas, sus aceptaciones y su veredicto. Si hace falta de verdad, dilo antes.

## 10. Las órdenes del motor

Todos se lanzan desde la carpeta del taller. `<vídeo>` es el nombre de su carpeta en `proyectos/`.

| Qué se quiere | Orden |
|---|---|
| Saber si el ordenador está listo | `node motor/doctor.mjs` |
| Guardar la clave de OpenRouter (se pega en una página, no en el chat) | `node motor/clave.mjs` (`--estado` dice si hay una) |
| Abrir un vídeo nuevo | `node motor/nuevo.mjs <nombre> "<la idea>"` (`--formato youtube` o `linkedin`; sin decirlo, reel) |
| Capturar una fuente (repositorio, página, archivo, salida de un comando) | `node motor/capturar.mjs <vídeo> <url o ruta> [nombre]` / `--comando "<orden>" <nombre>` |
| Comprobar que cada dato del guion tiene su fuente | `node motor/jueces.mjs <vídeo> --hechos` |
| Las medidas del formato de un vídeo | `node motor/medir.mjs <vídeo> --ficha` |
| La voz y el segundo de cada palabra | `node motor/voz.mjs <vídeo>` (`--toma archivo` con una grabación; `--tiempos` solo vuelve a medir) |
| Los sonidos | `node motor/sonidos.mjs recetas` / `crear <vídeo> <receta> [nombre]` / `buscar "…"` / `bajar <vídeo> <id> <nombre>` / `mezclar <vídeo>` |
| Fotogramas sueltos | `node motor/render.mjs <vídeo> --fotos 0,1.5,4` (`--zonas` marca lo que tapa la red) |
| Una escena, un tramo o todo, para revisar | `node motor/render.mjs <vídeo> [--escena <id>] [--desde s --hasta s] [--mitad]` (`--srt` escribe solo los subtítulos) |
| Medir lo dibujado (letra, zonas, cortes, pisados, márgenes, color y cuánto es dibujo) | `node motor/medir.mjs <vídeo>` (`--escena <id>` solo esa escena; `--en 3,4.5` solo esos segundos; `--todo` con detalle; `--prueba` sin guardar) |
| Las escenas, una hoja por escena, y lo que el creador acepta | `node motor/escenas.mjs <vídeo>` (`--solo <id>`; `--aceptar <ids> --palabras "…"`; `--estado`) |
| El juez de arte antes de animar | `node motor/jueces.mjs <vídeo> --previo` y, con su dictamen, `--previo --veredicto` |
| Las tres portadas, su hoja y la que elige el creador | `node motor/portada.mjs <vídeo>` (`--solo b`; `--elegir b --palabras "…"`; `--dentro`) |
| Sellar el candidato y preparar a los jueces | `node motor/jueces.mjs <vídeo> --preparar` |
| El juez de audio / la segunda opinión por API | `node motor/jueces.mjs <vídeo> --audio --enviar` / `--visual --enviar` |
| El veredicto de los jueces | `node motor/jueces.mjs <vídeo> --veredicto` (`--estado` dice cómo va) |
| La entrega (pide el veredicto vigente y guarda una copia de lo entregado) | `node motor/render.mjs <vídeo> --final` |
| Las entregas guardadas, y volver a una | `node motor/render.mjs <vídeo> --entregas` / `--restaurar ultima` |
| El título y el texto para publicar | `node motor/publicar.mjs <vídeo>` (`--tiempos`; `--aceptar --titulo 2 --palabras "…"`) |

Cómo está hecho el motor y qué puede usar un `video.tsx`: `motor/LEEME.md`.
