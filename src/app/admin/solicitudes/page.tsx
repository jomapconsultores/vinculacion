import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AprobarBtn } from "./AprobarBtn";
import { SolicitudRolBtn } from "./SolicitudRolBtn";
import { UserCheck, ShieldQuestion, Inbox } from "lucide-react";
import { iniciales } from "@/lib/utils";
import { BotonesReporte } from "@/components/BotonesReporte";

export const dynamic = "force-dynamic";

const ROL_LABEL: Record<string, string> = { autoridad: "Autoridad", admin: "Administrador" };

export default async function SolicitudesPage() {
  const profile = await requireProfile();
  if (profile.rol !== "admin") redirect("/admin");

  const admin = createAdminClient();
  const [{ data: pendientes }, { data: solicitudesRol }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nombres, apellidos, email, created_at")
      .eq("rol", "autoridad")
      .eq("aprobado", false)
      .is("rechazado_en", null)
      .order("created_at", { ascending: true }),
    admin
      .from("solicitudes_rol")
      .select("id, rol, creado_en, profiles!solicitudes_rol_profile_id_fkey(id, nombres, apellidos, email)")
      .eq("estado", "pendiente")
      .order("creado_en", { ascending: true }),
  ]);

  const lista = pendientes ?? [];
  const listaRol = (solicitudesRol ?? []) as any[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <UserCheck className="h-6 w-6 text-blue-700" /> Solicitudes
          </h1>
          <p className="mt-1 text-slate-500">
            Aprueba o rechaza el acceso de las cuentas nuevas y el otorgamiento de roles de autoridad/administrador.
          </p>
        </div>
        <BotonesReporte base="/api/admin/solicitudes-reporte" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Cuentas de autoridad nuevas</h2>
        {lista.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p>No hay solicitudes pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((p: any) => (
              <div key={p.id} className="card flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-900 ring-1 ring-inset ring-blue-100">
                    {iniciales(p.nombres, p.apellidos)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {p.nombres || "—"} {p.apellidos || ""}
                    </p>
                    <p className="text-sm text-slate-500">{p.email}</p>
                  </div>
                </div>
                <AprobarBtn profileId={p.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          <ShieldQuestion className="h-4 w-4" /> Solicitudes de rol (autoridad / administrador)
        </h2>
        {listaRol.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center text-slate-400">
            <Inbox className="h-8 w-8" />
            <p>No hay solicitudes de rol pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listaRol.map((s) => (
              <div key={s.id} className="card flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-900 ring-1 ring-inset ring-blue-100">
                    {iniciales(s.profiles?.nombres, s.profiles?.apellidos)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {s.profiles?.nombres || "—"} {s.profiles?.apellidos || ""}
                      <span className="badge ml-2 bg-amber-50 text-amber-700">{ROL_LABEL[s.rol] ?? s.rol}</span>
                    </p>
                    <p className="text-sm text-slate-500">{s.profiles?.email}</p>
                  </div>
                </div>
                <SolicitudRolBtn solicitudId={s.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
