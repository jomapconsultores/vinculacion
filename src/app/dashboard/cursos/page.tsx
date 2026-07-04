import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CursoCard } from "@/components/CursoCard";
import { GraduationCap, Target, AlertTriangle } from "lucide-react";

export default async function CursosPage({ searchParams }: { searchParams: { curso?: string } }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: cursos, error: errorCursos }, { data: inscr, error: errorInscr }] = await Promise.all([
    supabase
      .from("cursos")
      .select(
        "id, nombre, descripcion, duracion_horas, modalidad, precio, url, origen, categoria, fecha_inicio, fecha_fin, publico_objetivo, competencias(nombre)"
      )
      .order("nombre"),
    supabase.from("inscripciones_curso").select("curso_id, estado").eq("profile_id", profile.id),
  ]);
  const error = errorCursos || errorInscr;
  if (error) console.error("[dashboard/cursos]", error.message);

  const estadoPorCurso = new Map((inscr ?? []).map((i: any) => [i.curso_id, i.estado]));
  const destacado = searchParams.curso ? Number(searchParams.curso) : null;

  const reales = (cursos ?? []).filter((c: any) => c.origen === "ucuenca");
  const internos = (cursos ?? []).filter((c: any) => c.origen !== "ucuenca");

  function tarjeta(c: any) {
    const estado = estadoPorCurso.get(c.id) ?? "ninguno";
    return (
      <CursoCard
        key={c.id}
        curso={{
          id: c.id, nombre: c.nombre, descripcion: c.descripcion,
          duracion_horas: c.duracion_horas, modalidad: c.modalidad,
          competencia: c.competencias?.nombre,
          origen: c.origen, categoria: c.categoria,
          fecha_inicio: c.fecha_inicio, fecha_fin: c.fecha_fin,
          publico_objetivo: c.publico_objetivo, precio: c.precio, url: c.url,
        }}
        estadoInicial={estado as any}
        destacado={destacado === c.id}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Educación continua</h1>
        <p className="mt-1 text-slate-500">
          Programas oficiales de la Universidad de Cuenca y cursos internos para cerrar brechas de
          competencias frente a las ofertas de empleo.
        </p>
      </div>

      {error && (
        <div className="card flex flex-col items-center gap-2 py-12 text-center text-red-500">
          <AlertTriangle className="h-10 w-10" />
          <p>No se pudo cargar la oferta de cursos. Recarga la página o intenta más tarde.</p>
        </div>
      )}

      {reales.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <GraduationCap className="h-5 w-5 text-blue-700" /> Programas de la Universidad de Cuenca
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{reales.map(tarjeta)}</div>
        </section>
      )}

      {internos.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Target className="h-5 w-5 text-violet-700" /> Cierra tus brechas de competencias
          </h2>
          <p className="text-sm text-slate-500">
            Al aprobar uno de estos cursos, la universidad avala tu competencia y quedas habilitado
            para postular.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{internos.map(tarjeta)}</div>
        </section>
      )}
    </div>
  );
}
