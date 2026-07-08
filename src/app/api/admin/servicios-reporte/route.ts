import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";

export const runtime = "nodejs";

type ServicioEjecucion = {
  nombre: string;
  area: string | null;
  horas_planificadas: number;
  horas_reales: number;
  atenciones: number;
  porcentaje_ejecucion: number;
};

function estadoServicio(pct: number): string {
  if (pct < 70) return "Subejecución";
  if (pct > 110) return "Sobreejecución";
  return "En rango";
}

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
  const autorizado = perfil ? await tieneModulo(perfil, "servicios") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const { data, error } = await supabase
    .from("v_servicio_ejecucion")
    .select("*")
    .order("porcentaje_ejecucion", { ascending: true });
  if (error) {
    console.error("[servicios-reporte]", error.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const servicios: ServicioEjecucion[] = (data as ServicioEjecucion[]) ?? [];
  const totalPlan = servicios.reduce((s, x) => s + Number(x.horas_planificadas), 0);
  const totalReal = servicios.reduce((s, x) => s + Number(x.horas_reales), 0);
  const ejecucionGlobal = totalPlan > 0 ? Math.round((totalReal / totalPlan) * 100) : 0;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = [
    "Servicio",
    "Área",
    "Horas planificadas",
    "Horas reales",
    "Atenciones",
    "Ejecución (%)",
    "Estado",
  ];
  const filas: (string | number)[][] = servicios.map((s) => [
    s.nombre,
    s.area ?? "—",
    Number(s.horas_planificadas),
    Number(s.horas_reales),
    Number(s.atenciones),
    Math.round(Number(s.porcentaje_ejecucion)),
    estadoServicio(Number(s.porcentaje_ejecucion)),
  ]);

  const resumen: (string | number)[][] = [
    ["Servicios monitoreados", servicios.length],
    ["Horas planificadas (total)", totalPlan],
    ["Horas reales (total)", totalReal],
    ["Ejecución global (%)", ejecucionGlobal],
  ];

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Servicios comunitarios",
      subtitulo: "Control académico–financiero · Pilar 3",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Detalle de servicios", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="servicios-comunitarios.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Servicios comunitarios — Pilar 3", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Servicios", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="servicios-comunitarios.xlsx"',
    },
  });
}
