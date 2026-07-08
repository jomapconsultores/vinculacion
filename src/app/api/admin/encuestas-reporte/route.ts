import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";
import {
  PERTINENCIA,
  SATISFACCION_EMPLEADOR,
  type Pregunta,
  type TipoEncuesta,
} from "@/lib/encuestas";

export const runtime = "nodejs";

type Respuesta = {
  id: string;
  tipo: TipoEncuesta;
  respuestas: Record<string, number | string> | null;
  created_at: string;
};

function promediosLikert(
  preguntas: Pregunta[],
  respuestas: Respuesta[],
): (string | number)[][] {
  return preguntas
    .filter((p) => p.tipo === "likert")
    .map((p) => {
      const valores = respuestas
        .map((r) => r.respuestas?.[p.id])
        .filter((v): v is number => typeof v === "number");
      const n = valores.length;
      const promedio = n > 0 ? valores.reduce((s, v) => s + v, 0) / n : 0;
      return [p.texto, Number(promedio.toFixed(2)), n];
    });
}

function abiertas(preguntas: Pregunta[], respuestas: Respuesta[]): (string | number)[][] {
  const textos = preguntas.filter((p) => p.tipo === "texto");
  const items: (string | number)[][] = [];
  for (const r of respuestas) {
    for (const p of textos) {
      const v = r.respuestas?.[p.id];
      if (typeof v === "string" && v.trim()) {
        items.push([
          p.texto,
          v.trim(),
          new Date(r.created_at).toLocaleDateString("es-EC"),
        ]);
      }
    }
  }
  return items;
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
  const autorizado = perfil ? await tieneModulo(perfil, "encuestas") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const { data, error } = await supabase
    .from("encuestas_respuestas")
    .select("id, tipo, respuestas, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[encuestas-reporte]", error.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const todas: Respuesta[] = (data as Respuesta[]) ?? [];
  const pertinencia = todas.filter((r) => r.tipo === "pertinencia");
  const satisfaccion = todas.filter((r) => r.tipo === "satisfaccion_empleador");

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const resumen: (string | number)[][] = [
    ["Respuestas totales", todas.length],
    ["Pertinencia de la formación (graduados)", pertinencia.length],
    ["Satisfacción de empleadores", satisfaccion.length],
  ];

  const encLikert = ["Pregunta", "Promedio (1-5)", "Respuestas (n)"];
  const encAbiertas = ["Pregunta", "Respuesta", "Fecha"];

  const filasPertinencia = promediosLikert(PERTINENCIA, pertinencia);
  const filasSatisfaccion = promediosLikert(SATISFACCION_EMPLEADOR, satisfaccion);
  const filasAbiertasPert = abiertas(PERTINENCIA, pertinencia);
  const filasAbiertasSat = abiertas(SATISFACCION_EMPLEADOR, satisfaccion);

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Resultados de encuestas",
      subtitulo: "Pertinencia y satisfacción · Acreditación",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        {
          titulo: "Pertinencia de la formación (graduados) — promedios",
          encabezados: encLikert,
          filas: filasPertinencia,
        },
        {
          titulo: "Satisfacción de empleadores — promedios",
          encabezados: encLikert,
          filas: filasSatisfaccion,
        },
        {
          titulo: "Respuestas abiertas — pertinencia",
          encabezados: encAbiertas,
          filas: filasAbiertasPert,
        },
        {
          titulo: "Respuestas abiertas — satisfacción de empleadores",
          encabezados: encAbiertas,
          filas: filasAbiertasSat,
        },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="encuestas.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Resultados de encuestas — Acreditación", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Pertinencia", encabezados: encLikert, filas: filasPertinencia },
    { nombre: "Satisfacción", encabezados: encLikert, filas: filasSatisfaccion },
    { nombre: "Abiertas pertinencia", encabezados: encAbiertas, filas: filasAbiertasPert },
    { nombre: "Abiertas satisfacción", encabezados: encAbiertas, filas: filasAbiertasSat },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="encuestas.xlsx"',
    },
  });
}
