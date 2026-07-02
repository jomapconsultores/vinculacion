import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CursoCard } from "@/components/CursoCard";

export default async function CursosPage({ searchParams }: { searchParams: { curso?: string } }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: cursos }, { data: inscr }] = await Promise.all([
    supabase.from("cursos").select("id, nombre, descripcion, duracion_horas, modalidad, competencias(nombre)").order("nombre"),
    supabase.from("inscripciones_curso").select("curso_id, estado").eq("profile_id", profile.id),
  ]);

  const estadoPorCurso = new Map((inscr ?? []).map((i: any) => [i.curso_id, i.estado]));
  const destacado = searchParams.curso ? Number(searchParams.curso) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Educación continua</h1>
        <p className="mt-1 text-slate-500">
          Cierra tus brechas de competencias. Al aprobar un curso, la universidad avala tu competencia
          y quedas habilitado para postular.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(cursos ?? []).map((c: any) => {
          const est = estadoPorCurso.get(c.id);
          const estado = est === "aprobado" ? "aprobado" : est ? "en_progreso" : "ninguno";
          return (
            <CursoCard
              key={c.id}
              curso={{
                id: c.id, nombre: c.nombre, descripcion: c.descripcion,
                duracion_horas: c.duracion_horas, modalidad: c.modalidad,
                competencia: c.competencias?.nombre,
              }}
              estadoInicial={estado as any}
              destacado={destacado === c.id}
            />
          );
        })}
      </div>
    </div>
  );
}
