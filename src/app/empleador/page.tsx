import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Briefcase, Users, CheckCircle2, AlertTriangle, Plus, ArrowRight } from "lucide-react";

export default async function EmpleadorInicio() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Datos de la empresa (RLS solo deja leer empresas validadas, así que usamos admin
  // acotado a la empresa del propio empleador).
  let empresa: { nombre: string; validada: boolean } | null = null;
  if (profile.empresa_id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("empresas")
      .select("nombre, validada")
      .eq("id", profile.empresa_id)
      .maybeSingle();
    empresa = (data as any) ?? null;
  }

  // Ofertas de la empresa
  const { data: empleos } = await supabase
    .from("empleos")
    .select("id, estado")
    .eq("empresa_id", profile.empresa_id ?? -1);

  const empleoIds = (empleos ?? []).map((e: any) => e.id);
  const ofertasActivas = (empleos ?? []).filter((e: any) => e.estado === "publicado").length;

  let totalPostulaciones = 0;
  let contratados = 0;
  if (empleoIds.length) {
    const { count: pc } = await supabase
      .from("postulaciones")
      .select("id", { count: "exact", head: true })
      .in("empleo_id", empleoIds);
    totalPostulaciones = pc ?? 0;

    const { count: cc } = await supabase
      .from("postulaciones")
      .select("id", { count: "exact", head: true })
      .in("empleo_id", empleoIds)
      .eq("estado", "contratado");
    contratados = cc ?? 0;
  }

  const stats = [
    { label: "Ofertas activas", value: ofertasActivas, icon: Briefcase, color: "bg-blue-50 text-blue-700" },
    { label: "Postulaciones", value: totalPostulaciones, icon: Users, color: "bg-teal-50 text-teal-700" },
    { label: "Contratados", value: contratados, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hola, {empresa?.nombre ?? profile.nombres ?? "empleador"}
        </h1>
        <p className="mt-1 text-slate-500">Resumen de tu actividad de reclutamiento.</p>
      </div>

      {empresa && !empresa.validada && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Tu empresa aún no está validada</p>
            <p className="text-sm text-amber-700">
              Puedes crear ofertas, pero la universidad debe validar tu empresa para darle mayor
              visibilidad. Completa los datos en{" "}
              <Link href="/empleador/empresa" className="font-medium underline">
                Mi empresa
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card card-hover p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">{s.value}</p>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">¿Buscas talento?</h2>
          <p className="text-sm text-slate-500">
            Publica una oferta y deja que la IA rankee a los candidatos según tu perfil.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/empleador/empleos" className="btn-outline">
            Ver ofertas <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/empleador/empleos/nueva" className="btn-primary">
            <Plus className="h-4 w-4" /> Publicar oferta
          </Link>
        </div>
      </div>
    </div>
  );
}
