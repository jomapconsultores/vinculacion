import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PerfilEditor } from "@/components/PerfilEditor";
import { CursosEditor } from "@/components/CursosEditor";
import { PublicacionesEditor } from "@/components/PublicacionesEditor";
import { SenescytLive } from "@/components/SenescytLive";
import { CedulaUpload } from "@/components/CedulaUpload";
import { DocumentosPersonales } from "@/components/DocumentosPersonales";
import { BadgeCheck } from "lucide-react";

export default async function PerfilPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: exp }, { data: edu }, { data: hab }, { data: cur }, { data: pub }] = await Promise.all([
    supabase.from("experiencia_laboral").select("*").eq("profile_id", profile.id).order("fecha_inicio", { ascending: false }),
    supabase.from("educacion").select("*").eq("profile_id", profile.id),
    supabase.from("habilidades").select("*").eq("profile_id", profile.id),
    supabase.from("cursos_persona").select("*").eq("profile_id", profile.id).order("fecha", { ascending: false }),
    supabase.from("publicaciones_persona").select("*").eq("profile_id", profile.id).order("fecha", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
        <p className="mt-1 text-slate-500">Estos datos alimentan tu CV y el match con los empleos.</p>
      </div>

      {/* Identidad */}
      <section className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {[profile.nombres, profile.apellidos].filter(Boolean).join(" ") || "Sin nombre registrado"}
            </h2>
            <p className="text-slate-500">
              {profile.titulo ?? "—"}{profile.carreras?.nombre ? ` · ${profile.carreras.nombre}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Cédula {profile.cedula ?? "—"} · {profile.email}
            </p>
          </div>
          {profile.origen_padron && (
            <span className="badge bg-teal-50 text-teal-700">
              <BadgeCheck className="h-4 w-4" /> Verificado por la universidad
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {profile.origen_padron
            ? "Los datos de identidad provienen del padrón institucional y no son editables."
            : "Puedes completar tu nombre abajo, o consultarlo en SENESCYT para que se llene automáticamente."}
        </p>
      </section>

      {!profile.origen_padron && <CedulaUpload />}

      <SenescytLive cedula={profile.cedula} />

      <PerfilEditor
        profileId={profile.id}
        nombreEditable={!profile.origen_padron}
        datos={{
          nombres: profile.nombres ?? undefined,
          apellidos: profile.apellidos ?? undefined,
          telefono: profile.telefono ?? undefined,
          ciudad: profile.ciudad ?? undefined,
          linkedin: profile.linkedin ?? undefined,
          resumen_profesional: profile.resumen_profesional ?? undefined,
        }}
        experiencia={(exp as any) ?? []}
        educacion={(edu as any) ?? []}
        habilidades={(hab as any) ?? []}
      />

      <CursosEditor cursos={(cur as any) ?? []} />

      <PublicacionesEditor publicaciones={(pub as any) ?? []} />

      <DocumentosPersonales />
    </div>
  );
}
