# La marca del creador

Aquí va lo que identifica los vídeos de quien usa el taller: su logo, su cabecera, su letra, su etiqueta de autor.
Esta carpeta es suya: no forma parte del repositorio (solo este archivo) y actualizar el taller no la toca.

- Guarda cada archivo con un nombre claro (`logo.svg`, `cabecera.svg`, `retrato.png`, la letra en `.woff2`).
- Apunta aquí, en una línea por archivo, **de dónde salió y con qué permiso se usa**: si es suyo, si es de su empresa
  o si tiene una licencia (y cuál). Un logo o una letra de otros solo entra si él tiene permiso para usarlos.
- Cómo y dónde quiere que aparezca su marca en los vídeos (arriba, abajo, en el cierre) va en `preferencias.md`, con
  sus palabras.

Para usarla en un vídeo, copia lo que haga falta a `proyectos/<vídeo>/medios/marca/` y dibújalo desde su `video.tsx`,
marcado con `data-medir="marca"` para que las medidas no lo cuenten.
