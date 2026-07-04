import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentosAdminView } from "@/components/DocumentosAdminView";
import { iniciales } from "@/lib/utils";
import { ArrowLeft, BadgeCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Solo llega aquí admin o autoridad aprobada: lo garantiza src/app/admin/layout.tsx.
// La consulta usa el cliente con sesión (no el de service role) para que las
// políticas RLS de profiles/documentos_personales sigan siendo la fuente de verdad.
export default async function PersonaDetalle({ params }: { params: { id: string } }) {
  await requireProfile();
  const supabase = await createClient();

  const [{ data: persona }, { data: documentos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombres, apellidos, cedula, email, telefono, ciudad, titulo, origen_padron, carreras(nombre)")
      .eq("id", params.id)
      .eq("rol", "profesional")
      .maybeSingle(),
    supabase
      .from("documentos_personales")
      .select("id, categoria, nombre_original, mime_type, tamano_bytes, created_at")
      .eq("profile_id", params.id)
      .order("created_at", { ascending: false }),
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

      <DocumentosAdminView documentos={documentos ?? []} />
    </div>
  );
}
