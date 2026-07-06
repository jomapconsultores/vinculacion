import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentosAdminView } from "@/components/DocumentosAdminView";
import { RolesPersonaEditor } from "@/components/RolesPersonaEditor";
import { iniciales } from "@/lib/utils";
import { ArrowLeft, BadgeCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Muestra la etiqueta/color del rol activo de la persona. La ficha admin debe
// seguir siendo accesible (y con este método, legible) sin importar cuál sea
// ese rol: si un admin le otorgó 'empleador' a un estudiante y la persona
// activó ese rol, el admin sigue necesitando esta página para corregir la
// empresa asignada o revocar el rol.
function rolBadgeClase(rol: string) {
  switch (rol) {
    case "estudiante":
      return "bg-amber-50 text-amber-700";
    case "empleador":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function rolBadgeLabel(rol: string) {
  switch (rol) {
    case "estudiante":
      return "Estudiante";
    case "profesional":
      return "Profesional";
    case "empleador":
      return "Empleador";
    default:
      return rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : "—";
  }
}

// La consulta usa el cliente con sesión (no el de service role) para que las
// políticas RLS de profiles/documentos_personales sigan siendo la fuente de verdad.
// Sin filtro por rol: esta ficha debe seguir siendo accesible aunque el rol
// activo de la persona haya cambiado a 'empleador' (u otro) tras otorgarse
// desde aquí mismo, para poder corregir/revocar ese otorgamiento.
export default async function PersonaDetalle({ params }: { params: { id: string } }) {
  const yo = await requireModulo("personas");
  const supabase = await createClient();

  const [{ data: persona }, { data: documentos }, { data: roles }, { data: empresas }, { data: solicitudes }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nombres, apellidos, cedula, email, telefono, ciudad, titulo, rol, origen_padron, carreras(nombre)")
        .eq("id", params.id)
        .maybeSingle(),
      supabase
        .from("documentos_personales")
        .select("id, categoria, nombre_original, mime_type, tamano_bytes, fecha_documento, created_at")
        .eq("profile_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("roles_asignados")
        .select("id, rol, empresa_id, empresas(nombre)")
        .eq("profile_id", params.id)
        .order("created_at"),
      supabase.from("empresas").select("id, nombre").order("nombre"),
      supabase
        .from("solicitudes_rol")
        .select("rol")
        .eq("profile_id", params.id)
        .eq("estado", "pendiente"),
    ]);

  if (!persona) notFound();
  const p = persona as any;

  return (
    <div className="space-y-6">
      <Link href="/admin/personas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Volver a personas
      </Link>

      <section className="card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-semibold text-slate-700">
            {iniciales(p.nombres, p.apellidos)}
          </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              {p.nombres || "—"} {p.apellidos || ""}
              {p.origen_padron && <BadgeCheck className="h-5 w-5 text-teal-600" />}
              <span className={`badge ${rolBadgeClase(p.rol)}`}>{rolBadgeLabel(p.rol)}</span>
            </h1>
            <p className="text-slate-500">
              {p.titulo ?? "—"}
              {p.carreras?.nombre ? ` · ${p.carreras.nombre}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Cédula {p.cedula ?? "—"} · {p.email ?? "—"} · {p.telefono ?? "—"} · {p.ciudad ?? "—"}
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
        puedeAdministrar={yo.rol === "admin"}
      />

      <DocumentosAdminView documentos={documentos ?? []} />
    </div>
  );
}
