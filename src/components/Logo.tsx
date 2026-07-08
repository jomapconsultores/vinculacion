// Identificador institucional de la plataforma.
//
// Es un logo PROPIO (birrete académico en azul institucional con borla roja,
// colores afines a la Universidad de Cuenca), pensado como marca provisional
// hasta contar con el asset oficial. Para reemplazarlo por el logo oficial,
// sustituye únicamente <LogoMark/> por un <img src="/ucuenca.svg" .../> o el
// SVG oficial; el resto del lockup (texto) se mantiene igual en toda la app.

import Link from "next/link";

type Variante = "brand" | "onDark";
type Tamano = "sm" | "md" | "lg";

const DIMS: Record<Tamano, { mark: number; titulo: string; sub: string }> = {
  sm: { mark: 30, titulo: "text-sm", sub: "text-[10px]" },
  md: { mark: 38, titulo: "text-[15px]", sub: "text-[11px]" },
  lg: { mark: 46, titulo: "text-lg", sub: "text-xs" },
};

// La marca gráfica: birrete de graduación sobre teja azul con borla roja.
// Colores fijos (independientes de Tailwind) para verse igual en cualquier fondo.
export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="UCuenca"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="ucBrandTile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#172554" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ucBrandTile)" />
      {/* Cabeza / banda del birrete (detrás del tablero) */}
      <path
        d="M11.5 17.2 V22 C11.5 22 15 25.6 20 25.6 C25 25.6 28.5 22 28.5 22 V17.2"
        fill="#ffffff"
        opacity="0.85"
      />
      {/* Tablero (mortarboard) */}
      <path d="M20 8.3 L35.2 14.6 L20 20.9 L4.8 14.6 Z" fill="#ffffff" />
      {/* Botón central */}
      <circle cx="20" cy="14.6" r="1.35" fill="#1e3a8a" />
      {/* Borla: cordón + nudo en rojo institucional */}
      <path d="M34.6 14.9 V25.4" stroke="#e11d2b" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="34.6" cy="26.8" r="1.9" fill="#e11d2b" />
    </svg>
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
