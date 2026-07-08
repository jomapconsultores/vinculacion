import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";

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

export async function GET() {
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
    console.error("[admin/personas-excel]", error.message);
    return new Response("No se pudo generar el reporte de personas.", { status: 500 });
  }

  const personas = (data as unknown as PersonaRow[]) ?? [];

  const generado = new Date().toLocaleString("es-EC", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const buf = libroExcel([
    {
      nombre: "Personas",
      titulo: [
        "Registro de personas — Estudiantes y profesionales",
        `Generado: ${generado}`,
        `Total: ${personas.length}`,
      ],
      encabezados: [
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
      ],
      filas: personas.map((p) => [
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
      ]),
    },
  ]);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="personas.xlsx"',
    },
  });
}
