// Lo que un video.tsx puede importar para una escena en 3D: import { Escenario, Robot, camaraPorTramos, … } from "@motor/3d";
// Va aparte de "@motor" para que un vídeo sin 3D no cargue Three.js. Guía: motor/LEEME.md, «Escenas en 3D».
export { sat, suave, llega, seVa, paso, muelle, destello, mez, azar, parpadeo, recorrido, velocidad, relevo } from "./tiempo";
export type { V3 } from "./tiempo";
export { camaraPorTramos, proyector, FOV } from "./camara";
export type { Encuadre } from "./camara";
export { tono, texturaHalo, texturaIcono, texturaLed, texturaMancha } from "./texturas";
export type { Trazos } from "./texturas";
export { Escenario } from "./Escenario";
export { Ceramica, Cristal, Satinado, Metal, Papel, Emite, Contacto, cajaRedonda } from "./acabado";
export { Halo, Charco, Robot, EsferaAgente, Moneda, Hilo, Carril, Nodo, Franja, Peana, Bandeja, Tarjeta, Barrera, Aro, Telefono } from "./piezas";
