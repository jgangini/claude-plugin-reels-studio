// Pinta encima del vídeo lo que la red tapa en su formato (la barra de arriba, el texto de abajo, los botones…), para
// ver de un vistazo si algo importante cae debajo. Solo sale con «render.mjs --zonas»; nunca en el vídeo que se entrega.
import React from "react";
import { cajaDe, type Perfil } from "./perfil";

export const Zonas: React.FC<{ perfil: Perfil; ancho: number; alto: number }> = ({ perfil, ancho, alto }) => (
  <div data-medir="fuera" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {perfil.zonas.map((zona) => {
      const [x, y, w, h] = cajaDe(zona, ancho, alto);
      return (
        <div key={zona.id} style={{ position: "absolute", left: x, top: y, width: w, height: h, background: "rgba(255, 40, 60, 0.28)", outline: "3px solid rgba(255, 40, 60, 0.85)", outlineOffset: -3 }}>
          <span style={{ position: "absolute", left: 12, top: 8, font: "700 26px sans-serif", color: "#fff", textShadow: "0 0 6px #000" }}>{zona.tapa}</span>
        </div>
      );
    })}
  </div>
);
