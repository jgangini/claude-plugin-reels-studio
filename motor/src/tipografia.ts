// La letra del motor (los subtítulos y lo que un vídeo no decida por su cuenta): Figtree, que viene con Remotion.
import { loadFont } from "@remotion/google-fonts/Figtree";

const figtree = loadFont("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] });

export const LETRA = figtree.fontFamily;
/** se resuelve cuando la letra ya está cargada: antes de eso no se dibuja ningún fotograma */
export const letraLista = () => figtree.waitUntilDone();
