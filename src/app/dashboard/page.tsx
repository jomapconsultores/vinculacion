import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CheckCircle2,
  Circle,
  FileText,
  Briefcase,
  Award,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

export default async function DashboardHome() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ count: expCount }, { data: cv }, { count: postCount }, { data: comps }] =
    await Promise.all([
      supabase.from("experiencia_laboral").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
      supabase.from("cvs").select("id, generado_ia").eq("profile_id", profile.id).maybeSingle(),
      supabase.from("postulaciones").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
      supabase.from("competencias_graduado").select("estado").eq("profile_id", profile.id),
    ]);

  const avaladas = (comps ?? []).filter((c) => c.estado === "avalada").length;

  const pasos = [
    { ok: profile.origen_padron || !!profile.nombres, label: "Identidad verificada", href: "/dashboard/perfil" },
    { ok: (expCount ?? 0) > 0, label: "Agregar experiencia profesional", href: "/dashboard/perfil" },
    { ok: !!cv?.generado_ia, label: "Generar tu CV con IA", href: "/dashboard/cv" },
    { ok: (postCount ?? 0) > 0, label: "Postular a un empleo", href: "/dashboard/empleos" },
  ];
  const completados = pasos.filter((p) => p.ok).length;
  const progreso = Math.round((completados / pasos.length) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hola, {profile.nombres?.split(" ")[0] ?? "graduado"} 👋
        </h1>
        <p className="mt-1 text-slate-500">
          {profile.origen_padron ? (
            <span className="inline-flex items-center gap-1 text-teal-700">
              <BadgeCheck className="h-4 w-4" /> Graduado verificado
              {profile.carreras?.nombre ? ` · ${profile.carreras.nombre}` : ""}
              {profile.anio_graduacion ? ` (${profile.anio_graduacion})` : ""}
            </span>
          ) : (
            "Completa tu perfil para aprovechar la plataforma."
          )}
        </p>
      </div>

      {/* Progreso */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Tu ruta al empleo</h2>
          <span className="text-sm font-medium text-slate-500">{progreso}% completado</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progreso}%` }} />
        </div>
        <ul className="mt-5 space-y-2">
          {pasos.map((p) => (
            <li key={p.label}>
              <Link href={p.href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                {p.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300" />
                )}
                <span className={p.ok ? "text-slate-500 line-through" : "font-medium text-slate-700"}>
                  {p.label}
                </span>
                {!p.ok && <ArrowRight className="ml-auto h-4 w-4 text-slate-300" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/cv" className="card group p-5 transition hover:shadow-md">
          <FileText className="h-7 w-7 text-blue-700" />
          <h3 className="mt-3 font-semibold text-slate-900">Mi CV inteligente</h3>
          <p className="mt-1 text-sm text-slate-500">Genera y mejora tu hoja de vida con IA.</p>
        </Link>
        <Link href="/dashboard/empleos" className="card group p-5 transition hover:shadow-md">
          <Briefcase className="h-7 w-7 text-teal-600" />
          <h3 className="mt-3 font-semibold text-slate-900">Bolsa de empleo</h3>
          <p className="mt-1 text-sm text-slate-500">Postula y revisa tu match de competencias.</p>
        </Link>
        <Link href="/dashboard/competencias" className="card group p-5 transition hover:shadow-md">
          <Award className="h-7 w-7 text-violet-600" />
          <h3 className="mt-3 font-semibold text-slate-900">Competencias</h3>
          <p className="mt-1 text-sm text-slate-500">
            {avaladas > 0 ? `${avaladas} avaladas por la universidad.` : "Consigue avales de la universidad."}
          </p>
        </Link>
      </div>
    </div>
  );
}
