---
name: iconos
description: Consigue y prepara los iconos de un vídeo, una portada o un diagrama (marcas, servicios, tecnologías, acciones, objetos) a partir de colecciones con licencia abierta, y los deja listos para dibujarlos. Úsalo cuando haga falta un icono o el logo de un servicio, cuando el creador diga que un icono se ve pobre o genérico, o antes de dibujar a mano una figura que ya existe bien hecha.
---

# Iconos

Un icono de verdad se reconoce a tamaño de móvil; un círculo o un cuadrado de relleno puesto en su lugar parece una
maqueta, y los jueces lo devuelven. Antes de dibujar a mano una figura, mira si ya existe bien hecha.

## De dónde salen

1. **El catálogo del creador**, si tiene uno: su ruta está en `preferencias.md`. Es lo primero que se mira.
2. **Colecciones abiertas**, que se instalan con npm en la carpeta del taller y traen un SVG por icono:
   - `lucide-static` (licencia ISC): acciones, objetos y conceptos, todos con el mismo trazo.
   - `simple-icons` (CC0): los logotipos de marcas y tecnologías, en una sola tinta.
3. **Dibujado a mano**, solo si no existe: con trazos del mismo grosor y la misma rejilla que sus hermanos.

Los logotipos son marcas de sus dueños aunque el archivo sea libre: se usan para nombrar ese producto, sin
deformarlos ni recolorearlos más allá de lo que su dueño permite, y nunca para dar a entender que avala el vídeo.

## Cómo se preparan

- Copia el SVG a `proyectos/<vídeo>/medios/iconos/` y apunta en `CREDITOS.md` del vídeo de qué colección salió y su
  licencia.
- En un `video.tsx` se dibuja con sus trazos (`<path d="…" />` dentro de un `<svg viewBox="0 0 24 24">`), no como
  imagen: así se puede colorear, animar y escalar sin perder nitidez. Las piezas 3D del motor que llevan icono
  (`Moneda`) reciben esos mismos trazos: `icono={{ relleno: [d…] }}` o `{ trazo: [d…] }`.
- Todos los iconos de un mismo plano comparten estilo (de trazo o rellenos, mismo grosor), miden lo mismo y van
  centrados en su círculo o su caja. Si se mezclan dos colecciones, se igualan el grosor y el tamaño.
- Para una figura más elaborada (un personaje, un oficio, un objeto), parte de un icono que se le parezca y añádele
  lo que falta con el mismo trazo, en vez de empezar de cero.
