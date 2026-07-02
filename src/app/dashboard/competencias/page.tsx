import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Award, BadgeCheck, Clock, CircleDashed } from "lucide-react";
import Link from "next/link";

export default async function CompetenciasPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: comps } = await supabase
    .from("competencias_graduado")
    .select("estado, avalada_por, fecha_aval, competencias(nombre, area)")
    .eq("profile_id", profile.id);

  const avaladas = (comps ?? []).filter((c: any) => c.estado === "avalada");
  const otras = (comps ?? []).filter((c: any) => c.estado !== "avalada");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis competencias</h1>
        <p className="mt-1 text-slate-500">
          Las competencias <b>avaladas por la universidad</b> te habilitan para postular a empleos.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <BadgeCheck className="h-5 w-5 text-teal-600" /> Avaladas por la universidad
        </h2>
        {avaladas.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Aún no tienes competencias avaladas.{" "}
            <Link href="/dashboard/cursos" className="font-medium text-blue-700">Explora la educación continua</Link> para conseguirlas.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {avaladas.map((c: any, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <Award className="mt-0.5 h-5 w-5 text-teal-600" />
                <div>
                  <p className="font-medium text-teal-900">{c.competencias?.nombre}</p>
                  <p className="text-xs text-teal-700">{c.avalada_por}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {otras.length > 0 && (
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <CircleDashed className="h-5 w-5 text-slate-400" /> Autodeclaradas / en curso
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {otras.map((c: any, i: number) => (
              <span key={i} className="badge bg-slate-100 text-slate-600">
                {c.estado === "en_curso" ? <Clock className="h-3.5 w-3.5" /> : null}
                {c.competencias?.nombre}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
