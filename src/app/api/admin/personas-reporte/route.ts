import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 120;

// Fila del directorio unificado (v_personas_directorio, 0038): cuentas
// registradas + graduados importados del módulo Alumni sin cuenta.
type FilaDirectorio = {
  tipo: "cuenta" | "alumni";
  ref: string;
  nombres: string | null;
  apellidos: string | null;
  cedula: string | null;
  email: string | null;
  telefono: string | null;
  rol: string;
  carrera: string | null;
  titulo_reciente: string | null;
  titulos: number | null;
};

const ETIQUETA_ROL: Record<string, string> = {
  estudiante: "Estudiante",
  profesional: "Profesional",
  alumni: "Graduado (importado)",
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

  // Directorio completo, paginado sobre PostgREST (miles de filas).
  const personas: FilaDirectorio[] = [];
  const PAGINA = 1000;
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from("v_personas_directorio")
      .select("*")
      .order("apellidos", { ascending: true })
      .order("nombres", { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (error) {
      console.error("[personas-reporte]", error.message);
      return new Response("No se pudo generar el reporte de personas.", { status: 500 });
    }
    personas.push(...((data ?? []) as FilaDirectorio[]));
    if (!data || data.length < PAGINA) break;
  }

  const cuentas = personas.filter((p) => p.tipo === "cuenta").length;
  const estudiantes = personas.filter((p) => p.rol === "estudiante").length;
  const profesionales = personas.filter((p) => p.rol === "profesional").length;
  const graduadosImportados = personas.filter((p) => p.tipo === "alumni").length;
  const conEmail = personas.filter((p) => p.email).length;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = [
    "Apellidos",
    "Nombres",
    "Cédula",
    "Correo",
    "Teléfono",
    "Tipo",
    "Carrera",
    "Título más reciente",
    "Nº títulos",
  ];
  const filas: (string | number)[][] = personas.map((p) => [
    p.apellidos ?? "",
    p.nombres ?? "",
    p.cedula ?? "",
    p.email ?? "",
    p.telefono ?? "",
    ETIQUETA_ROL[p.rol] ?? p.rol,
    p.carrera ?? "—",
    p.titulo_reciente ?? "",
    p.titulos ?? "",
  ]);

  const resumen: (string | number)[][] = [
    ["Personas en la base", personas.length],
    ["Con cuenta en el sistema", cuentas],
    ["Estudiantes", estudiantes],
    ["Profesionales", profesionales],
    ["Graduados importados (sin cuenta)", graduadosImportados],
    ["Con correo electrónico", conEmail],
  ];

  if (formato === "pdf") {
    // El PDF es para imprimir: resumen + primeras 500 filas (el detalle
    // completo de miles de personas va en el Excel).
    const bytes = await reportePdf({
      titulo: "Registro de personas",
      subtitulo: "Cuentas del sistema y graduados importados",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        {
          titulo: `Detalle de personas${personas.length > 500 ? " (primeras 500 — detalle completo en Excel)" : ""}`,
          encabezados,
          filas: filas.slice(0, 500),
        },
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
      titulo: ["Registro de personas — Cuentas y graduados", `Generado: ${generado}`],
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
