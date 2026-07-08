"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, Settings, ChevronDown, Repeat } from "lucide-react";
import { Logo } from "@/components/Logo";
import { iniciales } from "@/lib/utils";

// `group` clasifica el ítem dentro de un módulo del menú (ej. "Servicios y
// prácticas"); los ítems sin `group` se muestran sueltos, antes de los
// grupos, sin encabezado (ej. "Panel").
export type NavItem = { href: string; label: string; icon: React.ReactNode; group?: string };

// Agrupa manteniendo el orden de aparición de cada grupo (no alfabético):
// el primer ítem de un grupo nuevo determina dónde aparece ese bloque.
function agruparItems(items: NavItem[]): { group: string | null; items: NavItem[] }[] {
  const bloques: { group: string | null; items: NavItem[] }[] = [];
  for (const it of items) {
    const clave = it.group ?? null;
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.group === clave) {
      ultimo.items.push(it);
    } else {
      bloques.push({ group: clave, items: [it] });
    }
  }
  return bloques;
}
export type RolDisponible = { rol: string; label: string };

function Marca() {
  return <Logo size="sm" />;
}

function rutaParaRol(rol: string) {
  return rol === "empleador" ? "/empleador" : "/dashboard";
}

function SelectorRol({ rol, rolesDisponibles }: { rol: string; rolesDisponibles: RolDisponible[] }) {
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rolesDisponibles.length < 2) return null;

  // `rol` puede venir como etiqueta de despliegue ("Estudiante") o como valor
  // crudo ("empleador"/"admin"), según el layout que llame a <Sidebar>. Se
  // compara sin distinguir mayúsculas para saber cuál es el rol activo.
  const esActivo = (candidato: string) => candidato.toLowerCase() === rol.toLowerCase();

  async function elegir(destino: RolDisponible) {
    if (esActivo(destino.rol) || cargando) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/cuenta/cambiar-rol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: destino.rol }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo cambiar de rol.");
        setCargando(false);
        return;
      }
      // Recarga completa: el servidor debe reevaluar requireProfile()/getSessionProfile()
      // con el rol nuevo, no una navegación de cliente.
      window.location.href = rutaParaRol(destino.rol);
    } catch {
      setError("No se pudo cambiar de rol.");
      setCargando(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={cargando}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Repeat className="h-3.5 w-3.5" />
        {cargando ? "Cambiando…" : "Cambiar rol"}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {rolesDisponibles.map((r) => (
              <button
                key={r.rol}
                type="button"
                disabled={esActivo(r.rol) || cargando}
                onClick={() => elegir(r)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  esActivo(r.rol) ? "cursor-default bg-blue-50 text-blue-900" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
            {error && <p className="px-3 py-1.5 text-xs text-red-600">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function Contenido({
  items,
  nombre,
  apellido,
  rol,
  rolesDisponibles,
  onNavigate,
}: {
  items: NavItem[];
  nombre: string;
  apellido: string;
  rol: string;
  rolesDisponibles?: RolDisponible[];
  onNavigate?: () => void;
}) {
  const path = usePathname();
  return (
    <>
      <div className="hidden items-center justify-between border-b border-slate-200 px-5 py-4 lg:flex">
        <Marca />
        {rolesDisponibles && rolesDisponibles.length > 1 && (
          <SelectorRol rol={rol} rolesDisponibles={rolesDisponibles} />
        )}
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-3">
        {agruparItems(items).map((bloque, i) => (
          <div key={bloque.group ?? `_sin-grupo-${i}`} className="space-y-1">
            {bloque.group && (
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {bloque.group}
              </p>
            )}
            {bloque.items.map((it) => {
              const active = path === it.href || (it.href !== "/dashboard" && it.href !== "/admin" && it.href !== "/empleador" && path.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-blue-50 text-blue-900" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {it.icon}
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-900 ring-1 ring-inset ring-blue-100">
            {iniciales(nombre, apellido)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{nombre} {apellido}</p>
            <p className="text-xs capitalize text-slate-400">{rol}</p>
          </div>
        </div>
        <Link
          href="/cuenta"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" /> Mi cuenta
        </Link>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost mt-1 w-full justify-start text-slate-500">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </form>
      </div>
    </>
  );
}

export function Sidebar(props: {
  items: NavItem[];
  nombre: string;
  apellido: string;
  rol: string;
  rolesDisponibles?: RolDisponible[];
}) {
  const [open, setOpen] = useState(false);
  const { rol, rolesDisponibles } = props;

  return (
    <>
      {/* Barra superior (solo móvil): logo a la izquierda, selector de rol +
          menú agrupados a la derecha (misma esquina que en escritorio). */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Marca />
        <div className="flex items-center gap-2">
          {rolesDisponibles && rolesDisponibles.length > 1 && (
            <SelectorRol rol={rol} rolesDisponibles={rolesDisponibles} />
          )}
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Barra lateral fija (escritorio) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <Contenido {...props} />
      </aside>

      {/* Cajón deslizante (móvil) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <Marca />
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* El selector también vive en la barra superior móvil (fuera de
                este cajón), pero mientras el cajón está abierto su overlay de
                fondo cubre esa barra por encima (z-40 vs z-30). Se repite aquí
                dentro para que "Cambiar rol" siga siendo alcanzable sin tener
                que cerrar el menú primero. */}
            {rolesDisponibles && rolesDisponibles.length > 1 && (
              <div className="border-b border-slate-200 px-5 py-3">
                <SelectorRol rol={rol} rolesDisponibles={rolesDisponibles} />
              </div>
            )}
            <Contenido {...props} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
