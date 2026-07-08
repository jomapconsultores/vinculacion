import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type EmpleabilidadCarrera = {
  carrera: string;
  facultad: string | null;
  graduados: number;
  postulantes: number;
  contratados: number;
  competencias_avaladas: number;
};

type BrechaCompetencia = {
  competencia: string;
  area: string | null;
  empleos_que_la_piden: number;
  graduados_con_aval: number;
};

type Indicadores = {
  total_graduados: number;
  graduados_verificados: number;
  empleos_activos: number;
  postulaciones_totales: number;
  contratados: number;
  competencias_avaladas: number;
  servicios_activos: number;
};

// Ajusta el ancho de columnas al contenido más largo (con un mínimo y un tope).
function anchos(aoa: (string | number)[][]): { wch: number }[] {
  const cols = aoa[0]?.length ?? 0;
  const w: number[] = new Array(cols).fill(10);
  for (const fila of aoa) {
    fila.forEach((celda, i) => {
      const len = String(celda ?? "").length + 2;
      if (len > w[i]) w[i] = len;
    });
  }
  return w.map((n) => ({ wch: Math.min(Math.max(n, 10), 48) }));
}

export async function GET() {
  const supabase = await createClient();

  // Autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  // Autorización: mismo gate que el informe PDF (rol staff + módulo 'empleabilidad').
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, rol, aprobado")
    .eq("id", user.id)
    .maybeSingle();

  const autorizado = perfil ? await tieneModulo(perfil, "empleabilidad") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  // Lectura de vistas
  const [carrerasRes, brechasRes, indRes] = await Promise.all([
    supabase.from("v_empleabilidad_carrera").select("*").order("graduados", { ascending: false }),
    supabase
      .from("v_brechas_competencias")
      .select("*")
      .order("empleos_que_la_piden", { ascending: false }),
    supabase.from("v_indicadores_globales").select("*").single(),
  ]);

  const errorVistas = carrerasRes.error || brechasRes.error || indRes.error;
  if (errorVistas) {
    console.error("[admin/informe-excel] error leyendo vistas:", errorVistas.message);
    return new Response("No se pudo generar el reporte: falló la lectura de indicadores.", {
      status: 500,
    });
  }

  const carreras: EmpleabilidadCarrera[] = (carrerasRes.data as EmpleabilidadCarrera[]) ?? [];
  const brechas: BrechaCompetencia[] = (brechasRes.data as BrechaCompetencia[]) ?? [];
  const ind: Indicadores = (indRes.data as Indicadores) ?? {
    total_graduados: 0,
    graduados_verificados: 0,
    empleos_activos: 0,
    postulaciones_totales: 0,
    contratados: 0,
    competencias_avaladas: 0,
    servicios_activos: 0,
  };

  const tasaGlobal =
    ind.total_graduados > 0 ? Math.round((ind.contratados / ind.total_graduados) * 100) : 0;

  const generado = new Date().toLocaleString("es-EC", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const wb = XLSX.utils.book_new();

  // --- Hoja 1: Indicadores globales ---
  const indAoa: (string | number)[][] = [
    ["Informe de Empleabilidad y Vinculación"],
    ["Indicadores auditables — Acreditación (Pilar 4)"],
    [`Generado: ${generado}`],
    [],
    ["Indicador", "Valor"],
    ["Graduados registrados", ind.total_graduados],
    ["Graduados verificados", ind.graduados_verificados],
    ["Empleos activos", ind.empleos_activos],
    ["Postulaciones totales", ind.postulaciones_totales],
    ["Contrataciones", ind.contratados],
    ["Competencias avaladas", ind.competencias_avaladas],
    ["Servicios activos", ind.servicios_activos],
    ["Tasa de inserción (%)", tasaGlobal],
  ];
  const wsInd = XLSX.utils.aoa_to_sheet(indAoa);
  wsInd["!cols"] = [{ wch: 34 }, { wch: 16 }];
  wsInd["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsInd, "Indicadores");

  // --- Hoja 2: Empleabilidad por carrera ---
  const carrHead = [
    "Carrera",
    "Facultad",
    "Graduados",
    "Postulantes",
    "Contratados",
    "Tasa inserción (%)",
    "Competencias avaladas",
  ];
  const carrAoa: (string | number)[][] = [carrHead];
  for (const c of carreras) {
    const tasa = c.graduados > 0 ? Math.round((c.contratados / c.graduados) * 100) : 0;
    carrAoa.push([
      c.carrera,
      c.facultad ?? "—",
      c.graduados,
      c.postulantes,
      c.contratados,
      tasa,
      c.competencias_avaladas,
    ]);
  }
  if (carreras.length === 0) carrAoa.push(["Sin datos de empleabilidad registrados."]);
  const wsCarr = XLSX.utils.aoa_to_sheet(carrAoa);
  wsCarr["!cols"] = anchos(carrAoa);
  if (carreras.length > 0) {
    wsCarr["!autofilter"] = { ref: `A1:G${carreras.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsCarr, "Empleabilidad por carrera");

  // --- Hoja 3: Brechas de competencias ---
  const brechaHead = [
    "Competencia",
    "Área",
    "Empleos que la piden",
    "Graduados con aval",
    "Brecha",
  ];
  const brechaAoa: (string | number)[][] = [brechaHead];
  for (const b of brechas) {
    brechaAoa.push([
      b.competencia,
      b.area ?? "—",
      b.empleos_que_la_piden,
      b.graduados_con_aval,
      b.empleos_que_la_piden - b.graduados_con_aval,
    ]);
  }
  if (brechas.length === 0) brechaAoa.push(["Sin brechas de competencias registradas."]);
  const wsBrecha = XLSX.utils.aoa_to_sheet(brechaAoa);
  wsBrecha["!cols"] = anchos(brechaAoa);
  if (brechas.length > 0) {
    wsBrecha["!autofilter"] = { ref: `A1:E${brechas.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsBrecha, "Brechas de competencias");

  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="informe-empleabilidad.xlsx"',
    },
  });
}
