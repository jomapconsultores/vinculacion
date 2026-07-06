import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { iniciales } from "@/lib/utils";
import { UsersRound, Search, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const ROL_LABEL: Record<string, string> = {
  estudiante: "Estudiante",
  profesional: "Profesional",
  empleador: "Empleador",
  autoridad: "Autoridad",
  admin: "Administrador",
};

const ROL_BADGE: Record<string, string> = {
  estudiante: "bg-amber-50 text-amber-700",
  profesional: "bg-blue-50 text-blue-700",
  empleador: "bg-emerald-50 text-emerald-700",
  autoridad: "bg-purple-50 text-purple-700",
  admin: "bg-slate-800 text-white",
};

// Vista central de Administración: a diferencia de /admin/personas (solo
// estudiante/profesional) y /admin/autoridades (solo autoridad), aquí se
// puede buscar y administrar CUALQUIER cuenta — para otorgar/revocar roles
// o permisos de módulo sin importar su rol actual. Exclusivo del admin.
export default async function UsuariosPage({ searchParams }: { searchParams: { q?: string } }) {
  const profile = await requireProfile();
  if (profile.rol !== "admin") redirect("/admin");

  const supabase = await createClient();
  const q = (searchParams.q || "").trim();

  let query = supabase
    .from("profiles")
    .select("id, nombres, apellidos, cedula, email, rol, aprobado")
    .order("apellidos", { ascending: true })
    .limit(50);

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nombres.ilike.${like},apellidos.ilike.${like},cedula.ilike.${like},email.ilike.${like}`);
  }

  const { data } = await query;
  const usuarios = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <UsersRound className="h-6 w-6 text-blue-700" /> Usuarios
        </h1>
        <p className="mt-1 text-slate-500">
          Otorga o revoca roles y permisos de módulo a cualquier cuenta del sistema.
        </p>
      </div>

      <form className="card flex items-center gap-2 p-3">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, apellido, cédula o correo…"
          className="input flex-1 border-none focus:ring-0"
        />
        <button className="btn-primary">Buscar</button>
      </form>

      <div className="space-y-2">
        {usuarios.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Sin resultados.</div>
        ) : (
          usuarios.map((p: any) => (
            <Link
              key={p.id}
              href={`/admin/usuarios/${p.id}`}
              className="card flex items-center justify-between gap-3 p-4 transition hover:border-blue-300"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  {iniciales(p.nombres, p.apellidos)}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium text-slate-800">
                    {p.nombres || "—"} {p.apellidos || ""}
                    <span className={`badge shrink-0 ${ROL_BADGE[p.rol] ?? "bg-slate-100 text-slate-600"}`}>
                      {ROL_LABEL[p.rol] ?? p.rol}
                    </span>
                    {p.rol === "autoridad" && !p.aprobado && (
                      <span className="badge shrink-0 bg-amber-50 text-amber-700">Pendiente</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {p.cedula ?? "—"} · {p.email}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
