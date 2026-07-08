import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";
import { etiquetaEstadoPractica, porcentajeCumplimiento } from "@/lib/estadoPractica";

export const runtime = "nodejs";

type Practica = {
  id: number;
  estudiante_nombre: string | null;
  tutor: string | null;
  horas_planificadas: number;
  horas_cumplidas: number;
  estado: string | null;
  servicios: { nombre: string } | null;
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
  const autorizado = perfil ? await tieneModulo(perfil, "practicas") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const { data, error } = await supabase
    .from("practicas_preprofesionales")
    .select("id, estudiante_nombre, tutor, horas_planificadas, horas_cumplidas, estado, servicios(nombre)")
    .order("estudiante_nombre", { ascending: true });
  if (error) {
    console.error("[practicas-reporte]", error.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const practicas: Practica[] = (data as unknown as Practica[]) ?? [];

  const totalPlan = practicas.reduce((s, p) => s + Number(p.horas_planificadas), 0);
  const totalCumpl = practicas.reduce((s, p) => s + Number(p.horas_cumplidas), 0);
  const avanceGlobal = totalPlan > 0 ? Math.round((totalCumpl / totalPlan) * 100) : 0;
  const finalizadas = practicas.filter(
    (p) => (p.estado ?? "").toLowerCase() === "finalizada",
  ).length;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = [
    "Estudiante",
    "Servicio",
    "Tutor",
    "Horas planificadas",
    "Horas cumplidas",
    "Cumplimiento (%)",
    "Estado",
  ];
  const filas: (string | number)[][] = practicas.map((p) => {
    const plan = Number(p.horas_planificadas);
    const cumpl = Number(p.horas_cumplidas);
    return [
      p.estudiante_nombre ?? "—",
      p.servicios?.nombre ?? "—",
      p.tutor ?? "—",
      plan,
      cumpl,
      porcentajeCumplimiento(cumpl, plan),
      etiquetaEstadoPractica(p.estado),
    ];
  });

  const resumen: (string | number)[][] = [
    ["Prácticas activas", practicas.length],
    ["Avance global de horas (%)", avanceGlobal],
    ["Horas cumplidas (total)", totalCumpl],
    ["Horas planificadas (total)", totalPlan],
    ["Prácticas finalizadas", finalizadas],
  ];

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Prácticas preprofesionales",
      subtitulo: "Aseguramiento de prácticas · Pilar 3",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Detalle de prácticas", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="practicas-preprofesionales.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Prácticas preprofesionales — Pilar 3", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Prácticas", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="practicas-preprofesionales.xlsx"',
    },
  });
}
