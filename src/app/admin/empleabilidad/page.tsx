import { createClient } from "@/lib/supabase/server";
import { requireModulo } from "@/lib/auth";
import {
  Download,
  FileSpreadsheet,
  GraduationCap,
  Users,
  BadgeCheck,
  Award,
  TrendingUp,
  Target,
  Inbox,
} from "lucide-react";

type EmpleabilidadCarrera = {
  id: number | string;
  carrera: string;
  facultad: string | null;
  graduados: number;
  postulantes: number;
  contratados: number;
  competencias_avaladas: number;
};

type BrechaCompetencia = {
  id: number | string;
  competencia: string;
  area: string | null;
  empleos_que_la_piden: number;
  graduados_con_aval: number;
};

function colorInsercion(tasa: number) {
  if (tasa >= 50) return { barra: "bg-emerald-500", texto: "text-emerald-700" };
  if (tasa >= 20) return { barra: "bg-amber-500", texto: "text-amber-700" };
  return { barra: "bg-rose-500", texto: "text-rose-700" };
}

export default async function EmpleabilidadPage() {
  await requireModulo("empleabilidad");

  const supabase = await createClient();

  const [{ data: carrerasData }, { data: brechasData }] = await Promise.all([
    supabase
      .from("v_empleabilidad_carrera")
      .select("*")
      .order("graduados", { ascending: false }),
    supabase
      .from("v_brechas_competencias")
      .select("*")
      .order("empleos_que_la_piden", { ascending: false })
      .limit(8),
  ]);

  const carreras: EmpleabilidadCarrera[] = (carrerasData as EmpleabilidadCarrera[]) ?? [];
  const brechas: BrechaCompetencia[] = (brechasData as BrechaCompetencia[]) ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge bg-blue-50 text-blue-700">Pilar 4 - Acreditación</span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Empleabilidad por carrera
          </h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Indicadores auditables de inserción laboral y brechas de competencias, base de
            evidencia para los procesos de acreditación institucional (Pilar 4).
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href="/api/admin/informe-excel" className="btn-outline">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </a>
          <a href="/api/admin/informe" className="btn-primary">
            <Download className="h-4 w-4" />
            Informe (PDF)
          </a>
        </div>
      </header>

      {/* Empleabilidad por carrera */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Inserción laboral por carrera
          </h2>
          <p className="text-sm text-slate-500">
            Tasa de inserción = contratados / graduados. Verde &ge;50%, ambar 20-49%, rojo
            &lt;20%.
          </p>
        </div>

        {carreras.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Inbox className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-700">Sin datos de empleabilidad</p>
            <p className="text-sm text-slate-500">
              Aun no hay carreras con indicadores registrados.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Carrera</th>
                    <th className="px-4 py-3 text-center font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        Graduados
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Postulantes
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <BadgeCheck className="h-4 w-4" />
                        Contratados
                      </span>
                    </th>
                    <th className="px-4 py-3 font-semibold">Tasa de insercion</th>
                    <th className="px-4 py-3 text-center font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        Competencias
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carreras.map((c) => {
                    const tieneGraduados = (c.graduados ?? 0) > 0;
                    const tasa = tieneGraduados
                      ? Math.round((c.contratados / c.graduados) * 100)
                      : 0;
                    const col = colorInsercion(tasa);
                    return (
                      <tr key={c.id} className="transition-colors hover:bg-blue-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{c.carrera}</p>
                          {c.facultad && (
                            <p className="text-xs text-slate-500">{c.facultad}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                          {c.graduados}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                          {c.postulantes}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                          {c.contratados}
                        </td>
                        <td className="px-4 py-3">
                          {tieneGraduados ? (
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${col.barra}`}
                                  style={{ width: `${Math.min(tasa, 100)}%` }}
                                />
                              </div>
                              <span
                                className={`w-10 text-right text-xs font-semibold tabular-nums ${col.texto}`}
                              >
                                {tasa}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                          {c.competencias_avaladas}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Brechas de competencias */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Target className="h-5 w-5 text-teal-600" />
            Brechas de competencias mas demandadas
          </h2>
          <p className="text-sm text-slate-500">
            Competencias con mayor demanda de los empleadores frente a la oferta de
            graduados avalados. La brecha senala prioridades de formacion.
          </p>
        </div>

        {brechas.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Inbox className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-700">Sin brechas registradas</p>
            <p className="text-sm text-slate-500">
              Aun no hay competencias demandadas registradas.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {brechas.map((b) => {
              const brecha = b.empleos_que_la_piden - b.graduados_con_aval;
              const positiva = brecha > 0;
              return (
                <div key={b.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{b.competencia}</p>
                      {b.area && (
                        <span className="badge mt-1 bg-slate-100 text-slate-600">
                          {b.area}
                        </span>
                      )}
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        positiva
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <TrendingUp className="h-3 w-3" />
                      Brecha {positiva ? "+" : ""}
                      {brecha}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-2xl font-bold tabular-nums text-blue-900">
                        {b.empleos_que_la_piden}
                      </p>
                      <p className="text-xs text-slate-500">Empleos que la piden</p>
                    </div>
                    <div className="rounded-lg bg-teal-50 p-3">
                      <p className="text-2xl font-bold tabular-nums text-teal-700">
                        {b.graduados_con_aval}
                      </p>
                      <p className="text-xs text-slate-500">Graduados con aval</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
