import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";
import {
  type Dimension,
  type PuntuacionDimension,
  etiquetaDimension,
} from "@/lib/psicometria";

export const runtime = "nodejs";

type ResultadoRow = {
  id: number;
  profile_id: string;
  puntuaciones: Record<Dimension, PuntuacionDimension> | null;
  interpretacion: (Record<Dimension, string> & { resumen: string }) | null;
  alerta: boolean;
  created_at: string;
  profiles: {
    nombres: string | null;
    apellidos: string | null;
    cedula: string | null;
    carreras: { nombre: string } | null;
  } | null;
};

// Orden de dimensiones tal como se calculan en el instrumento "Perfil Psicolaboral".
const DIMENSIONES: Dimension[] = [
  "apertura",
  "responsabilidad",
  "extraversion",
  "amabilidad",
  "estabilidad_emocional",
  "agotamiento_emocional",
  "cinismo",
  "eficacia_profesional",
  "ansiedad_estres",
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
  const autorizado = perfil ? await tieneModulo(perfil, "psicometria") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const { data, error } = await supabase
    .from("psicometria_resultados")
    .select(
      "id, profile_id, puntuaciones, interpretacion, alerta, created_at, profiles(nombres, apellidos, cedula, carreras(nombre))"
    )
    .order("alerta", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[psicometria-reporte]", error.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const resultados = (data as unknown as ResultadoRow[]) ?? [];
  const conAlerta = resultados.filter((r) => r.alerta).length;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = [
    "Persona",
    "Cédula",
    "Carrera",
    "Fecha",
    "Alerta",
    ...DIMENSIONES.map((d) => etiquetaDimension(d)),
  ];

  const filas: (string | number)[][] = resultados.map((r) => {
    const nombre =
      [r.profiles?.nombres, r.profiles?.apellidos].filter(Boolean).join(" ") ||
      "Persona sin nombre registrado";
    const puntajes = DIMENSIONES.map((d) => {
      const p = r.puntuaciones?.[d];
      return p ? Number(p.promedio) : "—";
    });
    return [
      nombre,
      r.profiles?.cedula ?? "—",
      r.profiles?.carreras?.nombre ?? "Carrera no registrada",
      new Date(r.created_at).toLocaleDateString("es-EC"),
      r.alerta ? "Sí" : "No",
      ...puntajes,
    ];
  });

  const resumen: (string | number)[][] = [
    ["Evaluaciones completadas", resultados.length],
    ["Con señales de riesgo (alerta)", conAlerta],
    ["Sin señales de riesgo", resultados.length - conAlerta],
  ];

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Evaluaciones psicométricas",
      subtitulo: "Perfil Psicolaboral · Bienestar",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Detalle de resultados (promedio por dimensión, escala 1–5)", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="psicometria.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Evaluaciones psicométricas — Perfil Psicolaboral", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Resultados", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="psicometria.xlsx"',
    },
  });
}
