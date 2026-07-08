// Identificador institucional de la plataforma.
//
// Es un logo PROPIO (birrete académico en azul institucional con borla roja,
// colores afines a la Universidad de Cuenca), pensado como marca provisional
// hasta contar con el asset oficial. Para reemplazarlo por el logo oficial,
// sustituye únicamente <LogoMark/> por un <img src="/ucuenca.svg" .../> o el
// SVG oficial; el resto del lockup (texto) se mantiene igual en toda la app.

import Link from "next/link";
import { HeartHandshake } from "lucide-react";

type Variante = "brand" | "onDark";
type Tamano = "sm" | "md" | "lg";

const DIMS: Record<Tamano, { mark: number; titulo: string; sub: string }> = {
  sm: { mark: 30, titulo: "text-sm", sub: "text-[10px]" },
  md: { mark: 38, titulo: "text-[15px]", sub: "text-[11px]" },
  lg: { mark: 46, titulo: "text-lg", sub: "text-xs" },
};

// La marca gráfica original: el ícono HeartHandshake (manos + corazón, símbolo
// de "Conecta"/vinculación) sobre una teja azul institucional. Late con un
// efecto de bombeo tipo corazón (.animate-latido, ver globals.css). Tamaño
// parametrizable en px; el ícono ocupa ~58% de la teja.
export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <span
      role="img"
      aria-label="Conecta"
      className="animate-latido inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-900 text-white shadow-brand"
      style={{ width: size, height: size }}
    >
      <HeartHandshake style={{ width: size * 0.58, height: size * 0.58 }} />
    </span>
  );
}

// Lockup completo: marca gráfica + nombre institucional y producto.
export function Logo({
  variant = "brand",
  size = "md",
  href,
  withText = true,
  className = "",
}: {
  variant?: Variante;
  size?: Tamano;
  href?: string;
  withText?: boolean;
  className?: string;
}) {
  const d = DIMS[size];
  const titulo = variant === "onDark" ? "text-white" : "text-blue-950";
  const sub = variant === "onDark" ? "text-blue-100/80" : "text-slate-400";

  const contenido = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={d.mark} />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight ${d.titulo} ${titulo}`}>UCuenca</span>
          <span className={`mt-0.5 font-medium ${d.sub} ${sub}`}>Proyecto Conecta</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex" aria-label="UCuenca · Proyecto Conecta">
        {contenido}
      </Link>
    );
  }
  return contenido;
}
