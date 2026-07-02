"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, LogOut } from "lucide-react";
import { iniciales } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

export function Sidebar({
  items,
  nombre,
  apellido,
  rol,
}: {
  items: NavItem[];
  nombre: string;
  apellido: string;
  rol: string;
}) {
  const path = usePathname();
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 font-semibold text-blue-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
          <HeartHandshake className="h-5 w-5" />
        </div>
        Conecta
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/dashboard" && path.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
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
    </aside>
  );
}
