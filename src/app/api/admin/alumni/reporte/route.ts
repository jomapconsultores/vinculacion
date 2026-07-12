// Reporte de alumni en varios formatos: ?formato=excel | pdf | docx
// - Sin ?seccion: informe completo (agregados + detalle) en excel/pdf/docx.
// - Con ?seccion=<id>: SOLO esa sección/ítem (excel de una hoja o pdf de una
//   sección). Ids: resumen | facultad | carrera | anio | genero | nivel |
//   ocupacion | externos | graduados.
// - seccion=graduados exporta el listado de personas honrando los filtros
//   activos del drill-down (genero, facultad, carrera, anio, nivel, ocupacion,
//   instituto, q), igual que /admin/alumni/graduados.

import { createClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { traerGraduadosFiltrados } from "@/lib/alumni";
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

const ETIQUETA_GENERO: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  otro: "Otro",
  "sin datos": "Sin datos",
};

const ETIQUETA_NIVEL: Record<string, string> = {
  PROFESIONAL: "Profesional",
  ESPECIALISTA: "Especialista",
  MAESTRIA: "Maestría",
  "SIN DATOS": "Sin nivel",
};

// Definición de una sección exportable: datos + metadatos de presentación.
type Def = {
  id: string;
  nombre: string; // pestaña Excel
  titulo: string; // encabezado en PDF / hoja
  encabezados: string[];
  filas: (string | number)[][];
};

// Respuestas de archivo, para no repetir cabeceras.
function excelResponse(hojas: Hoja[], slug: string): Response {
  const buf = libroExcel(hojas);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slug}.xlsx"`,
    },
  });
}

async function pdfResponse(
  titulo: string,
  subtitulo: string,
  generado: string,
  secciones: SeccionPdf[],
  slug: string
): Promise<Response> {
  const bytes = await reportePdf({ titulo, subtitulo, generado, secciones });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
    },
  });
}

type SeccionDocx = { titulo: string; encabezados: string[]; filas: (string | number)[][] };

// Tabla Word con encabezado azul institucional.
function tablaDocx(encabezados: string[], filas: (string | number)[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: encabezados.map(
          (h) =>
            new TableCell({
              shading: { fill: "1E3A8A" },
              children: [
                new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 })] }),
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
                  children: [new Paragraph({ children: [new TextRun({ text: String(celda ?? ""), size: 18 })] })],
                })
            ),
          })
      ),
    ],
  });
}

async function docxResponse(
  titulo: string,
  subtitulo: string,
  generado: string,
  secciones: SeccionDocx[],
  slug: string
): Promise<Response> {
  const cuerpo: (Paragraph | Table)[] = [
    new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
  ];
  if (subtitulo) {
    cuerpo.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: subtitulo, size: 20 })],
      })
    );
  }
  cuerpo.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generado: ${generado}`, italics: true, size: 18 })],
    })
  );
  for (const s of secciones) {
    cuerpo.push(
      new Paragraph({ text: s.titulo, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } })
    );
    cuerpo.push(tablaDocx(s.encabezados, s.filas));
  }
  const doc = new Document({ sections: [{ children: cuerpo }] });
  const buf = await Packer.toBuffer(doc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${slug}.docx"`,
    },
  });
}

// Detalle a nivel de TÍTULO (una fila por título): columnas y lector paginado
// sobre PostgREST. Se reutiliza en el informe completo y en ?seccion=titulos.
const DETALLE_ENCABEZADOS = [
  "Cédula", "Apellidos", "Nombres", "Género", "Correo", "Celular", "Teléfono fijo",
  "Ocupación", "Cargo", "Categoría ocupación", "Título", "Nivel", "Institución",
  "Año graduación", "Carrera", "Facultad", "Estado verificación",
];

async function leerDetalleTitulos(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<(string | number)[][]> {
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
    if (error) throw new Error(error.message);
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
  return detalle;
}

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

  const url = new URL(req.url);
  const formato = url.searchParams.get("formato") || "excel";
  const seccion = url.searchParams.get("seccion") || "";
  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  // ============================================================
  // Sección "graduados": listado de personas con los filtros activos.
  // ============================================================
  if (seccion === "graduados") {
    const p = url.searchParams;
    const anioParam = p.get("anio");
    // Paginado en bloques de 1000 (tope de PostgREST) para traer TODO el conjunto.
    const { rows: rowsRaw, error } = await traerGraduadosFiltrados(supabase, {
      p_genero: p.get("genero") || null,
      p_facultad: p.get("facultad") || null,
      p_carrera: p.get("carrera") || null,
      p_anio: anioParam ? parseInt(anioParam, 10) : null,
      p_nivel: p.get("nivel") || null,
      p_ocupacion: p.get("ocupacion") || null,
      p_instituto: p.get("instituto") || null,
      p_q: (p.get("q") || "").trim() || null,
      p_con_email: p.get("con_email") ? true : null,
      p_con_celular: p.get("con_celular") ? true : null,
      p_verificado: p.get("verificado") ? true : null,
      p_pendiente: p.get("pendiente") ? true : null,
      p_con_cuenta: p.get("con_cuenta") ? true : null,
    });
    if (error) {
      console.error("[alumni/reporte] graduados:", error);
      return new Response("No se pudo generar el listado.", { status: 500 });
    }
    const rows = rowsRaw as Fila[];

    // Descripción del filtro activo para el subtítulo.
    const partes: string[] = [];
    if (p.get("facultad")) partes.push(`Facultad: ${p.get("facultad")}`);
    if (p.get("carrera")) partes.push(`Carrera: ${p.get("carrera")}`);
    if (p.get("anio")) partes.push(`Año: ${p.get("anio")}`);
    if (p.get("nivel")) partes.push(`Nivel: ${ETIQUETA_NIVEL[p.get("nivel")!] ?? p.get("nivel")}`);
    if (p.get("genero")) partes.push(`Género: ${ETIQUETA_GENERO[p.get("genero")!] ?? p.get("genero")}`);
    if (p.get("ocupacion"))
      partes.push(`Ocupación: ${ETIQUETA_OCUPACION[p.get("ocupacion")!] ?? p.get("ocupacion")}`);
    if (p.get("instituto")) partes.push(`Institución: ${p.get("instituto")}`);
    if (p.get("con_email")) partes.push("Con correo electrónico");
    if (p.get("con_celular")) partes.push("Con celular");
    if (p.get("verificado")) partes.push("Verificados por el graduado");
    if (p.get("pendiente")) partes.push("Pendientes de revisión");
    if (p.get("con_cuenta")) partes.push("Con cuenta en el sistema");
    if ((p.get("q") || "").trim()) partes.push(`Búsqueda: “${p.get("q")!.trim()}”`);
    const descripcion = partes.length ? partes.join(" · ") : "Todos los graduados";

    const encabezados = [
      "Cédula", "Apellidos", "Nombres", "Género", "Correo", "Celular", "Teléfono fijo",
      "Ciudad", "Ocupación", "Cargo", "Categoría ocupación", "Título reciente",
      "N.º títulos", "Verificación", "Cuenta",
    ];
    const filas = rows.map((r) => [
      String(r.cedula ?? ""),
      String(r.apellidos ?? ""),
      String(r.nombres ?? ""),
      ETIQUETA_GENERO[String(r.genero)] ?? String(r.genero ?? ""),
      String(r.email ?? ""),
      String(r.celular ?? ""),
      String(r.telefono_fijo ?? ""),
      String(r.ciudad ?? ""),
      String(r.ocupacion ?? ""),
      String(r.cargo ?? ""),
      ETIQUETA_OCUPACION[String(r.ocupacion_categoria)] ?? String(r.ocupacion_categoria ?? ""),
      String(r.titulo_reciente ?? ""),
      Number(r.n_titulos ?? 0),
      String(r.estado_verificacion ?? ""),
      r.con_cuenta ? "Sí" : "No",
    ]);

    if (formato === "excel") {
      return excelResponse(
        [
          {
            nombre: "Graduados",
            titulo: ["Graduados — Universidad de Cuenca", descripcion, `Generado: ${generado}`],
            encabezados,
            filas,
          },
        ],
        "graduados"
      );
    }
    if (formato === "pdf") {
      // El PDF omite algunas columnas anchas para que quepa en A4 vertical.
      const encPdf = ["Cédula", "Apellidos", "Nombres", "Correo", "Celular", "Título reciente", "Tít.", "Cuenta"];
      const filasPdf = rows.map((r) => [
        String(r.cedula ?? ""),
        String(r.apellidos ?? ""),
        String(r.nombres ?? ""),
        String(r.email ?? ""),
        String(r.celular ?? ""),
        String(r.titulo_reciente ?? ""),
        Number(r.n_titulos ?? 0),
        r.con_cuenta ? "Sí" : "No",
      ]);
      return pdfResponse(
        "Graduados — Alumni",
        descripcion,
        generado,
        [{ titulo: `Listado (${filas.length})`, encabezados: encPdf, filas: filasPdf }],
        "graduados"
      );
    }
    if (formato === "docx") {
      return docxResponse(
        "Graduados — Alumni",
        descripcion,
        generado,
        [{ titulo: `Listado (${filas.length})`, encabezados, filas }],
        "graduados"
      );
    }
    return new Response("Formato no soportado (usa excel, pdf o docx).", { status: 400 });
  }

  // ============================================================
  // Sección "titulos": detalle completo, una fila por título (los 5.136).
  // ============================================================
  if (seccion === "titulos") {
    let detalle: (string | number)[][];
    try {
      detalle = await leerDetalleTitulos(supabase);
    } catch (e) {
      console.error("[alumni/reporte] titulos:", (e as Error).message);
      return new Response("No se pudo generar el detalle de títulos.", { status: 500 });
    }
    // ?con_carrera=1 → solo títulos con carrera asignada (col 14 = Carrera).
    const soloConCarrera = !!url.searchParams.get("con_carrera");
    if (soloConCarrera) detalle = detalle.filter((f) => String(f[14] ?? "").trim() !== "");
    const subtitulo = soloConCarrera
      ? `${detalle.length.toLocaleString("es-EC")} títulos con carrera asignada`
      : `${detalle.length.toLocaleString("es-EC")} títulos registrados`;

    if (formato === "excel") {
      return excelResponse(
        [
          {
            nombre: "Títulos",
            titulo: ["Títulos — Universidad de Cuenca", subtitulo, `Generado: ${generado}`],
            encabezados: DETALLE_ENCABEZADOS,
            filas: detalle,
          },
        ],
        "alumni-titulos"
      );
    }
    // PDF/Word: subconjunto de columnas para que quepa en A4 vertical.
    // Índices en DETALLE_ENCABEZADOS: 0 cédula, 1 apellidos, 2 nombres,
    // 10 título, 11 nivel, 13 año, 15 facultad.
    const encTit = ["Cédula", "Apellidos", "Nombres", "Título", "Nivel", "Año", "Facultad"];
    const filasTit = detalle.map((f) => [f[0], f[1], f[2], f[10], f[11], f[13], f[15]]);
    if (formato === "pdf") {
      return pdfResponse(
        "Títulos — Alumni",
        subtitulo,
        generado,
        [{ titulo: `Detalle de títulos (${detalle.length})`, encabezados: encTit, filas: filasTit }],
        "alumni-titulos"
      );
    }
    if (formato === "docx") {
      return docxResponse(
        "Títulos — Alumni",
        subtitulo,
        generado,
        [{ titulo: `Detalle de títulos (${detalle.length})`, encabezados: encTit, filas: filasTit }],
        "alumni-titulos"
      );
    }
    return new Response("Formato no soportado (usa excel, pdf o docx).", { status: 400 });
  }

  // ============================================================
  // Agregados: se usan tanto para el informe completo como para el
  // export de una sola sección (?seccion=<id>).
  // ============================================================
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
  const filasGenero = porGenero.map((f) => [ETIQUETA_GENERO[String(f.genero)] ?? String(f.genero), Number(f.personas)]);
  const filasNivel = porNivel.map((f) => [ETIQUETA_NIVEL[String(f.nivel)] ?? String(f.nivel), Number(f.graduados), Number(f.titulos)]);
  const filasOcupacion = ocupacion.map((f) => [
    ETIQUETA_OCUPACION[String(f.ocupacion_categoria)] ?? String(f.ocupacion_categoria),
    Number(f.personas),
  ]);
  const filasExternos = externos.map((f) => [String(f.instituto), Number(f.graduados), Number(f.titulos)]);

  const defs: Def[] = [
    { id: "resumen", nombre: "Resumen", titulo: "Resumen general", encabezados: ["Indicador", "Valor"], filas: resumen },
    { id: "facultad", nombre: "Por facultad", titulo: "Graduados por facultad", encabezados: ["Facultad", "Graduados", "Títulos"], filas: filasFacultad },
    { id: "carrera", nombre: "Por carrera", titulo: "Graduados por carrera", encabezados: ["Carrera", "Facultad", "Graduados", "Títulos"], filas: filasCarrera },
    { id: "anio", nombre: "Por año", titulo: "Títulos por año de graduación", encabezados: ["Año graduación", "Graduados", "Títulos"], filas: filasAnio },
    { id: "genero", nombre: "Por género", titulo: "Graduados por género", encabezados: ["Género", "Personas"], filas: filasGenero },
    { id: "nivel", nombre: "Por nivel", titulo: "Títulos por nivel de formación", encabezados: ["Nivel de formación", "Graduados", "Títulos"], filas: filasNivel },
    { id: "ocupacion", nombre: "Ocupación", titulo: "Situación ocupacional", encabezados: ["Categoría", "Personas"], filas: filasOcupacion },
    { id: "externos", nombre: "Posgrados externos", titulo: "Posgrados en otras instituciones", encabezados: ["Institución", "Graduados", "Títulos"], filas: filasExternos },
  ];

  // ------------- Export de una sola sección -------------
  if (seccion) {
    const def = defs.find((d) => d.id === seccion);
    if (!def) return new Response("Sección desconocida.", { status: 400 });
    if (formato === "excel") {
      return excelResponse(
        [
          {
            nombre: def.nombre,
            titulo: [`${def.titulo} — Alumni UCuenca`, `Generado: ${generado}`],
            encabezados: def.encabezados,
            filas: def.filas,
          },
        ],
        `alumni-${def.id}`
      );
    }
    if (formato === "pdf") {
      return pdfResponse(
        def.titulo,
        "Seguimiento a graduados — Vinculación con la Sociedad",
        generado,
        [{ titulo: def.titulo, encabezados: def.encabezados, filas: def.filas }],
        `alumni-${def.id}`
      );
    }
    if (formato === "docx") {
      return docxResponse(
        def.titulo,
        "Seguimiento a graduados — Vinculación con la Sociedad",
        generado,
        [{ titulo: def.titulo, encabezados: def.encabezados, filas: def.filas }],
        `alumni-${def.id}`
      );
    }
    return new Response("Formato no soportado para una sección (usa excel, pdf o docx).", { status: 400 });
  }

  // ============================================================
  // Informe completo (comportamiento original).
  // ============================================================

  // ---------------- Excel ----------------
  if (formato === "excel") {
    // Detalle completo (una fila por título), paginado sobre PostgREST.
    let detalle: (string | number)[][];
    try {
      detalle = await leerDetalleTitulos(supabase);
    } catch (e) {
      console.error("[alumni/reporte] detalle:", (e as Error).message);
      return new Response("No se pudo generar el detalle.", { status: 500 });
    }

    const hojas: Hoja[] = [
      {
        nombre: "Resumen",
        titulo: ["Informe de Alumni — Universidad de Cuenca", `Generado: ${generado}`],
        encabezados: ["Indicador", "Valor"],
        filas: resumen,
      },
      ...defs
        .filter((d) => d.id !== "resumen")
        .map((d) => ({ nombre: d.nombre, encabezados: d.encabezados, filas: d.filas })),
      {
        nombre: "Detalle",
        encabezados: DETALLE_ENCABEZADOS,
        filas: detalle,
      },
    ];
    return excelResponse(hojas, "informe-alumni");
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
    return pdfResponse(
      "Informe de Alumni",
      "Seguimiento a graduados — Vinculación con la Sociedad",
      generado,
      secciones,
      "informe-alumni"
    );
  }

  // ---------------- DOCX ----------------
  if (formato === "docx") {
    return docxResponse(
      "Informe de Alumni — Universidad de Cuenca",
      "",
      generado,
      [
        { titulo: "Resumen general", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Graduados por facultad", encabezados: ["Facultad", "Graduados", "Títulos"], filas: filasFacultad },
        { titulo: "Graduados por carrera (top 25)", encabezados: ["Carrera", "Facultad", "Graduados", "Títulos"], filas: filasCarrera.slice(0, 25) },
        { titulo: "Por año de graduación", encabezados: ["Año", "Graduados", "Títulos"], filas: filasAnio },
        { titulo: "Por género", encabezados: ["Género", "Personas"], filas: filasGenero },
        { titulo: "Por nivel de formación", encabezados: ["Nivel", "Graduados", "Títulos"], filas: filasNivel },
        { titulo: "Situación ocupacional", encabezados: ["Categoría", "Personas"], filas: filasOcupacion },
        { titulo: "Posgrados en otras instituciones (top 15)", encabezados: ["Institución", "Graduados", "Títulos"], filas: filasExternos.slice(0, 15) },
      ],
      "informe-alumni"
    );
  }

  return new Response("Formato no soportado (usa excel, pdf o docx).", { status: 400 });
}
