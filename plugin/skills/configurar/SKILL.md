---
name: configurar
description: Instala o actualiza el taller Reels Studio en la carpeta actual y lo deja listo para hacer vídeos. Úsalo cuando digan «configúrame», «instala el taller», «set me up» o «actualiza el taller», y antes de hacer un vídeo en una carpeta donde todavía no está el taller (no existe motor/).
---

# Dejar el taller listo

El plugin solo trae las instrucciones y los jueces. El motor que dibuja los vídeos, y los vídeos de cada persona,
viven en una carpeta de su ordenador: **el taller**. Este skill lo pone ahí.

## 1. ¿Ya está el taller en esta carpeta?

Si en la carpeta actual existen `AGENTS.md` y `motor/doctor.mjs`, ya está: pasa al punto 3.

## 2. Instalarlo

- El taller va en una carpeta propia. Si la carpeta actual tiene otras cosas (un proyecto de código, documentos),
  no lo mezcles: dile al creador, en una línea, que hace falta una carpeta vacía y pregúntale dónde la quiere.
- En una carpeta vacía:
  `git clone --depth 1 https://github.com/jgangini/claude-plugin-reels-studio.git .`
  Si no hay git, instálalo (o baja el zip del repositorio y descomprímelo ahí).
- Después, `npm install` en esa carpeta. Tarda unos minutos y solo pasa una vez. La primera vez que se dibuje algo se
  descargará además un navegador (unos 110 MB).

Lo instalas tú, con tu terminal: no le pidas al creador que ejecute nada.

## 3. Ponerlo a punto

Lee ahora `AGENTS.md` de esa carpeta (son las reglas del taller; desde la próxima conversación se cargan solas) y
sigue su apartado «La primera vez»: el doctor, su clave de OpenRouter (se pega en una página, nunca en el chat) y sus
preferencias.

## Actualizar el taller

`git pull --ff-only` y, si cambió `package.json`, `npm install`. Sus vídeos (`proyectos/`), sus entregas (`salida/`),
su marca, sus preferencias y su clave no forman parte del repositorio: no se tocan. Si `git pull` no puede avanzar
porque él cambió algo del motor, enséñale qué archivos son y que decida; no descartes sus cambios.
