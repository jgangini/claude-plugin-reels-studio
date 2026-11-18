// Abre la carpeta de un vídeo nuevo en proyectos/, con lo justo para empezar a trabajar.
//
//   node motor/nuevo.mjs <nombre> "<la idea, con las palabras del creador>" [--formato reel|youtube|linkedin]
//
// El nombre va en minúsculas, con guiones. El formato es el canal del vídeo (sin decirlo, un reel vertical) y de él
// salen el tamaño, lo que tapa la red, las medidas mínimas y si el subtítulo va dibujado (motor/lib/perfiles.mjs).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { argumentos } from "./lib/argumentos.mjs";
import { perfilDe } from "./lib/perfiles.mjs";
import { TALLER, VOZ_DE_PARTIDA } from "./lib/taller.mjs";

const { args, opt } = argumentos();
const formato = opt("--formato") ?? "reel";
const perfil = perfilDe({ formato }); // si ese formato no existe, aquí se dice cuáles hay
const sueltos = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--formato");
const [nombre, ...idea] = sueltos;
if (!nombre || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nombre)) throw new Error('Falta el nombre del vídeo, en minúsculas y con guiones: node motor/nuevo.mjs por-que-el-cielo-es-azul "¿Por qué el cielo es azul?"');
const carpeta = join(TALLER, "proyectos", nombre);
if (existsSync(carpeta)) throw new Error(`Ya hay un vídeo con ese nombre: ${carpeta}`);
const titulo = idea.join(" ").trim() || nombre;

const archivos = {
  "video.json": JSON.stringify({ titulo, formato: perfil.id, voz: VOZ_DE_PARTIDA }, null, 2) + "\n",
  "guion.txt": "",
  "hechos.json": "[]\n",
  "planos.md": `# Guion visual: ${titulo}

Se escribe antes de dibujar. Una entrada por escena. Si en «Qué actúa» solo cabe «un texto» o «una lista», falta
pensar la escena: ¿qué objeto puede hacer algo que cuente la idea?

## 1. (nombre de la escena) — empieza en «(palabra de la voz)»

- Qué actúa:
- Qué hace:
- Qué se entiende al verlo:
- Qué se lee (las palabras exactas):
- La cámara o el encuadre:
`,
  "decisiones.md": `# Decisiones del creador para este vídeo

Una línea por decisión, con la fecha y sus palabras entre comillas. Los jueces la reciben como cosa decidida.
`,
  "notas.md": `# ${titulo}

Lo que se va probando, lo que falla y por qué, lo que dicen los jueces y lo que pide el creador (con sus palabras).
`,
  "video.tsx": `// Aquí se dibuja el vídeo: un componente de React que Remotion pinta fotograma a fotograma.
// useNarracion() da el fotograma (f), el segundo (t) y cuando("palabra"): el fotograma en que la voz dice esa palabra.
// Los archivos de medios/ se usan con staticFile("nombre.png").
import React from "react";
import { AbsoluteFill } from "remotion";
import { useNarracion } from "@motor";

export default function Video() {
  const { t } = useNarracion();
  return <AbsoluteFill style={{ background: "#0B0D12" }} data-segundo={t.toFixed(2)} />;
}
`,
};
for (const sub of ["medios", "fuentes"]) mkdirSync(join(carpeta, sub), { recursive: true });
for (const [archivo, contenido] of Object.entries(archivos)) writeFileSync(join(carpeta, archivo), contenido);

console.log(`Vídeo creado: ${carpeta}`);
console.log(`Es ${perfil.es}, ${perfil.ancho}×${perfil.alto}, para ${perfil.para}. Sus medidas: node motor/medir.mjs ${nombre} --ficha`);
