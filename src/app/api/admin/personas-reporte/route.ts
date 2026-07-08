import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";

export const runtime = "nodejs";

type PersonaRow = {
  nombres: string | null;
  apellidos: string | null;
  cedula: string | null;
  email: string | null;
  rol: string | null;
  anio_graduacion: number | null;
  ciudad: string | null;
  titulo: string | null;
  origen_padron: boolean | null;
  carreras: { nombre: string | null } | null;
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
  const autorizado = perfil ? await tieneModulo(perfil, "personas") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "nombres, apellidos, cedula, email, rol, anio_graduacion, ciudad, titulo, origen_padron, carreras(nombre)"
    )
    .in("rol", ["estudiante", "profesional"])
    .order("apellidos", { ascending: true });
  if (error) {
    console.error("[personas-reporte]", error.message);
    return new Response("No se pudo generar el reporte de personas.", { status: 500 });
  }

  const personas = (data as unknown as PersonaRow[]) ?? [];

  const estudiantes = personas.filter((p) => p.rol === "estudiante").length;
  const profesionales = personas.filter((p) => p.rol === "profesional").length;
  const verificados = personas.filter((p) => p.origen_padron).length;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = [
    "Apellidos",
    "Nombres",
    "Cédula",
    "Correo",
    "Rol",
    "Carrera",
    "Año graduación",
    "Ciudad",
    "Título",
    "Verificado (padrón)",
  ];
  const filas: (string | number)[][] = personas.map((p) => [
    p.apellidos ?? "",
    p.nombres ?? "",
    p.cedula ?? "",
    p.email ?? "",
    p.rol === "estudiante" ? "Estudiante" : "Profesional",
    p.carreras?.nombre ?? "—",
    p.anio_graduacion ?? "",
    p.ciudad ?? "",
    p.titulo ?? "",
    p.origen_padron ? "Sí" : "No",
  ]);

  const resumen: (string | number)[][] = [
    ["Personas registradas", personas.length],
    ["Estudiantes", estudiantes],
    ["Profesionales", profesionales],
    ["Verificados (padrón)", verificados],
  ];

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Registro de personas",
      subtitulo: "Estudiantes y profesionales",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Detalle de personas", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="personas.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Registro de personas — Estudiantes y profesionales", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Personas", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="personas.xlsx"',
    },
  });
}
