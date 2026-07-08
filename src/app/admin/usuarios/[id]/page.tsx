import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RolesPersonaEditor } from "@/components/RolesPersonaEditor";
import { AutoridadModulos } from "@/components/AutoridadModulos";
import { iniciales } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const ROL_LABEL: Record<string, string> = {
  estudiante: "Estudiante",
  profesional: "Profesional",
  empleador: "Empleador",
  autoridad: "Autoridad",
  admin: "Administrador",
};

const ROL_BADGE: Record<string, string> = {
  estudiante: "bg-amber-50 text-amber-700",
  profesional: "bg-blue-50 text-blue-700",
  empleador: "bg-emerald-50 text-emerald-700",
  autoridad: "bg-purple-50 text-purple-700",
  admin: "bg-slate-800 text-white",
};

// Ficha central de Administración: reúne el otorgamiento/revocación de
// roles (RolesPersonaEditor) y, si la cuenta es autoridad, sus permisos de
// módulo (AutoridadModulos) — para cualquier usuario, no solo
// estudiante/profesional (/admin/personas) o autoridad (/admin/autoridades).
export default async function UsuarioDetalle({ params }: { params: { id: string } }) {
  const yo = await requireProfile();
  if (yo.rol !== "admin") redirect("/admin");

  const supabase = await createClient();

  const [{ data: persona }, { data: roles }, { data: empresas }, { data: solicitudes }, { data: permisos }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nombres, apellidos, cedula, email, telefono, rol, aprobado")
        .eq("id", params.id)
        .maybeSingle(),
      supabase
        .from("roles_asignados")
        .select("id, rol, empresa_id, empresas(nombre)")
        .eq("profile_id", params.id)
        .order("created_at"),
      supabase.from("empresas").select("id, nombre").order("nombre"),
      supabase.from("solicitudes_rol").select("rol").eq("profile_id", params.id).eq("estado", "pendiente"),
      supabase.from("permisos_modulo").select("modulo").eq("profile_id", params.id),
    ]);

  if (!persona) notFound();
  const p = persona as any;

  return (
    <div className="space-y-6">
      <Link href="/admin/usuarios" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Volver a usuarios
      </Link>

      <section className="card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-base font-semibold text-blue-900 ring-1 ring-inset ring-blue-100">
            {iniciales(p.nombres, p.apellidos)}
          </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              {p.nombres || "—"} {p.apellidos || ""}
              <span className={`badge ${ROL_BADGE[p.rol] ?? "bg-slate-100 text-slate-600"}`}>
                {ROL_LABEL[p.rol] ?? p.rol}
              </span>
              {p.rol === "autoridad" && !p.aprobado && (
                <span className="badge bg-amber-50 text-amber-700">Pendiente de aprobación</span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Cédula {p.cedula ?? "—"} · {p.email ?? "—"} · {p.telefono ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <RolesPersonaEditor
        profileId={p.id}
        rolActual={p.rol}
        rolesAsignados={(roles ?? []) as any}
        empresasDisponibles={empresas ?? []}
        solicitudesPendientes={solicitudes ?? []}
        puedeAdministrar
      />

      {p.rol === "autoridad" && (
        <AutoridadModulos
          autoridadId={p.id}
          nombre={`${p.nombres || "—"} ${p.apellidos || ""}`.trim()}
          modulosActuales={(permisos ?? []).map((m: any) => m.modulo)}
          aprobado={p.aprobado}
        />
      )}
    </div>
  );
}
