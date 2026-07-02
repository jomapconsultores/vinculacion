import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CandidatoAcciones } from "./CandidatoAcciones";
import { Users, Sparkles, Briefcase } from "lucide-react";

const FILTROS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "enviada", label: "Enviadas" },
  { value: "en_revision", label: "En revisión" },
  { value: "preseleccionado", label: "Preseleccionados" },
  { value: "contratado", label: "Contratados" },
  { value: "rechazado", label: "Rechazados" },
];

const estadoBadge: Record<string, string> = {
  enviada: "bg-blue-50 text-blue-700",
  en_revision: "bg-amber-50 text-amber-700",
  preseleccionado: "bg-violet-50 text-violet-700",
  rechazado: "bg-red-50 text-red-600",
  contratado: "bg-emerald-50 text-emerald-700",
  borrador: "bg-slate-100 text-slate-600",
};

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const filtro = searchParams.estado || "todos";

  // Empleos de la empresa
  const { data: empleos } = await supabase
    .from("empleos")
    .select("id, titulo")
    .eq("empresa_id", profile.empresa_id ?? -1);

  const empleoIds = (empleos ?? []).map((e: any) => e.id);
  const tituloPorEmpleo = new Map((empleos ?? []).map((e: any) => [e.id, e.titulo]));

  let lista: any[] = [];
  if (empleoIds.length) {
    let query = supabase
      .from("postulaciones")
      .select(
        "id, empleo_id, estado, match_score, created_at, profiles(nombres, apellidos, titulo, ciudad), retroalimentacion_empresa(id)"
      )
      .in("empleo_id", empleoIds)
      .order("match_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filtro !== "todos") query = query.eq("estado", filtro);

    const { data } = await query;
    lista = (data ?? []) as any[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidatos</h1>
        <p className="mt-1 text-slate-500">Todas las postulaciones a las ofertas de tu empresa.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.value}
            href={`/empleador/candidatos${f.value === "todos" ? "" : `?estado=${f.value}`}`}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              filtro === f.value
                ? "border-blue-900 bg-blue-900 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-800">Sin candidatos</p>
            <p className="text-sm text-slate-500">
              {empleoIds.length === 0
                ? "Publica una oferta para empezar a recibir postulaciones."
                : "No hay postulaciones con este filtro."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => {
            const prof = p.profiles;
            const tieneRetro = (p.retroalimentacion_empresa ?? []).length > 0;
            return (
              <div key={p.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {prof?.nombres} {prof?.apellidos}
                    </p>
                    <p className="text-sm text-slate-500">
                      {prof?.titulo}
                      {prof?.ciudad ? ` · ${prof.ciudad}` : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Briefcase className="h-3.5 w-3.5" />
                      <Link href={`/empleador/empleos/${p.empleo_id}`} className="hover:underline">
                        {tituloPorEmpleo.get(p.empleo_id) ?? "Oferta"}
                      </Link>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.match_score != null && (
                      <span className="flex items-center gap-1 text-sm font-bold text-teal-700">
                        <Sparkles className="h-3.5 w-3.5" /> {p.match_score}
                      </span>
                    )}
                    <span className={`badge capitalize ${estadoBadge[p.estado] ?? "bg-slate-100 text-slate-600"}`}>
                      {String(p.estado).replace("_", " ")}
                    </span>
                  </div>
                </div>

                <CandidatoAcciones
                  postulacionId={p.id}
                  estadoActual={p.estado}
                  tieneRetro={tieneRetro}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
