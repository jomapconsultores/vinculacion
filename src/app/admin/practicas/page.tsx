import { createClient } from "@/lib/supabase/server";
import { GraduationCap, AlertTriangle } from "lucide-react";

type Practica = {
  id: number;
  estudiante_nombre: string | null;
  tutor: string | null;
  horas_planificadas: number;
  horas_cumplidas: number;
  estado: string | null;
  servicios: { nombre: string } | null;
};

const estadoChip = (estado: string | null) => {
  const e = (estado ?? "").toLowerCase();
  if (e === "finalizada" || e === "aprobada") return "bg-emerald-50 text-emerald-700";
  if (e === "en_curso") return "bg-blue-50 text-blue-700";
  if (e === "suspendida" || e === "reprobada") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
};

const estadoLabel = (estado: string | null) =>
  (estado ?? "sin estado").replace(/_/g, " ");

export default async function PracticasPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practicas_preprofesionales")
    .select("id, estudiante_nombre, tutor, horas_planificadas, horas_cumplidas, estado, servicios(nombre)")
    .order("estudiante_nombre", { ascending: true });
  if (error) console.error("[admin/practicas] practicas_preprofesionales:", error.message);

  const practicas: Practica[] = (data as unknown as Practica[]) ?? [];

  const totalPlan = practicas.reduce((s, p) => s + Number(p.horas_planificadas), 0);
  const totalCumpl = practicas.reduce((s, p) => s + Number(p.horas_cumplidas), 0);
  const avanceGlobal = totalPlan > 0 ? Math.round((totalCumpl / totalPlan) * 100) : 0;
  const finalizadas = practicas.filter(
    (p) => (p.estado ?? "").toLowerCase() === "finalizada",
  ).length;

  return (
    <div className="space-y-8">
      <header>
        <span className="badge bg-blue-50 text-blue-700">Pilar 3 · Prácticas preprofesionales</span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Aseguramiento de prácticas preprofesionales
        </h1>
        <p className="mt-1 max-w-3xl text-slate-500">
          Seguimiento del cumplimiento de horas de los estudiantes en los servicios
          comunitarios, con su tutor asignado y el estado de cada práctica.
        </p>
      </header>

      {/* Resumen */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-3xl font-bold text-slate-900">{practicas.length}</p>
          <p className="mt-1 text-sm text-slate-500">Prácticas activas</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-slate-900">{avanceGlobal}%</p>
          <p className="mt-1 text-sm text-slate-500">Avance global de horas</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-slate-900">
            {totalCumpl.toLocaleString("es-EC")}{" "}
            <span className="text-base font-normal text-slate-400">
              / {totalPlan.toLocaleString("es-EC")}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-500">Horas cumplidas / planificadas</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-emerald-600">{finalizadas}</p>
          <p className="mt-1 text-sm text-slate-500">Prácticas finalizadas</p>
        </div>
      </section>

      {/* Tabla */}
      {error ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-400" />
          <p className="font-medium text-rose-600">No se pudo cargar la lista de prácticas</p>
          <p className="text-sm text-slate-400">Intenta recargar la página. Si el problema persiste, contacta a soporte.</p>
        </div>
      ) : practicas.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <GraduationCap className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No hay prácticas registradas</p>
          <p className="text-sm text-slate-400">
            Las prácticas preprofesionales asignadas a los servicios aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Estudiante</th>
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Tutor</th>
                  <th className="px-4 py-3 font-medium">Cumplimiento de horas</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {practicas.map((p) => {
                  const plan = Number(p.horas_planificadas);
                  const cumpl = Number(p.horas_cumplidas);
                  const pct = plan > 0 ? Math.round((cumpl / plan) * 100) : 0;
                  const completa = pct >= 100;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.estudiante_nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.servicios?.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.tutor ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${completa ? "bg-emerald-500" : "bg-blue-600"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="whitespace-nowrap text-xs text-slate-500">
                            {cumpl}/{plan} h · {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge capitalize ${estadoChip(p.estado)}`}>
                          {estadoLabel(p.estado)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
