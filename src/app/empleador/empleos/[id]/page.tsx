import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RankingButton } from "./RankingButton";
import { candidatosSugeridos } from "@/lib/recomendar";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  UserPlus,
} from "lucide-react";

const estadoPostBadge: Record<string, string> = {
  enviada: "bg-blue-50 text-blue-700",
  en_revision: "bg-amber-50 text-amber-700",
  preseleccionado: "bg-violet-50 text-violet-700",
  rechazado: "bg-red-50 text-red-600",
  contratado: "bg-emerald-50 text-emerald-700",
  borrador: "bg-slate-100 text-slate-600",
};

export default async function EmpleoDetallePage({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const empleoId = Number(params.id);
  if (!Number.isFinite(empleoId)) notFound();

  const { data: empleo } = await supabase
    .from("empleos")
    .select(
      "id, empresa_id, titulo, descripcion, ciudad, modalidad, salario_min, salario_max, estado, empleo_competencias(requerida, competencias(nombre))"
    )
    .eq("id", empleoId)
    .maybeSingle();

  // Verificar propiedad
  if (!empleo || (empleo as any).empresa_id !== profile.empresa_id) notFound();
  const e = empleo as any;

  const { data: postulaciones } = await supabase
    .from("postulaciones")
    .select(
      "id, estado, match_score, ia_analisis, profiles(id, nombres, apellidos, titulo, ciudad, resumen_profesional)"
    )
    .eq("empleo_id", empleoId)
    .order("match_score", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true });

  const lista = (postulaciones ?? []) as any[];
  const requeridas: string[] = (e.empleo_competencias ?? [])
    .map((ec: any) => ec.competencias?.nombre)
    .filter(Boolean);

  const sugeridos = await candidatosSugeridos(supabase, empleoId, 5);

  return (
    <div className="space-y-6">
      <Link href="/empleador/empleos" className="btn-ghost -ml-2 w-fit text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Volver a mis ofertas
      </Link>

      {/* Encabezado de la oferta */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{e.titulo}</h1>
              <span className={`badge capitalize ${estadoPostBadge[e.estado] ?? "bg-slate-100 text-slate-600"}`}>
                {e.estado}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {e.ciudad && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {e.ciudad}
                </span>
              )}
              {e.modalidad && <span className="capitalize">{e.modalidad}</span>}
              {(e.salario_min || e.salario_max) && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {e.salario_min ?? "?"} – {e.salario_max ?? "?"}
                </span>
              )}
            </div>
          </div>
        </div>

        {e.descripcion && <p className="mt-4 whitespace-pre-line text-sm text-slate-600">{e.descripcion}</p>}

        {requeridas.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Competencias requeridas
            </p>
            <div className="flex flex-wrap gap-2">
              {requeridas.map((r) => (
                <span key={r} className="badge bg-slate-100 text-slate-700">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Candidatos */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Users className="h-5 w-5 text-slate-400" />
          Candidatos ({lista.length})
        </h2>
        {lista.length > 0 && <RankingButton empleoId={empleoId} />}
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-800">Todavía no hay postulantes</p>
            <p className="text-sm text-slate-500">
              Cuando los graduados postulen, aquí verás su ranking de compatibilidad.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((p, i) => {
            const ia = p.ia_analisis ?? null;
            const prof = p.profiles;
            return (
              <div key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {prof?.nombres} {prof?.apellidos}
                      </p>
                      <p className="text-sm text-slate-500">
                        {prof?.titulo}
                        {prof?.ciudad ? ` · ${prof.ciudad}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.match_score != null ? (
                      <span className="flex items-center gap-1 text-lg font-bold text-teal-700">
                        <Sparkles className="h-4 w-4" /> {p.match_score}
                        <span className="text-sm font-normal text-slate-400">/100</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Sin rankear</span>
                    )}
                    <span className={`badge capitalize ${estadoPostBadge[p.estado] ?? "bg-slate-100 text-slate-600"}`}>
                      {String(p.estado).replace("_", " ")}
                    </span>
                  </div>
                </div>

                {prof?.resumen_profesional && (
                  <p className="mt-3 text-sm text-slate-600">{prof.resumen_profesional}</p>
                )}

                {ia && (
                  <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                    {Array.isArray(ia.fortalezas) && ia.fortalezas.length > 0 && (
                      <div>
                        <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Fortalezas
                        </p>
                        <ul className="space-y-0.5 text-sm text-slate-600">
                          {ia.fortalezas.map((f: string, k: number) => (
                            <li key={k}>· {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(ia.brechas) && ia.brechas.length > 0 && (
                      <div>
                        <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5" /> Brechas
                        </p>
                        <ul className="space-y-0.5 text-sm text-slate-600">
                          {ia.brechas.map((b: string, k: number) => (
                            <li key={k}>· {b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ia.recomendacion && (
                      <div className="sm:col-span-2">
                        <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-blue-700">
                          <ThumbsUp className="h-3.5 w-3.5" /> Recomendación
                        </p>
                        <p className="text-sm text-slate-600">{ia.recomendacion}</p>
                      </div>
                    )}
                    {ia.fuente === "heuristico" && (
                      <p className="text-xs italic text-slate-400 sm:col-span-2">
                        Ranking heurístico (IA no configurada).
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Candidatos sugeridos por IA (no han postulado) */}
      {sugeridos.length > 0 && (
        <section className="card border-teal-200 bg-teal-50/40 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-teal-800">
            <UserPlus className="h-5 w-5" /> Candidatos sugeridos
          </h2>
          <p className="mt-0.5 text-sm text-teal-700">
            Graduados con competencias avaladas que encajan con esta oferta y aún no han postulado.
          </p>
          <div className="mt-3 space-y-2">
            {sugeridos.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-teal-200 bg-white p-3">
                <div>
                  <p className="font-medium text-slate-800">{c.nombre}</p>
                  <p className="text-xs text-slate-500">{c.carrera ?? ""}</p>
                </div>
                <div className="text-right">
                  <span className="badge bg-teal-600 text-white">{c.score}% afinidad</span>
                  <p className="mt-0.5 text-xs text-slate-400">{c.cubiertas}/{c.requeridas} competencias</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
