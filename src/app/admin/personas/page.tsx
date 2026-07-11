import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { iniciales } from "@/lib/utils";
import { BotonesReporte } from "@/components/BotonesReporte";
import { Users, Search, ChevronRight, ChevronLeft, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

type FilaDirectorio = {
  tipo: "cuenta" | "alumni";
  ref: string;
  nombres: string | null;
  apellidos: string | null;
  cedula: string | null;
  email: string | null;
  telefono: string | null;
  rol: string;
  carrera: string | null;
  titulo_reciente: string | null;
  titulos: number | null;
};

const BADGE: Record<string, { label: string; clase: string }> = {
  estudiante: { label: "Estudiante", clase: "bg-amber-50 text-amber-700" },
  profesional: { label: "Profesional", clase: "bg-blue-50 text-blue-700" },
  alumni: { label: "Graduado", clase: "bg-teal-50 text-teal-700" },
};

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: { q?: string; pagina?: string };
}) {
  await requireModulo("personas");
  const supabase = await createClient();
  const q = (searchParams.q || "").trim();
  const pagina = Math.max(1, parseInt(searchParams.pagina || "1", 10) || 1);
  const desde = (pagina - 1) * POR_PAGINA;

  // Directorio unificado (v_personas_directorio, 0038): cuentas registradas +
  // graduados importados sin cuenta, con búsqueda indexada (pg_trgm) y
  // paginación por rango — así la lista responde rápido con miles de filas.
  let query = supabase
    .from("v_personas_directorio")
    .select("*", { count: "exact" })
    .order("apellidos", { ascending: true })
    .order("nombres", { ascending: true })
    .range(desde, desde + POR_PAGINA - 1);

  if (q) {
    const like = `%${q.replace(/[%_,()]/g, "")}%`;
    query = query.or(
      `nombres.ilike.${like},apellidos.ilike.${like},cedula.ilike.${like},email.ilike.${like}`
    );
  }

  const { data, count } = await query;
  const personas = (data ?? []) as FilaDirectorio[];
  const total = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const urlPagina = (p: number) =>
    `/admin/personas?${new URLSearchParams({ ...(q ? { q } : {}), pagina: String(p) })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-6 w-6 text-blue-700" /> Personas
          </h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Todas las personas registradas en la base: cuentas del sistema y graduados importados
            del registro de alumni. Acceso restringido a autoridades y administrador.
          </p>
        </div>
        <BotonesReporte base="/api/admin/personas-reporte" />
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

      <p className="text-sm text-slate-500">
        {total.toLocaleString("es-EC")} personas{q ? ` que coinciden con “${q}”` : ""} — página{" "}
        {pagina} de {totalPaginas}
      </p>

      <div className="space-y-2">
        {personas.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Sin resultados.</div>
        ) : (
          personas.map((p) => {
            const badge = BADGE[p.rol] ?? BADGE.profesional;
            const contenido = (
              <>
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-inset ${
                      p.tipo === "alumni"
                        ? "bg-teal-50 text-teal-900 ring-teal-100"
                        : "bg-blue-50 text-blue-900 ring-blue-100"
                    }`}
                  >
                    {p.tipo === "alumni" && !p.nombres ? (
                      <GraduationCap className="h-4 w-4" />
                    ) : (
                      iniciales(p.nombres, p.apellidos)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-slate-800">
                      {p.nombres || "—"} {p.apellidos || ""}
                      <span className={`badge shrink-0 ${badge.clase}`}>{badge.label}</span>
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {p.cedula ?? "—"}
                      {p.email ? ` · ${p.email}` : ""}
                      {p.carrera
                        ? ` · ${p.carrera}`
                        : p.titulo_reciente
                          ? ` · ${p.titulo_reciente}`
                          : ""}
                      {p.tipo === "alumni" && (p.titulos ?? 0) > 1 ? ` · ${p.titulos} títulos` : ""}
                    </p>
                  </div>
                </div>
                {p.tipo === "cuenta" && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
              </>
            );

            // Solo las cuentas tienen expediente; los graduados importados se
            // gestionan desde el módulo Alumni.
            return p.tipo === "cuenta" ? (
              <Link
                key={`c-${p.ref}`}
                href={`/admin/personas/${p.ref}`}
                className="card card-hover flex items-center justify-between gap-3 p-4"
              >
                {contenido}
              </Link>
            ) : (
              <div key={`a-${p.ref}`} className="card flex items-center justify-between gap-3 p-4">
                {contenido}
              </div>
            );
          })
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          {pagina > 1 ? (
            <Link href={urlPagina(pagina - 1)} className="btn-outline">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : (
            <span />
          )}
          {pagina < totalPaginas && (
            <Link href={urlPagina(pagina + 1)} className="btn-outline">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
