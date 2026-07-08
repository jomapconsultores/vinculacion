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

// La marca gráfica: un corazón azul con gradiente y un leve brillo, símbolo de
// "Conecta" (vinculación). Colores fijos (independientes de Tailwind) para verse
// igual sobre cualquier fondo; un sutil resplandor azul le da presencia.
export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Conecta"
      className="shrink-0 drop-shadow-[0_2px_5px_rgba(37,99,235,0.35)]"
    >
      <defs>
        <linearGradient id="ucHeart" x1="0.2" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      {/* Corazón */}
      <path
        d="M20 34.2 C20 34.2 4.5 24.8 4.5 13.9 C4.5 8.9 8.3 5 13 5 C16.2 5 18.8 6.9 20 9.7 C21.2 6.9 23.8 5 27 5 C31.7 5 35.5 8.9 35.5 13.9 C35.5 24.8 20 34.2 20 34.2 Z"
        fill="url(#ucHeart)"
      />
      {/* Brillo especular en el lóbulo izquierdo */}
      <ellipse cx="13.8" cy="12.4" rx="3.6" ry="2.3" fill="#ffffff" opacity="0.35" transform="rotate(-32 13.8 12.4)" />
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
