import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AutoridadModulos } from "@/components/AutoridadModulos";
import { iniciales } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Pantalla exclusiva del administrador: ni siquiera autoridad la ve (a
// diferencia de otras páginas de /admin, que autoridad aprobada también
// puede consultar). Aquí se reparten los permisos_modulo (0032) que
// controlan a cuáles páginas de /admin tiene acceso cada autoridad.
export default async function AutoridadesPage() {
  const profile = await requireProfile();
  if (profile.rol !== "admin") redirect("/admin");

  const supabase = await createClient();

  const [{ data: autoridades }, { data: permisos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombres, apellidos, email, aprobado")
      .eq("rol", "autoridad")
      .order("apellidos", { ascending: true }),
    supabase.from("permisos_modulo").select("profile_id, modulo"),
  ]);

  const listaAutoridades = autoridades ?? [];
  const listaPermisos = permisos ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ShieldCheck className="h-6 w-6 text-blue-700" /> Autoridades
        </h1>
        <p className="mt-1 text-slate-500">
          Controla a qué módulos de /admin tiene acceso cada cuenta de autoridad.
        </p>
      </div>

      <div className="space-y-4">
        {listaAutoridades.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Sin autoridades registradas.</div>
        ) : (
          listaAutoridades.map((a) => {
            const modulos = listaPermisos.filter((p) => p.profile_id === a.id).map((p) => p.modulo);
            const nombreCompleto = `${a.nombres || "—"} ${a.apellidos || ""}`.trim();
            return (
              <div key={a.id} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-900 ring-1 ring-inset ring-blue-100">
                    {iniciales(a.nombres, a.apellidos)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-500">
                      {a.email ?? "—"}
                      {!a.aprobado && <span className="badge ml-2 bg-amber-50 text-amber-700">Pendiente de aprobación</span>}
                    </p>
                  </div>
                </div>
                <AutoridadModulos
                  autoridadId={a.id}
                  nombre={nombreCompleto || a.email || "—"}
                  modulosActuales={modulos}
                  aprobado={a.aprobado}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
