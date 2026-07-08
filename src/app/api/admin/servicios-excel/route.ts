import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";

export const runtime = "nodejs";

type ServicioEjecucion = {
  nombre: string;
  area: string | null;
  horas_planificadas: number;
  horas_reales: number;
  atenciones: number;
  porcentaje_ejecucion: number;
};

function estado(pct: number): string {
  if (pct < 70) return "Subejecución";
  if (pct > 110) return "Sobreejecución";
  return "En rango";
}

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

  const autorizado = perfil ? await tieneModulo(perfil, "servicios") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const { data, error } = await supabase
    .from("v_servicio_ejecucion")
    .select("*")
    .order("porcentaje_ejecucion", { ascending: true });

  if (error) {
    console.error("[admin/servicios-excel]", error.message);
    return new Response("No se pudo generar el reporte de servicios.", { status: 500 });
  }

  const servicios: ServicioEjecucion[] = (data as ServicioEjecucion[]) ?? [];

  const totalPlan = servicios.reduce((s, x) => s + Number(x.horas_planificadas), 0);
  const totalReal = servicios.reduce((s, x) => s + Number(x.horas_reales), 0);
  const ejecucionGlobal = totalPlan > 0 ? Math.round((totalReal / totalPlan) * 100) : 0;
  const conDesviacion = servicios.filter(
    (x) => estado(x.porcentaje_ejecucion) !== "En rango"
  ).length;

  const generado = new Date().toLocaleString("es-EC", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: [
        "Control académico–financiero de servicios comunitarios",
        "Pilar 3 · Vinculación con la sociedad",
        `Generado: ${generado}`,
      ],
      encabezados: ["Indicador", "Valor"],
      filas: [
        ["Servicios monitoreados", servicios.length],
        ["Horas planificadas (total)", totalPlan],
        ["Horas reales (total)", totalReal],
        ["Ejecución global (%)", ejecucionGlobal],
        ["Servicios con desviación", conDesviacion],
      ],
    },
    {
      nombre: "Servicios",
      encabezados: [
        "Servicio",
        "Área",
        "Horas planificadas",
        "Horas reales",
        "Atenciones",
        "Ejecución (%)",
        "Estado",
      ],
      filas: servicios.map((s) => [
        s.nombre,
        s.area ?? "—",
        Number(s.horas_planificadas),
        Number(s.horas_reales),
        Number(s.atenciones),
        Math.round(Number(s.porcentaje_ejecucion)),
        estado(Number(s.porcentaje_ejecucion)),
      ]),
    },
  ]);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="servicios-comunitarios.xlsx"',
    },
  });
}
