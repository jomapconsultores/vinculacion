import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExportSeccion } from "@/components/alumni/ExportSeccion";
import { GraficoComparativo, agrupar } from "@/components/alumni/GraficoComparativo";
import { traerTitulosParaComparativo } from "@/lib/alumni";
import {
  GraduationCap,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  X,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

type Filtros = {
  con_carrera?: string;
  q?: string;
  pagina?: string;
};

const ETIQUETA_NIVEL: Record<string, string> = {
  PROFESIONAL: "Profesional",
  ESPECIALISTA: "Especialista",
  MAESTRIA: "Maestría",
};

function qs(base: Filtros, cambios: Partial<Filtros>): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...base, ...cambios })) {
    if (v) merged[k] = v;
  }
  return "?" + new URLSearchParams(merged).toString();
}

export default async function TitulosPage({ searchParams }: { searchParams: Filtros }) {
  await requireModulo("alumni");
  const supabase = await createClient();

  const pagina = Math.max(1, parseInt(searchParams.pagina || "1", 10) || 1);
  const q = (searchParams.q || "").trim();
  const conCarrera = !!searchParams.con_carrera;
  const desde = (pagina - 1) * POR_PAGINA;

  // Listado paginado (con detalle) + agregado ligero de todo el conjunto para
  // el gráfico comparativo del final. Se ejecutan en paralelo.
  let listaQuery = supabase
    .from("alumni_titulos")
    .select(
      "id, titulo, nivel_formacion, instituto, anio_graduacion, carrera_id, carreras(nombre, facultad), alumni!inner(id, cedula, nombres, apellidos, email)",
      { count: "exact" }
    )
    .order("anio_graduacion", { ascending: false, nullsFirst: false })
    .range(desde, desde + POR_PAGINA - 1);

  if (conCarrera) listaQuery = listaQuery.not("carrera_id", "is", null);
  if (q) {
    listaQuery = listaQuery.or(
      `nombres.ilike.%${q}%,apellidos.ilike.%${q}%,cedula.ilike.%${q}%`,
      { referencedTable: "alumni" }
    );
  }

  const [{ data, count, error }, todos] = await Promise.all([
    listaQuery,
    traerTitulosParaComparativo(supabase, conCarrera, q),
  ]);
  const filas = (data ?? []) as any[];
  const total = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  // Agregados para el gráfico comparativo (sobre todo el conjunto filtrado).
  const compNivel = agrupar(todos, (r) => ETIQUETA_NIVEL[r.nivel_formacion] ?? "Sin nivel");
  const compFacultad = agrupar(todos, (r) => r.carreras?.facultad ?? "Sin asignar");

  // Query de exportación: misma sección "titulos" con el filtro con_carrera.
  const exportParams = new URLSearchParams({ seccion: "titulos" });
  if (conCarrera) exportParams.set("con_carrera", "1");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/alumni"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al panel de Alumni
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <GraduationCap className="h-6 w-6 text-blue-700" /> Títulos
          </h1>
          <ExportSeccion
            params={exportParams.toString()}
            etiqueta={conCarrera ? "Títulos con carrera" : "Títulos"}
          />
        </div>
      </div>

      {conCarrera && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge inline-flex items-center gap-1.5 bg-blue-50 text-blue-700">
            Solo <strong>títulos con carrera asignada</strong>
            <Link href="/admin/alumni/titulos" aria-label="Quitar filtro">
              <X className="h-3.5 w-3.5" />
            </Link>
          </span>
        </div>
      )}

      <form className="card flex items-center gap-2 p-3">
        {conCarrera && <input type="hidden" name="con_carrera" value="1" />}
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, apellido o cédula del graduado…"
          className="input flex-1 border-none focus:ring-0"
        />
        <button className="btn-primary">Buscar</button>
      </form>

      <p className="text-sm text-slate-500">
        {error
          ? "No se pudo cargar el listado."
          : `${total.toLocaleString("es-EC")} título${total === 1 ? "" : "s"}${
              q ? ` que coinciden con “${q}”` : ""
            } — página ${pagina} de ${totalPaginas}`}
      </p>

      <div className="space-y-2">
        {filas.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Sin resultados.</div>
        ) : (
          filas.map((t) => {
            const a = t.alumni ?? {};
            const c = t.carreras ?? {};
            return (
              <Link
                key={t.id}
                href={`/admin/alumni/${a.id}`}
                className="card card-hover flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{t.titulo || "—"}</p>
                  <p className="truncate text-sm text-slate-500">
                    {a.nombres || "—"} {a.apellidos || ""}
                    {a.cedula ? ` · ${a.cedula}` : ""}
                    {t.anio_graduacion ? ` · ${t.anio_graduacion}` : ""}
                    {t.nivel_formacion ? ` · ${ETIQUETA_NIVEL[t.nivel_formacion] ?? t.nivel_formacion}` : ""}
                    {c.facultad ? ` · ${c.facultad}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            );
          })
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          {pagina > 1 ? (
            <Link href={qs(searchParams, { pagina: String(pagina - 1) })} className="btn-outline">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : (
            <span />
          )}
          {pagina < totalPaginas && (
            <Link href={qs(searchParams, { pagina: String(pagina + 1) })} className="btn-outline">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Gráfico comparativo del conjunto filtrado */}
      {todos.length > 0 && (
        <div>
          <h2 className="mb-3 mt-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <BarChart3 className="h-4 w-4" /> Comparativo del resultado ({todos.length.toLocaleString("es-EC")})
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoComparativo titulo="Por nivel de formación" filas={compNivel} color="bg-amber-500" />
            <GraficoComparativo titulo="Por facultad" filas={compFacultad} color="bg-blue-600" />
          </div>
        </div>
      )}
    </div>
  );
}
