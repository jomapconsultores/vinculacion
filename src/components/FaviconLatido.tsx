"use client";

import { useEffect } from "react";

// Favicon animado: un corazón azul que palpita (lub-dub). Los navegadores no
// animan favicons SVG de forma fiable, así que se dibuja el corazón en un
// <canvas> y se actualiza un <link rel="icon"> propio cuadro a cuadro (~11 fps).
//
// IMPORTANTE: NO se tocan los <link rel="icon"> que gestiona React/Next
// (borrarlos rompe la reconciliación del <head> y provoca un removeChild
// inválido → "client-side exception"). Se añade solo un <link> propio al final
// del <head> —el navegador usa el último icono declarado— y se elimina ese
// mismo nodo al desmontar. Todo va dentro de try/catch: ante cualquier fallo
// se conserva el favicon estático (app/icon.svg).

const HEART =
  "M20 34.2 C20 34.2 4.5 24.8 4.5 13.9 C4.5 8.9 8.3 5 13 5 C16.2 5 18.8 6.9 20 9.7 C21.2 6.9 23.8 5 27 5 C31.7 5 35.5 8.9 35.5 13.9 C35.5 24.8 20 34.2 20 34.2 Z";

// Mismo perfil de latido que .animate-latido en globals.css.
const KF: [number, number][] = [
  [0, 1], [0.12, 1.16], [0.24, 1], [0.36, 1.09], [0.48, 1], [1, 1],
];

function escala(t: number): number {
  for (let i = 0; i < KF.length - 1; i++) {
    const [t0, v0] = KF[i];
    const [t1, v1] = KF[i + 1];
    if (t >= t0 && t <= t1) {
      const p = t1 - t0 === 0 ? 0 : (t - t0) / (t1 - t0);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOut
      return v0 + (v1 - v0) * e;
    }
  }
  return 1;
}

export function FaviconLatido() {
  useEffect(() => {
    let raf = 0;
    let link: HTMLLinkElement | null = null;

    try {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return; // sin canvas: se queda el icon.svg estático

      const path = new Path2D(HEART);

      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
      const propio = link;

      const dibujar = (s: number) => {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        const k = ((size * 0.92) / 40) * s; // 40 = viewBox del path; 0.92 deja margen
        ctx.translate(size / 2, size / 2);
        ctx.scale(k, k);
        ctx.translate(-20, -20); // centro del path
        ctx.fillStyle = "#2563eb";
        ctx.fill(path);
        ctx.restore();
        propio.href = canvas.toDataURL("image/png");
      };

      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        dibujar(1);
      } else {
        const periodo = 1400; // ms por latido
        let inicio = 0;
        let ultimo = 0;
        const loop = (ts: number) => {
          if (!inicio) inicio = ts;
          if (ts - ultimo >= 90) {
            dibujar(escala(((ts - inicio) % periodo) / periodo));
            ultimo = ts;
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
    } catch {
      // Ante cualquier problema se conserva el favicon estático.
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (link) link.remove(); // solo nuestro nodo (React no lo gestiona)
    };
  }, []);

  return null;
}
