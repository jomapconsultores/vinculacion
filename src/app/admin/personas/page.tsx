import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { iniciales } from "@/lib/utils";
import { Users, Search, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PersonasPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireModulo("personas");
  const supabase = await createClient();
  const q = (searchParams.q || "").trim();

  let query = supabase
    .from("profiles")
    .select("id, nombres, apellidos, cedula, email, rol, carreras(nombre)")
    .in("rol", ["estudiante", "profesional"])
    .order("apellidos", { ascending: true })
    .limit(50);

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nombres.ilike.${like},apellidos.ilike.${like},cedula.ilike.${like},email.ilike.${like}`);
  }

  const { data } = await query;
  const personas = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Users className="h-6 w-6 text-blue-700" /> Personas
        </h1>
        <p className="mt-1 text-slate-500">
          Expediente y documentos de cada estudiante o profesional. Acceso restringido a autoridades y
          administrador — ningún otro funcionario puede consultar esta información.
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
        {personas.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Sin resultados.</div>
        ) : (
          personas.map((p: any) => (
            <Link
              key={p.id}
              href={`/admin/personas/${p.id}`}
              className="card card-hover flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-900 ring-1 ring-inset ring-blue-100">
                  {iniciales(p.nombres, p.apellidos)}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium text-slate-800">
                    {p.nombres || "—"} {p.apellidos || ""}
                    <span className={`badge shrink-0 ${p.rol === "estudiante" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                      {p.rol === "estudiante" ? "Estudiante" : "Profesional"}
                    </span>
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {p.cedula ?? "—"} · {p.email}
                    {p.carreras?.nombre ? ` · ${p.carreras.nombre}` : ""}
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
