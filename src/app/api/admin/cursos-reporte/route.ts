import { createClient, createAdminClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";

export const runtime = "nodejs";

type InscripcionCurso = {
  profile_id: string;
  curso_id: string;
  fecha_inscripcion: string | null;
  profiles: { nombres: string | null; apellidos: string | null; email: string | null } | null;
  cursos: { nombre: string | null; competencias: { nombre: string | null } | null } | null;
};

export async function GET(req: Request) {
  const formato = new URL(req.url).searchParams.get("formato") === "pdf" ? "pdf" : "excel";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, rol, aprobado")
    .eq("id", user.id)
    .maybeSingle();
  const autorizado = perfil ? await tieneModulo(perfil, "cursos") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inscripciones_curso")
    .select(
      "profile_id, curso_id, fecha_inscripcion, profiles(nombres, apellidos, email), cursos(nombre, competencias(nombre))"
    )
    .eq("estado", "pendiente_revision")
    .order("fecha_inscripcion", { ascending: true });
  if (error) {
    console.error("[cursos-reporte]", error.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const inscripciones: InscripcionCurso[] = (data as unknown as InscripcionCurso[]) ?? [];

  const fmtFecha = (f: string | null): string =>
    f ? new Date(f).toLocaleDateString("es-EC", { dateStyle: "long" }) : "—";

  const encabezados = [
    "Graduado",
    "Correo",
    "Curso",
    "Competencia avalada",
    "Fecha de inscripción",
  ];
  const filas: (string | number)[][] = inscripciones.map((i) => [
    `${i.profiles?.nombres ?? ""} ${i.profiles?.apellidos ?? ""}`.trim() || "—",
    i.profiles?.email ?? "—",
    i.cursos?.nombre ?? "—",
    i.cursos?.competencias?.nombre ?? "—",
    fmtFecha(i.fecha_inscripcion),
  ]);

  const graduadosUnicos = new Set(inscripciones.map((i) => i.profile_id)).size;
  const competenciasUnicas = new Set(
    inscripciones
      .map((i) => i.cursos?.competencias?.nombre)
      .filter((n): n is string => Boolean(n))
  ).size;

  const resumen: (string | number)[][] = [
    ["Cursos pendientes de revisión", inscripciones.length],
    ["Graduados distintos", graduadosUnicos],
    ["Competencias por avalar", competenciasUnicas],
  ];

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Revisión de cursos internos",
      subtitulo: "Cursos pendientes de revisión y competencias por avalar",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Cursos por revisar", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="cursos.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Revisión de cursos internos", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Cursos por revisar", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="cursos.xlsx"',
    },
  });
}
