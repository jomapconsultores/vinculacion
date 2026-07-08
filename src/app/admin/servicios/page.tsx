import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HeartHandshake, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";

type ServicioEjecucion = {
  id: number;
  nombre: string;
  area: string | null;
  horas_planificadas: number;
  horas_reales: number;
  atenciones: number;
  porcentaje_ejecucion: number;
};

type Estado = "bajo" | "rango" | "sobre";

function clasificar(pct: number): Estado {
  if (pct < 70) return "bajo";
  if (pct > 110) return "sobre";
  return "rango";
}

const estilos: Record<
  Estado,
  { barra: string; texto: string; chip: string; label: string; icon: React.ElementType }
> = {
  bajo: {
    barra: "bg-rose-500",
    texto: "text-rose-700",
    chip: "bg-rose-50 text-rose-700",
    label: "Subejecución",
    icon: TrendingDown,
  },
  rango: {
    barra: "bg-emerald-500",
    texto: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700",
    label: "En rango",
    icon: CheckCircle2,
  },
  sobre: {
    barra: "bg-amber-500",
    texto: "text-amber-700",
    chip: "bg-amber-50 text-amber-700",
    label: "Sobreejecución",
    icon: TrendingUp,
  },
};

const PAGE_SIZE = 25;

export default async function ServiciosPage({ searchParams }: { searchParams: { page?: string } }) {
  await requireModulo("servicios");
  const supabase = await createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const desde = (page - 1) * PAGE_SIZE;

  // El resumen global se calcula sobre TODOS los servicios con una consulta
  // angosta separada, para poder paginar la lista detallada sin sesgar el
  // resumen a la página actual.
  const [{ data, error, count }, { data: agregados }] = await Promise.all([
    supabase
      .from("v_servicio_ejecucion")
      .select("*", { count: "exact" })
      .order("porcentaje_ejecucion", { ascending: true })
      .range(desde, desde + PAGE_SIZE - 1),
    supabase.from("v_servicio_ejecucion").select("horas_planificadas, horas_reales, porcentaje_ejecucion"),
  ]);
  if (error) console.error("[admin/servicios] v_servicio_ejecucion:", error.message);

  const servicios: ServicioEjecucion[] = (data as ServicioEjecucion[]) ?? [];
  const todos = agregados ?? [];
  const totalRegistros = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / PAGE_SIZE));

  const totalPlan = todos.reduce((s, x) => s + Number(x.horas_planificadas), 0);
  const totalReal = todos.reduce((s, x) => s + Number(x.horas_reales), 0);
  const conDesviacion = todos.filter((x) => clasificar(x.porcentaje_ejecucion) !== "rango").length;
  const ejecucionGlobal = totalPlan > 0 ? Math.round((totalReal / totalPlan) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="badge bg-amber-50 text-amber-700">Pilar 3 · Servicios comunitarios</span>
          <h1 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">
            Control académico–financiero de servicios
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            Comparación entre las horas docentes planificadas y la atención real ejecutada en
            cada uno de los servicios comunitarios. Esta lectura detecta desviaciones entre la
            carga docente presupuestada y su ejecución efectiva, insumo clave para la gestión
            presupuestaria y la rendición de cuentas.
          </p>
        </div>
        <a href="/api/admin/servicios-excel" className="btn-outline shrink-0">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </a>
      </header>

      {/* Resumen */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">{totalRegistros}</p>
          <p className="mt-1 text-sm text-slate-500">Servicios monitoreados</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">{ejecucionGlobal}%</p>
          <p className="mt-1 text-sm text-slate-500">Ejecución global de horas</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">
            {totalReal.toLocaleString("es-EC")}{" "}
            <span className="text-base font-normal text-slate-400">
              / {totalPlan.toLocaleString("es-EC")}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-500">Horas reales / planificadas</p>
        </div>
        <div className="card p-4">
          <p className={`text-2xl font-bold tracking-tight tabular-nums ${conDesviacion > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {conDesviacion}
          </p>
          <p className="mt-1 text-sm text-slate-500">Servicios con desviación</p>
        </div>
      </section>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Semáforo de ejecución:</span>
        <span className="badge bg-rose-50 text-rose-700">Subejecución &lt; 70%</span>
        <span className="badge bg-emerald-50 text-emerald-700">En rango 70–110%</span>
        <span className="badge bg-amber-50 text-amber-700">Sobreejecución &gt; 110%</span>
      </div>

      {/* Lista de servicios */}
      {error ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-400" />
          <p className="font-medium text-rose-600">No se pudo cargar la información de servicios</p>
          <p className="text-sm text-slate-400">Intenta recargar la página. Si el problema persiste, contacta a soporte.</p>
        </div>
      ) : servicios.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <HeartHandshake className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Aún no hay servicios registrados</p>
          <p className="text-sm text-slate-400">
            Cuando se registren servicios y atenciones aparecerán aquí.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {servicios.map((s) => {
            const estado = clasificar(s.porcentaje_ejecucion);
            const est = estilos[estado];
            const ancho = Math.min(Number(s.porcentaje_ejecucion), 100);
            return (
              <div key={s.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{s.nombre}</h3>
                    <p className="text-xs text-slate-400">
                      {s.area ?? "Sin área"} · {Number(s.atenciones).toLocaleString("es-EC")} atenciones
                    </p>
                  </div>
                  <span className={`badge ${est.chip}`}>
                    <est.icon className="h-3.5 w-3.5" />
                    {est.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${est.barra} transition-all`}
                      style={{ width: `${ancho}%` }}
                    />
                  </div>
                  <span className={`w-16 shrink-0 text-right text-lg font-bold ${est.texto}`}>
                    {Number(s.porcentaje_ejecucion)}%
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                  <span>
                    Planificadas:{" "}
                    <strong className="text-slate-700">
                      {Number(s.horas_planificadas).toLocaleString("es-EC")} h
                    </strong>
                  </span>
                  <span>
                    Reales:{" "}
                    <strong className="text-slate-700">
                      {Number(s.horas_reales).toLocaleString("es-EC")} h
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {totalPaginas > 1 && (
        <div className="card flex items-center justify-between px-4 py-3 text-sm text-slate-500">
          <span>Página {page} de {totalPaginas} · {totalRegistros} servicios</span>
          <div className="flex gap-2">
            <Link
              href={`?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`btn-outline ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
            <Link
              href={`?page=${page + 1}`}
              aria-disabled={page >= totalPaginas}
              className={`btn-outline ${page >= totalPaginas ? "pointer-events-none opacity-40" : ""}`}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {conDesviacion > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>{conDesviacion}</strong> servicio(s) presentan desviación respecto a la
            planificación docente. Revise la subejecución (riesgo de horas no aprovechadas) y
            la sobreejecución (riesgo de sobrecarga o subplanificación presupuestaria).
          </p>
        </div>
      )}
    </div>
  );
}
