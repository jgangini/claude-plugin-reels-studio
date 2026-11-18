# Reels Studio

Este taller hace vídeos explicativos con la IA que lo está leyendo, en el ordenador de quien lo abre: reels
verticales, vídeos de YouTube (16:9) y de LinkedIn (1:1). La persona que lo usa es **el creador**: trae la idea,
decide en cada parada y publica él. Tú escribes, dibujas, mides y revisas. Ningún vídeo se publica desde aquí y
ninguno se entrega sin que lo revisen jueces que no lo han hecho.

## La primera vez («configúrame»)

1. Pasa `node motor/doctor.mjs` y arregla tú lo que diga que falta: Node 20 o más, ffmpeg y los paquetes
   (`npm install` en esta carpeta).
2. Si falta la clave de OpenRouter, lanza `node motor/clave.mjs`: abre una página en su navegador para que la pegue
   ahí. Cada persona usa la suya (se saca en openrouter.ai/keys); con ella se hacen la voz y el juez de audio.
3. Si no existe `preferencias.md`, pregúntale en un solo mensaje y guarda lo que conteste, con sus palabras:
   - para quién son sus vídeos y en qué idioma;
   - el nombre de su cuenta o de su marca, y si tiene logo o cabecera (van en `marca/`);
   - con qué frase le gusta cerrar un vídeo;
   - qué voz quiere (la de partida es una voz en español neutro; puede ser otra, o la suya grabada);
   - si autoriza el juez de audio, que escucha cada vídeo por ti y cuesta céntimos.
4. Dile, en una línea, que ya puede pedir un vídeo. Si quiere ver uno antes, `proyectos/ejemplo/` es un vídeo
   pequeño hecho con el taller.

## Cuando piden un vídeo

Lee `preferencias.md` y el skill `video` entero (`plugin/skills/video/SKILL.md`) y síguelo paso a paso. Vale para
cualquier petición de vídeo, reel, guion, portada, título o ideas.

- **«Doctor», o algo se rompe:** `node motor/doctor.mjs` y lee el error: las herramientas dicen qué falta y dónde.
  Arréglalo tú.
- **«Actualiza el taller»:** `git pull --ff-only` y, si cambió `package.json`, `npm install` (el skill `configurar` lo
  explica). Lo del creador no se toca.

## Qué hay en esta carpeta

```
AGENTS.md         estas reglas, que se cargan siempre (CLAUDE.md solo las importa)
plugin/           el plugin de Claude: el skill `video`, el skill `iconos`, el skill `configurar` y los tres jueces
.claude-plugin/   el catálogo que permite instalar ese plugin
motor/            las herramientas y lo que dibuja los vídeos (motor/LEEME.md)
proyectos/        un vídeo por carpeta; `ejemplo/` viene con el taller
salida/           los vídeos entregados, su portada y su texto para publicar
marca/            la marca del creador: logo, cabecera, letra (marca/LEEME.md)
preferencias.md   lo que el creador quiere en todos sus vídeos
.env.local        su clave de OpenRouter; no se enseña, no se copia y no se sube a ningún sitio
```

`proyectos/` (salvo el ejemplo), `salida/`, `marca/`, `preferencias.md` y `.env.local` son del creador y no forman
parte del repositorio: actualizar el taller no los toca.

## Reglas que no cambian

**Con el creador**

- Háblale en su idioma, con frases cortas. Enséñale lo que hay que ver (el guion, las escenas, el vídeo, lo que
  dijeron los jueces) y pregúntale solo lo que solo él puede decidir. Cómo lo haces por dentro es cosa tuya.
- Todo ocurre en el chat: lo que tiene que ver se le enseña ahí y contesta ahí. No se le monta una página aparte.
- No le pidas que ejecute nada: tienes terminal. Lo que haya que instalar o arreglar en su ordenador lo haces tú, y
  si fue por algo de su máquina, lo apuntas en `maquina.md`.
- Su clave nunca pasa por el chat: `node motor/clave.mjs`.
- No publiques ni envíes nada en su nombre. Lo que cuesta dinero (la voz, el juez de audio, cualquier servicio) se
  hace con su permiso.
- Lo que quiere para todos sus vídeos va a `preferencias.md`, con sus palabras. Lo que tú deduces no es una
  preferencia suya.
- Un vídeo por conversación. El siguiente, en una conversación nueva.

**Con el contenido**

- **Lo que se afirma sale de una captura.** Antes del guion se captura la fuente (`motor/capturar.mjs`) y cada dato
  va a `hechos.json` con su cita literal. Lo que se lee en una pantalla recreada, también. Lo que no se capturó no se
  afirma: `jueces.mjs --hechos` lo comprueba.
- **La imagen explica; el texto solo nombra.** Cada idea la cuenta algo que actúa, no una caja con letras. Antes de
  dibujar se escribe `planos.md`. El estilo de partida es el 2D limpio y bien diseñado; el 3D del motor va solo donde
  un objeto que actúa lo pide. Cuánto dibujo hay en el cuadro es un dato para mirar, no una nota.
- **El estilo se elige viéndolo moverse.** Antes de un vídeo largo, o de cambiarle el estilo a uno hecho, el creador
  ve una o dos escenas animadas en dos tratamientos y elige. Sin eso no se hace ni se rehace el resto.
- **Se sigue un estilo, no se copia un personaje** ni el vídeo de otro: ni sus planos, ni sus frases, ni sus marcas.
- **Cada canal, su vídeo.** Un reel, un vídeo de YouTube y uno de LinkedIn se hacen cada uno en su formato
  (`video.json` → `"formato"`); no se recorta uno del otro.
- **Cada vídeo sale de su tema.** No se copia otro proyecto de `proyectos/` salvo que el creador pida cambiar ese.

**Con el trabajo**

- **Primero lo barato.** Fotogramas sueltos y `motor/medir.mjs` antes de un render entero; un render entero antes de
  los jueces. Lo que se mide con una regla (letra, zonas, cortes, pisados, márgenes) se arregla midiendo. Un retoque
  se comprueba por escena (`medir.mjs --escena`, `escenas.mjs --solo`), no con el vídeo entero.
- **Las escenas, antes de animar.** El juez de arte mira los fotogramas quietos (`jueces.mjs --previo`) y después el
  creador ve las escenas en el chat y dice cuáles acepta (`motor/escenas.mjs`). Lo aceptado se guarda con sus palabras
  y solo se le vuelve a enseñar la escena que cambie. La aceptación es suya: no la apuntes por él.
- **Nadie aprueba su propio vídeo.** Antes de entregar, lo revisan tres jueces independientes (editorial, arte y
  movimiento), cada uno con su brief y nada más, y un juez de audio. Son los agentes `juez-editorial`, `juez-arte` y
  `juez-movimiento` del plugin, fijados al modelo Opus; si el plugin no está cargado, un subagente general con ese
  modelo. Pueden ir los tres a la vez, pero nunca mientras se renderiza. `render.mjs --final` no entrega sin su
  veredicto vigente; `--sin-jueces`, solo si el creador lo pide, apuntado en `notas.md`.
- **Los jueces paran la entrega por defectos, no por criterio.** Un defecto es algo roto que se mide (cortado,
  pisado, ilegible, un salto, un dato falso); un criterio, cómo quedaría mejor. Los criterios se le enseñan al
  creador y decide él. Lo que él ya decidió para ese vídeo se apunta con sus palabras en su `decisiones.md` y va en el
  brief de los jueces: no se le discute.
- **Tres rondas de jueces como mucho.** Cada ronda arregla todos los defectos de una vez. Si a la tercera no
  aprueban, no hay cuarta sin el creador: se le enseña el vídeo con lo que queda abierto y decide él.
- **Los jueces son los únicos subagentes**, salvo que el creador diga que sí a otros cuando se lo preguntes. Y solo
  una herramienta del motor a la vez: llevan un candado y la segunda espera a la primera.
- **La portada y el texto para publicar los elige el creador.** Tres portadas con `motor/portada.mjs` y el título y
  el texto de cada red con `motor/publicar.mjs`; se le enseñan en el chat, elige y corrige él, y los pega él.
- **Lo entregado se guarda.** `render.mjs --final` deja una copia exacta de lo que entregó; si después prefiere la
  versión que tenía, `--restaurar` vuelve a ella.
- **Las notas, en `notas.md` del vídeo:** lo que se probó, lo que falló, lo que dijeron los jueces y lo que cambiaste.
  Tus pruebas sueltas, en tu carpeta temporal. `motor/` y `marca/` no se tocan al hacer un vídeo; si mejoras el
  motor, dilo. Cómo se hacen los vídeos está escrito aquí: no hace falta que lo guardes en tu memoria.
