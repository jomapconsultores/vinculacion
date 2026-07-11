// Reporte de alumni en tres formatos: ?formato=excel | pdf | docx
// - excel: agregados + detalle completo (una fila por título).
// - pdf:   agregados + top-N (pensado para imprimir).
// - docx:  informe formateado editable en Word.

import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { libroExcel, type Hoja } from "@/lib/excel";
import { reportePdf, type SeccionPdf } from "@/lib/pdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
} from "docx";

export const runtime = "nodejs";
export const maxDuration = 120;

type Fila = Record<string, string | number | null>;

const ETIQUETA_OCUPACION: Record<string, string> = {
  empleado: "Empleado/a (relación de dependencia)",
  independiente: "Independiente / negocio propio",
  docente: "Docente",
  estudiante: "Estudiante",
  desempleado: "Desempleado/a",
  otro: "Otro",
  sin_datos: "Sin datos",
};

export async function GET(req: Request) {
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
  const autorizado = perfil ? await tieneModulo(perfil, "alumni") : false;
  if (!autorizado) return new Response("Acceso denegado", { status: 403 });

  const formato = new URL(req.url).searchParams.get("formato") || "excel";

  // --- Lecturas (las vistas ya vienen gateadas por has_modulo) ---
  const [totRes, facRes, carrRes, anioRes, genRes, nivRes, ocuRes, extRes] = await Promise.all([
    supabase.from("v_alumni_totales").select("*").maybeSingle(),
    supabase.from("v_alumni_por_facultad").select("*"),
    supabase.from("v_alumni_por_carrera").select("*"),
    supabase.from("v_alumni_por_anio").select("*"),
    supabase.from("v_alumni_por_genero").select("*"),
    supabase.from("v_alumni_por_nivel").select("*"),
    supabase.from("v_alumni_ocupacion").select("*"),
    supabase.from("v_alumni_institutos_externos").select("*"),
  ]);
  const errorVistas =
    totRes.error || facRes.error || carrRes.error || anioRes.error || genRes.error ||
    nivRes.error || ocuRes.error || extRes.error;
  if (errorVistas) {
    console.error("[alumni/reporte] error leyendo vistas:", errorVistas.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const tot = (totRes.data ?? {}) as Fila;
  const porFacultad = (facRes.data ?? []) as Fila[];
  const porCarrera = (carrRes.data ?? []) as Fila[];
  const porAnio = (anioRes.data ?? []) as Fila[];
  const porGenero = (genRes.data ?? []) as Fila[];
  const porNivel = (nivRes.data ?? []) as Fila[];
  const ocupacion = (ocuRes.data ?? []) as Fila[];
  const externos = (extRes.data ?? []) as Fila[];

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const resumen: [string, number][] = [
    ["Personas registradas", Number(tot.personas ?? 0)],
    ["Con correo electrónico", Number(tot.con_email ?? 0)],
    ["Con celular", Number(tot.con_celular ?? 0)],
    ["Con cuenta en el sistema", Number(tot.con_cuenta ?? 0)],
    ["Datos verificados por el graduado", Number(tot.verificados ?? 0)],
    ["Actualizaciones pendientes de revisión", Number(tot.pendientes_revision ?? 0)],
    ["Títulos registrados", Number(tot.titulos ?? 0)],
    ["Títulos con carrera asignada", Number(tot.titulos_con_carrera ?? 0)],
  ];

  const filasFacultad = porFacultad.map((f) => [String(f.facultad), Number(f.graduados), Number(f.titulos)]);
  const filasCarrera = porCarrera.map((f) => [String(f.carrera), String(f.facultad), Number(f.graduados), Number(f.titulos)]);
  const filasAnio = porAnio.map((f) => [Number(f.anio_graduacion), Number(f.graduados), Number(f.titulos)]);
  const filasGenero = porGenero.map((f) => [String(f.genero), Number(f.personas)]);
  const filasNivel = porNivel.map((f) => [String(f.nivel), Number(f.graduados), Number(f.titulos)]);
  const filasOcupacion = ocupacion.map((f) => [
    ETIQUETA_OCUPACION[String(f.ocupacion_categoria)] ?? String(f.ocupacion_categoria),
    Number(f.personas),
  ]);
  const filasExternos = externos.map((f) => [String(f.instituto), Number(f.graduados), Number(f.titulos)]);

  // ---------------- Excel ----------------
  if (formato === "excel") {
    // Detalle completo (una fila por título), paginado sobre PostgREST.
    const detalle: (string | number)[][] = [];
    const PAGINA = 1000;
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error } = await supabase
        .from("alumni_titulos")
        .select(
          "titulo, nivel_formacion, instituto, anio_graduacion, carreras(nombre, facultad), alumni(cedula, nombres, apellidos, genero, email, celular, telefono_fijo, ocupacion, cargo, ocupacion_categoria, estado_verificacion)"
        )
        .order("id", { ascending: true })
        .range(desde, desde + PAGINA - 1);
      if (error) {
        console.error("[alumni/reporte] detalle:", error.message);
        return new Response("No se pudo generar el detalle.", { status: 500 });
      }
      for (const t of data ?? []) {
        const a = (t as any).alumni ?? {};
        const c = (t as any).carreras ?? {};
        detalle.push([
          a.cedula ?? "",
          a.apellidos ?? "",
          a.nombres ?? "",
          a.genero ?? "",
          a.email ?? "",
          a.celular ?? "",
          a.telefono_fijo ?? "",
          a.ocupacion ?? "",
          a.cargo ?? "",
          ETIQUETA_OCUPACION[a.ocupacion_categoria] ?? a.ocupacion_categoria ?? "",
          (t as any).titulo ?? "",
          (t as any).nivel_formacion ?? "",
          (t as any).instituto ?? "",
          (t as any).anio_graduacion ?? "",
          c.nombre ?? "",
          c.facultad ?? "",
          a.estado_verificacion ?? "",
        ]);
      }
      if (!data || data.length < PAGINA) break;
    }

    const hojas: Hoja[] = [
      {
        nombre: "Resumen",
        titulo: ["Informe de Alumni — Universidad de Cuenca", `Generado: ${generado}`],
        encabezados: ["Indicador", "Valor"],
        filas: resumen,
      },
      { nombre: "Por facultad", encabezados: ["Facultad", "Graduados", "Títulos"], filas: filasFacultad },
      { nombre: "Por carrera", encabezados: ["Carrera", "Facultad", "Graduados", "Títulos"], filas: filasCarrera },
      { nombre: "Por año", encabezados: ["Año graduación", "Graduados", "Títulos"], filas: filasAnio },
      { nombre: "Por género", encabezados: ["Género", "Personas"], filas: filasGenero },
      { nombre: "Por nivel", encabezados: ["Nivel de formación", "Graduados", "Títulos"], filas: filasNivel },
      { nombre: "Ocupación", encabezados: ["Categoría", "Personas"], filas: filasOcupacion },
      { nombre: "Posgrados externos", encabezados: ["Institución", "Graduados", "Títulos"], filas: filasExternos },
      {
        nombre: "Detalle",
        encabezados: [
          "Cédula", "Apellidos", "Nombres", "Género", "Correo", "Celular", "Teléfono fijo",
          "Ocupación", "Cargo", "Categoría ocupación", "Título", "Nivel", "Institución",
          "Año graduación", "Carrera", "Facultad", "Estado verificación",
        ],
        filas: detalle,
      },
    ];
    const buf = libroExcel(hojas);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="informe-alumni.xlsx"',
      },
    });
  }

  // ---------------- PDF ----------------
  if (formato === "pdf") {
    const secciones: SeccionPdf[] = [
      { titulo: "Resumen general", encabezados: ["Indicador", "Valor"], filas: resumen },
      { titulo: "Graduados por facultad", encabezados: ["Facultad", "Graduados", "Títulos"], filas: filasFacultad },
      {
        titulo: "Graduados por carrera (top 25)",
        encabezados: ["Carrera", "Facultad", "Graduados", "Títulos"],
        filas: filasCarrera.slice(0, 25),
      },
      { titulo: "Por año de graduación", encabezados: ["Año", "Graduados", "Títulos"], filas: filasAnio },
      { titulo: "Por género", encabezados: ["Género", "Personas"], filas: filasGenero },
      { titulo: "Por nivel de formación", encabezados: ["Nivel", "Graduados", "Títulos"], filas: filasNivel },
      { titulo: "Situación ocupacional", encabezados: ["Categoría", "Personas"], filas: filasOcupacion },
      {
        titulo: "Posgrados en otras instituciones (top 15)",
        encabezados: ["Institución", "Graduados", "Títulos"],
        filas: filasExternos.slice(0, 15),
      },
    ];
    const bytes = await reportePdf({
      titulo: "Informe de Alumni",
      subtitulo: "Seguimiento a graduados — Vinculación con la Sociedad",
      generado,
      secciones,
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="informe-alumni.pdf"',
      },
    });
  }

  // ---------------- DOCX ----------------
  if (formato === "docx") {
    const tabla = (encabezados: string[], filas: (string | number)[][]) =>
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: encabezados.map(
              (h) =>
                new TableCell({
                  shading: { fill: "1E3A8A" },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 })],
                    }),
                  ],
                })
            ),
          }),
          ...filas.map(
            (f) =>
              new TableRow({
                children: f.map(
                  (celda) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: String(celda ?? ""), size: 18 })],
                        }),
                      ],
                    })
                ),
              })
          ),
        ],
      });

    const seccion = (titulo: string, encabezados: string[], filas: (string | number)[][]) => [
      new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } }),
      tabla(encabezados, filas),
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Informe de Alumni — Universidad de Cuenca",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Generado: ${generado}`, italics: true, size: 18 })],
            }),
            ...seccion("Resumen general", ["Indicador", "Valor"], resumen),
            ...seccion("Graduados por facultad", ["Facultad", "Graduados", "Títulos"], filasFacultad),
            ...seccion(
              "Graduados por carrera (top 25)",
              ["Carrera", "Facultad", "Graduados", "Títulos"],
              filasCarrera.slice(0, 25)
            ),
            ...seccion("Por año de graduación", ["Año", "Graduados", "Títulos"], filasAnio),
            ...seccion("Por género", ["Género", "Personas"], filasGenero),
            ...seccion("Por nivel de formación", ["Nivel", "Graduados", "Títulos"], filasNivel),
            ...seccion("Situación ocupacional", ["Categoría", "Personas"], filasOcupacion),
            ...seccion(
              "Posgrados en otras instituciones (top 15)",
              ["Institución", "Graduados", "Títulos"],
              filasExternos.slice(0, 15)
            ),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(doc);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="informe-alumni.docx"',
      },
    });
  }

  return new Response("Formato no soportado (usa excel, pdf o docx).", { status: 400 });
}
