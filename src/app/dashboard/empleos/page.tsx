import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Briefcase, MapPin, DollarSign, ArrowRight, BadgeCheck } from "lucide-react";

export default async function EmpleosPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: empleos } = await supabase
    .from("empleos")
    .select("id, titulo, ciudad, modalidad, salario_min, salario_max, empresas(nombre, validada), empleo_competencias(competencias(nombre))")
    .eq("estado", "publicado")
    .order("created_at", { ascending: false });

  const { data: misPost } = await supabase
    .from("postulaciones").select("empleo_id, estado, match_score").eq("profile_id", profile.id);
  const postByEmpleo = new Map((misPost ?? []).map((p: any) => [p.empleo_id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bolsa de empleo</h1>
        <p className="mt-1 text-slate-500">Ofertas de empresas validadas por la universidad.</p>
      </div>

      <div className="space-y-4">
        {(empleos ?? []).length === 0 && (
          <div className="card p-10 text-center text-slate-400">No hay ofertas publicadas por ahora.</div>
        )}
        {(empleos ?? []).map((e: any) => {
          const post = postByEmpleo.get(e.id);
          return (
            <Link key={e.id} href={`/dashboard/empleos/${e.id}`} className="card block p-6 transition hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{e.titulo}</h3>
                    {e.empresas?.validada && (
                      <BadgeCheck className="h-4 w-4 text-teal-600" aria-label="Empresa validada" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{e.empresas?.nombre}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    {e.ciudad && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.ciudad}</span>}
                    {e.modalidad && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {e.modalidad}</span>}
                    {e.salario_min && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {e.salario_min}–{e.salario_max}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {e.empleo_competencias?.slice(0, 4).map((ec: any, i: number) => (
                      <span key={i} className="badge bg-slate-100 text-slate-600">{ec.competencias?.nombre}</span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {post ? (
                    <span className="badge bg-blue-50 text-blue-700">
                      {post.match_score != null ? `Match ${post.match_score}%` : "Postulado"}
                    </span>
                  ) : (
                    <ArrowRight className="h-5 w-5 text-slate-300" />
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
