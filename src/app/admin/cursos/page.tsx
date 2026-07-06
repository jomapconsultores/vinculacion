import { requireModulo } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { RevisarCursoBtn } from "./RevisarCursoBtn";
import { GraduationCap, Inbox, Award } from "lucide-react";
import { iniciales } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RevisionCursosPage() {
  await requireModulo("cursos");

  const admin = createAdminClient();
  const { data: pendientes } = await admin
    .from("inscripciones_curso")
    .select(
      "profile_id, curso_id, fecha_inscripcion, profiles(nombres, apellidos, email), cursos(nombre, competencias(nombre))"
    )
    .eq("estado", "pendiente_revision")
    .order("fecha_inscripcion", { ascending: true });

  const lista = (pendientes ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <GraduationCap className="h-6 w-6 text-violet-700" /> Revisión de cursos internos
        </h1>
        <p className="mt-1 text-slate-500">
          Aprueba o rechaza los cursos internos que los graduados marcaron como completados. Al
          aprobar, la universidad avala la competencia asociada y se emite el código de verificación.
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center text-slate-400">
          <Inbox className="h-10 w-10" />
          <p>No hay cursos pendientes de revisión.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((i) => (
            <div
              key={`${i.profile_id}-${i.curso_id}`}
              className="card flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  {iniciales(i.profiles?.nombres, i.profiles?.apellidos)}
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {i.profiles?.nombres || "—"} {i.profiles?.apellidos || ""}
                  </p>
                  <p className="text-sm text-slate-500">{i.profiles?.email}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{i.cursos?.nombre}</p>
                  {i.cursos?.competencias?.nombre && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-violet-600">
                      <Award className="h-3.5 w-3.5" /> Avala: {i.cursos.competencias.nombre}
                    </p>
                  )}
                </div>
              </div>
              <RevisarCursoBtn profileId={i.profile_id} cursoId={i.curso_id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
