import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";

export const runtime = "nodejs";

type Indicadores = {
  total_graduados: number;
  contratados: number;
  competencias_avaladas: number;
  postulaciones_totales: number;
};

type ServicioEjecucion = { porcentaje_ejecucion: number };

// Mismos estados y etiquetas que muestra la página de indicadores.
const ESTADOS: { key: string; label: string }[] = [
  { key: "borrador", label: "Borrador" },
  { key: "enviada", label: "Enviada" },
  { key: "en_revision", label: "En revisión" },
  { key: "preseleccionado", label: "Preseleccionado" },
  { key: "contratado", label: "Contratado" },
  { key: "rechazado", label: "Rechazado" },
];

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
  const autorizado = perfil ? await tieneModulo(perfil, "indicadores") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const [{ data: ind }, { data: dist }, { data: serv }] = await Promise.all([
    supabase.from("v_indicadores_globales").select("*").single(),
    supabase.from("v_postulaciones_por_estado").select("estado, cantidad"),
    supabase.from("v_servicio_ejecucion").select("porcentaje_ejecucion"),
  ]);

  const indicadores: Indicadores = (ind as Indicadores) ?? {
    total_graduados: 0,
    contratados: 0,
    competencias_avaladas: 0,
    postulaciones_totales: 0,
  };

  const cantidadPorEstado = new Map(
    ((dist as { estado: string; cantidad: number }[]) ?? []).map((d) => [d.estado, d.cantidad]),
  );
  const totalPost = [...cantidadPorEstado.values()].reduce((a, n) => a + Number(n), 0);

  const servicios = (serv as ServicioEjecucion[]) ?? [];
  const ejecucionPromedio =
    servicios.length > 0
      ? Math.round(
          servicios.reduce((s, x) => s + Number(x.porcentaje_ejecucion), 0) / servicios.length,
        )
      : 0;

  const tasaInsercion =
    indicadores.total_graduados > 0
      ? Math.round((indicadores.contratados / indicadores.total_graduados) * 100)
      : 0;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  // Resumen: indicadores globales calculados por la página.
  const resumen: (string | number)[][] = [
    ["Tasa de inserción laboral (%)", tasaInsercion],
    ["Graduados registrados", indicadores.total_graduados],
    ["Contratados", indicadores.contratados],
    ["Competencias avaladas", indicadores.competencias_avaladas],
    ["Postulaciones registradas", totalPost],
    ["Postulaciones totales (indicador)", indicadores.postulaciones_totales],
    ["Ejecución promedio de servicios (%)", ejecucionPromedio],
    ["Servicios monitoreados", servicios.length],
  ];

  // Distribución de postulaciones por estado (mismo orden del embudo en la página).
  const encDist = ["Estado", "Cantidad", "Porcentaje (%)"];
  const filasDist: (string | number)[][] = ESTADOS.map((e) => {
    const n = Number(cantidadPorEstado.get(e.key) ?? 0);
    const pct = totalPost > 0 ? Math.round((n / totalPost) * 100) : 0;
    return [e.label, n, pct];
  });

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Indicadores de acreditación",
      subtitulo: "Consolidación de indicadores de vinculación · Pilar 4",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        {
          titulo: "Distribución de postulaciones por estado",
          encabezados: encDist,
          filas: filasDist,
        },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="indicadores.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Indicadores de acreditación — Pilar 4", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Postulaciones por estado", encabezados: encDist, filas: filasDist },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="indicadores.xlsx"',
    },
  });
}
