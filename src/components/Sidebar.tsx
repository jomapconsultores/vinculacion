"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, LogOut, Menu, X } from "lucide-react";
import { iniciales } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

function Marca() {
  return (
    <div className="flex items-center gap-2 font-semibold text-blue-900">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
        <HeartHandshake className="h-5 w-5" />
      </div>
      Conecta
    </div>
  );
}

function Contenido({
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
      <div className="hidden items-center border-b border-slate-200 px-5 py-4 lg:flex">
        <Marca />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((it) => {
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
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {iniciales(nombre, apellido)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{nombre} {apellido}</p>
            <p className="text-xs capitalize text-slate-400">{rol}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost mt-1 w-full justify-start text-slate-500">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </form>
      </div>
    </>
  );
}

export function Sidebar(props: { items: NavItem[]; nombre: string; apellido: string; rol: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior (solo móvil) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Marca />
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
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
            <Contenido {...props} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
