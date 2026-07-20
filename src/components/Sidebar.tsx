"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, Settings, ChevronDown, Repeat } from "lucide-react";
import { Logo } from "@/components/Logo";
import { iniciales } from "@/lib/utils";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

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

// Rutas raíz de cada rol: no deben marcarse como activas por prefijo (si no,
// "/admin" quedaría activo en todas sus subpáginas).
const RAICES = new Set(["/dashboard", "/admin", "/empleador"]);

function esRutaActiva(href: string, path: string) {
  return path === href || (!RAICES.has(href) && path.startsWith(href));
}

// Grupo (módulo) al que pertenece la ruta actual; null si la ruta corresponde
// a un ítem suelto (ej. "Panel") o no está en el menú.
function grupoDeRuta(items: NavItem[], path: string): string | null {
  const item = items.find((it) => esRutaActiva(it.href, path));
  return item?.group ?? null;
}

export type RolDisponible = { rol: string; label: string };

function Marca() {
  return <Logo size="sm" />;
}

function rutaParaRol(rol: string) {
  const r = rol.toLowerCase();
  if (r === "empleador") return "/empleador";
  // admin/autoridad van directo a /admin: evita el salto extra
  // /dashboard -> (redirect del servidor) -> /admin, que hacía más lento el cambio.
  if (r === "admin" || r === "autoridad") return "/admin";
  return "/dashboard";
}

// Etiqueta y color del rol para mostrarlo junto al nombre del usuario.
const ROL_INFO: Record<string, { label: string; badge: string }> = {
  estudiante: { label: "Estudiante", badge: "bg-amber-100 text-amber-800" },
  profesional: { label: "Profesional", badge: "bg-blue-100 text-blue-800" },
  empleador: { label: "Empleador", badge: "bg-emerald-100 text-emerald-800" },
  autoridad: { label: "Autoridad", badge: "bg-purple-100 text-purple-800" },
  admin: { label: "Administrador", badge: "bg-slate-800 text-white" },
};

function infoRol(rol: string) {
  return ROL_INFO[rol.toLowerCase()] ?? { label: rol, badge: "bg-slate-100 text-slate-600" };
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

// Identidad del usuario: nombre y, justo debajo, el rol activo.
function Identidad({ nombre, apellido, rol }: { nombre: string; apellido: string; rol: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-900 ring-1 ring-inset ring-blue-100">
        {iniciales(nombre, apellido)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{nombre} {apellido}</p>
        <span className={`badge mt-1 ${infoRol(rol).badge}`}>{infoRol(rol).label}</span>
      </div>
    </div>
  );
}

function Pie({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t border-slate-200 p-3">
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
  );
}

// Lista completa en una sola columna, con encabezado por grupo. Se usa en el
// cajón deslizante de móvil, donde no hay ancho para las dos columnas.
function ContenidoLista({
  items,
  nombre,
  apellido,
  rol,
  onNavigate,
}: {
  items: NavItem[];
  nombre: string;
  apellido: string;
  rol: string;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  return (
    <>
      <Identidad nombre={nombre} apellido={apellido} rol={rol} />

      <nav className="flex-1 space-y-3 overflow-y-auto p-3">
        {agruparItems(items).map((bloque, i) => (
          <div key={bloque.group ?? `_sin-grupo-${i}`} className="space-y-1">
            {bloque.group && (
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {bloque.group}
              </p>
            )}
            {bloque.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  esRutaActiva(it.href, path) ? "bg-blue-50 text-blue-900" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {it.icon}
                {it.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <Pie onNavigate={onNavigate} />
    </>
  );
}

// Escritorio: dos columnas. La primera es el riel de módulos (un botón por
// grupo, más los ítems sueltos como enlace directo); la segunda despliega los
// submenús del módulo seleccionado.
function ContenidoColumnas({
  items,
  nombre,
  apellido,
  rol,
  rolesDisponibles,
}: {
  items: NavItem[];
  nombre: string;
  apellido: string;
  rol: string;
  rolesDisponibles?: RolDisponible[];
}) {
  const path = usePathname();
  const bloques = agruparItems(items);
  const grupos = bloques.filter((b) => b.group !== null) as { group: string; items: NavItem[] }[];
  const sueltos = bloques.filter((b) => b.group === null).flatMap((b) => b.items);

  // Módulo abierto en la segunda columna. Por defecto, el de la ruta actual;
  // si la ruta es un ítem suelto ("Panel"), se mantiene el primer módulo para
  // que la columna nunca quede vacía.
  const grupoRuta = grupoDeRuta(items, path);
  const [abierto, setAbierto] = useState<string | null>(grupoRuta ?? grupos[0]?.group ?? null);

  // Al navegar a otro módulo (ej. desde un enlace fuera del menú), la segunda
  // columna sigue a la ruta.
  useEffect(() => {
    if (grupoRuta) setAbierto(grupoRuta);
  }, [grupoRuta]);

  const activo = grupos.find((g) => g.group === abierto) ?? grupos[0];

  // Menús sin módulos (ej. empleador): no hay nada que desplegar en la segunda
  // columna, así que se mantiene la barra de una sola columna.
  if (grupos.length === 0) {
    return (
      <div className="flex w-64 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <Marca />
          {rolesDisponibles && rolesDisponibles.length > 1 && (
            <SelectorRol rol={rol} rolesDisponibles={rolesDisponibles} />
          )}
        </div>
        <ContenidoLista items={items} nombre={nombre} apellido={apellido} rol={rol} />
      </div>
    );
  }

  return (
    <div className="flex w-[390px] flex-col">
      {/* Encabezado a todo el ancho: la marca abarca las dos franjas. */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <Marca />
        {rolesDisponibles && rolesDisponibles.length > 1 && (
          <SelectorRol rol={rol} rolesDisponibles={rolesDisponibles} />
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Columna 1: riel de módulos */}
        <div className="flex w-[150px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {sueltos.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                title={it.label}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-medium leading-tight transition ${
                  esRutaActiva(it.href, path)
                    ? "bg-blue-100 text-blue-900"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <span className="shrink-0">{it.icon}</span>
                <span className="line-clamp-2">{it.label}</span>
              </Link>
            ))}

            {grupos.map((g) => {
              const seleccionado = activo?.group === g.group;
              const conRutaActual = grupoRuta === g.group;
              return (
                <button
                  key={g.group}
                  type="button"
                  onClick={() => setAbierto(g.group)}
                  title={g.group}
                  aria-current={conRutaActual ? "true" : undefined}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-medium leading-tight transition ${
                    seleccionado
                      ? "bg-blue-100 text-blue-900"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  <span className="shrink-0">{g.items[0].icon}</span>
                  <span className="line-clamp-2">{g.group}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Columna 2: submenús del módulo seleccionado */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Identidad nombre={nombre} apellido={apellido} rol={rol} />

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {activo && (
              <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {activo.group}
              </p>
            )}
            {activo?.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  esRutaActiva(it.href, path) ? "bg-blue-50 text-blue-900" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {it.icon}
                {it.label}
              </Link>
            ))}
          </nav>

          <Pie />
        </div>
      </div>
    </div>
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

  // Cierra la sesión tras 30 minutos de inactividad. El Sidebar solo se
  // renderiza en páginas autenticadas, así que reusa el mismo cierre de
  // sesión del servidor (POST /auth/signout) que usa el botón "Cerrar sesión".
  useInactivityLogout(() => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/signout";
    document.body.appendChild(form);
    form.submit();
  });

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

      {/* Barra lateral fija (escritorio): dos columnas, módulos + submenús */}
      <aside className="hidden shrink-0 border-r border-slate-200 bg-white lg:flex">
        <ContenidoColumnas {...props} />
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
            <ContenidoLista {...props} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
