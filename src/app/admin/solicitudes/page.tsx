import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AprobarBtn } from "./AprobarBtn";
import { UserCheck, Inbox } from "lucide-react";
import { iniciales } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const profile = await requireProfile();
  if (profile.rol !== "admin") redirect("/admin");

  const admin = createAdminClient();
  const { data: pendientes } = await admin
    .from("profiles")
    .select("id, nombres, apellidos, email, created_at")
    .eq("rol", "autoridad")
    .eq("aprobado", false)
    .is("rechazado_en", null)
    .order("created_at", { ascending: true });

  const lista = pendientes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <UserCheck className="h-6 w-6 text-blue-700" /> Solicitudes de autoridad
        </h1>
        <p className="mt-1 text-slate-500">
          Aprueba o rechaza el acceso de las cuentas de autoridad que se registraron.
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center text-slate-400">
          <Inbox className="h-10 w-10" />
          <p>No hay solicitudes pendientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((p: any) => (
            <div key={p.id} className="card flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
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
    </div>
  );
}
