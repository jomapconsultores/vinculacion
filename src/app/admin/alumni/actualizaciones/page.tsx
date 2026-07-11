import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RevisarActualizacion } from "@/components/alumni/RevisarActualizacion";
import { Inbox, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActualizacionesPage() {
  await requireModulo("alumni");
  const supabase = await createClient();

  const { data: pendientes } = await supabase
    .from("alumni_actualizaciones")
    .select("id, cedula, payload, created_at, alumni(nombres, apellidos, genero, email, celular, ciudad, ocupacion, cargo, empresa)")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true })
    .limit(100);

  const filas = pendientes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/alumni"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Alumni
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Inbox className="h-6 w-6 text-blue-700" /> Actualizaciones pendientes
        </h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Datos enviados por los propios graduados desde el enlace público. Revisa el cambio
          propuesto frente al dato actual y aprueba o rechaza; al aprobar, la ficha del graduado se
          actualiza y queda marcada como verificada.
        </p>
      </div>

      {filas.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          No hay actualizaciones pendientes de revisión.
        </div>
      ) : (
        <div className="space-y-4">
          {filas.map((f: any) => (
            <RevisarActualizacion
              key={f.id}
              id={f.id}
              cedula={f.cedula}
              creada={f.created_at}
              actual={f.alumni ?? null}
              payload={f.payload ?? {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
