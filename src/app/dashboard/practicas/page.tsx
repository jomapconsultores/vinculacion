import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GraduationCap, User, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const estadoBadge: Record<string, string> = {
  en_curso: "bg-amber-50 text-amber-700",
  finalizada: "bg-teal-50 text-teal-700",
  aprobada: "bg-teal-50 text-teal-700",
  suspendida: "bg-red-50 text-red-600",
};

export default async function PracticasPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: practicas, error } = await supabase
    .from("practicas_preprofesionales")
    .select("id, horas_planificadas, horas_cumplidas, tutor, estado, servicios(nombre, area)")
    .eq("profile_id", profile.id)
    .order("id", { ascending: true });
  if (error) console.error("[dashboard/practicas] practicas_preprofesionales:", error.message);

  const lista = (practicas ?? []) as any[];
  const totalPlan = lista.reduce((a, p) => a + (p.horas_planificadas || 0), 0);
  const totalCump = lista.reduce((a, p) => a + (p.horas_cumplidas || 0), 0);
  const avanceGlobal = totalPlan ? Math.round((totalCump / totalPlan) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis prácticas preprofesionales</h1>
        <p className="mt-1 text-slate-500">
          Seguimiento de tus horas, tutorías y cumplimiento en los servicios de la universidad.
        </p>
      </div>

      {error ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center text-red-500">
          <AlertTriangle className="h-10 w-10" />
          <p>No se pudo cargar tu información de prácticas. Recarga la página o intenta más tarde.</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center text-slate-400">
          <GraduationCap className="h-10 w-10" />
          <p>Aún no tienes prácticas asignadas. Cuando te asignen a un servicio, aparecerán aquí.</p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm text-slate-500">Prácticas</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{lista.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Horas cumplidas</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{totalCump}<span className="text-base font-normal text-slate-400"> / {totalPlan}</span></p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Avance global</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{avanceGlobal}%</p>
            </div>
          </div>

          {/* Lista */}
          <div className="space-y-3">
            {lista.map((p) => {
              const pct = p.horas_planificadas ? Math.min(100, Math.round((p.horas_cumplidas / p.horas_planificadas) * 100)) : 0;
              return (
                <div key={p.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{p.servicios?.nombre ?? "Servicio"}</h3>
                      {p.servicios?.area && <p className="text-xs text-slate-400">{p.servicios.area}</p>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        {p.tutor && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Tutor: {p.tutor}</span>}
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.horas_cumplidas}/{p.horas_planificadas} h</span>
                      </div>
                    </div>
                    <span className={`badge capitalize ${estadoBadge[p.estado] ?? "bg-slate-100 text-slate-600"}`}>
                      {String(p.estado).replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>Cumplimiento de horas</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${pct >= 100 ? "bg-teal-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {pct >= 100 && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-teal-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Horas completadas
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
