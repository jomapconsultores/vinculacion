import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Briefcase, Plus, MapPin, Users } from "lucide-react";

const estadoBadge: Record<string, string> = {
  publicado: "bg-emerald-50 text-emerald-700",
  borrador: "bg-slate-100 text-slate-600",
  cerrado: "bg-red-50 text-red-600",
};

export default async function EmpleosPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: empleos } = await supabase
    .from("empleos")
    .select("id, titulo, ciudad, modalidad, estado, created_at, postulaciones(count)")
    .eq("empresa_id", profile.empresa_id ?? -1)
    .order("created_at", { ascending: false });

  const lista = (empleos ?? []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis ofertas</h1>
          <p className="mt-1 text-slate-500">Gestiona las vacantes de tu empresa.</p>
        </div>
        <Link href="/empleador/empleos/nueva" className="btn-primary">
          <Plus className="h-4 w-4" /> Publicar oferta
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-800">Aún no tienes ofertas</p>
            <p className="text-sm text-slate-500">Publica tu primera vacante para empezar a recibir candidatos.</p>
          </div>
          <Link href="/empleador/empleos/nueva" className="btn-primary mt-2">
            <Plus className="h-4 w-4" /> Publicar oferta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((e) => {
            const n = e.postulaciones?.[0]?.count ?? 0;
            return (
              <Link
                key={e.id}
                href={`/empleador/empleos/${e.id}`}
                className="card card-hover flex items-center justify-between p-5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">{e.titulo}</h3>
                    <span className={`badge capitalize ${estadoBadge[e.estado] ?? "bg-slate-100 text-slate-600"}`}>
                      {e.estado}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                    {e.ciudad && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {e.ciudad}
                      </span>
                    )}
                    {e.modalidad && <span className="capitalize">{e.modalidad}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" />
                  {n} {n === 1 ? "postulante" : "postulantes"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
