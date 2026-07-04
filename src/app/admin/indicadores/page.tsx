import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Award, Send, HeartHandshake, ShieldCheck } from "lucide-react";

type Indicadores = {
  total_graduados: number;
  contratados: number;
  competencias_avaladas: number;
  postulaciones_totales: number;
};

type ServicioEjecucion = { porcentaje_ejecucion: number };

const ESTADOS: { key: string; label: string; color: string }[] = [
  { key: "borrador", label: "Borrador", color: "bg-slate-400" },
  { key: "enviada", label: "Enviada", color: "bg-blue-500" },
  { key: "en_revision", label: "En revisión", color: "bg-cyan-500" },
  { key: "preseleccionado", label: "Preseleccionado", color: "bg-violet-500" },
  { key: "contratado", label: "Contratado", color: "bg-emerald-500" },
  { key: "rechazado", label: "Rechazado", color: "bg-rose-500" },
];

export default async function IndicadoresPage() {
  const supabase = await createClient();

  const [{ data: ind }, { data: dist }, { data: serv }] = await Promise.all([
    supabase.from("v_indicadores_globales").select("*").single(),
    supabase.from("v_postulaciones_por_estado").select("estado, cantidad"),
    supabase.from("v_servicio_ejecucion").select("porcentaje_ejecucion"),
  ]);

  const indicadores: Indicadores = (ind as Indicadores) ?? {
    total_graduados: 0,
    contratados: 0,
    competencias_avaladas: 0,
    postulaciones_totales: 0,
  };

  // Distribución por estado ya agregada en SQL (v_postulaciones_por_estado,
  // ver 0020_vistas_postulaciones.sql) en vez de traer una fila por
  // postulación y contarlas en JS.
  const cantidadPorEstado = new Map(
    ((dist as { estado: string; cantidad: number }[]) ?? []).map((d) => [d.estado, d.cantidad]),
  );
  const totalPost = [...cantidadPorEstado.values()].reduce((a, n) => a + n, 0);
  const distribucion = ESTADOS.map((e) => ({
    ...e,
    n: cantidadPorEstado.get(e.key) ?? 0,
  }));

  const servicios = (serv as ServicioEjecucion[]) ?? [];
  const ejecucionPromedio =
    servicios.length > 0
      ? Math.round(
          servicios.reduce((s, x) => s + Number(x.porcentaje_ejecucion), 0) /
            servicios.length,
        )
      : 0;

  const tasaInsercion =
    indicadores.total_graduados > 0
      ? Math.round((indicadores.contratados / indicadores.total_graduados) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <header>
        <span className="badge bg-violet-50 text-violet-700">Pilar 4 · Acreditación</span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Consolidación de indicadores de acreditación
        </h1>
        <p className="mt-1 max-w-3xl text-slate-500">
          Indicadores clave del proceso de vinculación con la sociedad, calculados en tiempo
          real sobre la base de datos institucional.
        </p>
      </header>

      {/* Indicadores destacados */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{tasaInsercion}%</p>
          <p className="mt-1 text-sm text-slate-500">Tasa de inserción laboral</p>
          <p className="mt-1 text-xs text-slate-400">
            {indicadores.contratados} contratados de {indicadores.total_graduados} graduados
          </p>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Award className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {indicadores.competencias_avaladas}
          </p>
          <p className="mt-1 text-sm text-slate-500">Competencias avaladas</p>
          <p className="mt-1 text-xs text-slate-400">Certificadas por la universidad</p>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <Send className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalPost}</p>
          <p className="mt-1 text-sm text-slate-500">Postulaciones registradas</p>
          <p className="mt-1 text-xs text-slate-400">Actividad de inserción laboral</p>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{ejecucionPromedio}%</p>
          <p className="mt-1 text-sm text-slate-500">Ejecución promedio de servicios</p>
          <p className="mt-1 text-xs text-slate-400">
            Promedio de {servicios.length} servicios
          </p>
        </div>
      </section>

      {/* Distribución de postulaciones por estado */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Distribución de postulaciones por estado
        </h2>
        <p className="text-sm text-slate-500">
          Estado del embudo de inserción laboral de los graduados.
        </p>

        {totalPost === 0 ? (
          <p className="mt-6 text-sm text-slate-400">
            Aún no hay postulaciones registradas.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {distribucion.map((d) => {
              const pct = totalPost > 0 ? Math.round((d.n / totalPost) * 100) : 0;
              return (
                <div key={d.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{d.label}</span>
                    <span className="text-slate-500">
                      {d.n} <span className="text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${d.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Nota de auditoría */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
        <p>
          Todos estos indicadores se calculan directamente sobre los registros operativos de
          la plataforma (graduados, postulaciones, competencias avaladas y ejecución de
          servicios), sin cargas manuales intermedias. Son{" "}
          <strong>trazables y auditables</strong> para los procesos de acreditación
          institucional y de carreras.
        </p>
      </div>
    </div>
  );
}
