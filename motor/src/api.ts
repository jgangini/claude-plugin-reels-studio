// Lo que un video.tsx puede importar de "@motor". El 3D va aparte, en "@motor/3d".
export { useNarracion, llano } from "./reloj"; // el fotograma, el segundo y cuándo se dice cada palabra
export type { Narracion, PalabraEnElTiempo } from "./reloj";
export type { BloqueDeSubtitulo, Datos, PalabraDicha } from "./datos";
export { Subtitulos, SUBTITULOS_DE_PARTIDA } from "./Subtitulos"; // por si un vídeo quiere dibujarlos él en otro sitio
export type { EstiloDeSubtitulos } from "./Subtitulos";
export { LETRA } from "./tipografia";
export { usePerfil } from "./perfil"; // el formato del vídeo: usePerfil().zonas (lo que tapa la red), .letra (las medidas mínimas), .aire
export type { Perfil, Zona } from "./perfil";
export { Instante } from "./Instante"; // <Instante s={12.5}>…</Instante>: lo de dentro, como está en ese segundo (para la portada)
export { Ventana, Linea, Escribe, Cursor, Hueco, Pensando, Bala, Tono, Entrada, empujon, MONO, PANTALLA } from "./Pantalla"; // pantallas que no «nadan» (chat, terminal)
