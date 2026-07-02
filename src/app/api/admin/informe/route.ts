import { createClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";

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

// Sanitiza a Latin-1 (WinAnsi) para no romper la codificacion de las fuentes estandar.
function sane(input: unknown): string {
  const s = String(input ?? "");
  return s
    .replace(/[—–]/g, "-") // guiones largos
    .replace(/[‘’]/g, "'") // comillas simples tipograficas
    .replace(/[“”]/g, '"') // comillas dobles tipograficas
    .replace(/…/g, "...") // puntos suspensivos
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, ""); // elimina lo que quede fuera de Latin-1
}

export async function GET() {
  const supabase = await createClient();

  // Autenticacion
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  // Autorizacion (rol staff)
  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  const rol = (perfil as { rol?: string } | null)?.rol;
  if (rol !== "admin" && rol !== "autoridad") {
    return new Response("Acceso denegado", { status: 403 });
  }

  // Lectura de vistas
  const [carrerasRes, brechasRes, indRes] = await Promise.all([
    supabase
      .from("v_empleabilidad_carrera")
      .select("*")
      .order("graduados", { ascending: false }),
    supabase
      .from("v_brechas_competencias")
      .select("*")
      .order("empleos_que_la_piden", { ascending: false })
      .limit(8),
    supabase.from("v_indicadores_globales").select("*").single(),
  ]);

  const carreras: EmpleabilidadCarrera[] =
    (carrerasRes.data as EmpleabilidadCarrera[]) ?? [];
  const brechas: BrechaCompetencia[] =
    (brechasRes.data as BrechaCompetencia[]) ?? [];
  const ind: Indicadores = (indRes.data as Indicadores) ?? {
    total_graduados: 0,
    graduados_verificados: 0,
    empleos_activos: 0,
    postulaciones_totales: 0,
    contratados: 0,
    competencias_avaladas: 0,
    servicios_activos: 0,
  };

  // Construccion del PDF
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28; // A4
  const PAGE_H = 841.89;
  const MARGIN = 48;
  const azul = rgb(0.118, 0.227, 0.541); // #1E3A8A
  const teal = rgb(0.031, 0.53, 0.494);
  const gris = rgb(0.4, 0.44, 0.52);
  const grisClaro = rgb(0.95, 0.96, 0.97);
  const negro = rgb(0.1, 0.12, 0.16);

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  const drawBanda = () => {
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 90,
      width: PAGE_W,
      height: 90,
      color: azul,
    });
    page.drawText(sane("Informe de Empleabilidad y Vinculacion"), {
      x: MARGIN,
      y: PAGE_H - 48,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(sane("Indicadores auditables - Acreditacion (Pilar 4)"), {
      x: MARGIN,
      y: PAGE_H - 70,
      size: 10,
      font,
      color: rgb(0.85, 0.89, 0.98),
    });
    y = PAGE_H - 90 - 28;
  };

  const nuevaPagina = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  // Asegura espacio vertical; si no hay, crea pagina nueva.
  const asegurar = (alto: number) => {
    if (y - alto < MARGIN) {
      nuevaPagina();
    }
  };

  const texto = (
    t: string,
    x: number,
    size: number,
    f: PDFFont = font,
    color = negro,
  ) => {
    page.drawText(sane(t), { x, y, size, font: f, color });
  };

  const tituloSeccion = (t: string) => {
    asegurar(34);
    y -= 8;
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: 4,
      height: 16,
      color: teal,
    });
    texto(t, MARGIN + 12, 13, fontBold, azul);
    y -= 26;
  };

  drawBanda();

  // --- KPIs globales ---
  tituloSeccion("Indicadores globales");

  const kpis: [string, number][] = [
    ["Graduados registrados", ind.total_graduados],
    ["Graduados verificados", ind.graduados_verificados],
    ["Empleos activos", ind.empleos_activos],
    ["Postulaciones totales", ind.postulaciones_totales],
    ["Contrataciones", ind.contratados],
    ["Competencias avaladas", ind.competencias_avaladas],
    ["Servicios activos", ind.servicios_activos],
  ];

  const tasaGlobal =
    ind.total_graduados > 0
      ? Math.round((ind.contratados / ind.total_graduados) * 100)
      : 0;
  kpis.push(["Tasa de insercion (%)", tasaGlobal]);

  const cols = 4;
  const gap = 10;
  const cardW = (PAGE_W - MARGIN * 2 - gap * (cols - 1)) / cols;
  const cardH = 48;

  for (let i = 0; i < kpis.length; i++) {
    const colIdx = i % cols;
    if (colIdx === 0) {
      asegurar(cardH + gap);
    }
    const cx = MARGIN + colIdx * (cardW + gap);
    const cy = y - cardH;
    // y baja solo al terminar cada fila
    page.drawRectangle({
      x: cx,
      y: cy,
      width: cardW,
      height: cardH,
      color: grisClaro,
    });
    page.drawText(sane(String(kpis[i][1])), {
      x: cx + 10,
      y: cy + cardH - 22,
      size: 18,
      font: fontBold,
      color: azul,
    });
    page.drawText(sane(kpis[i][0]), {
      x: cx + 10,
      y: cy + 8,
      size: 7,
      font,
      color: gris,
    });
    if (colIdx === cols - 1 || i === kpis.length - 1) {
      y -= cardH + gap;
    }
  }
  y -= 6;

  // --- Tabla de empleabilidad por carrera ---
  tituloSeccion("Empleabilidad por carrera");

  // columnas: Carrera | Grad | Post | Contr | Tasa | Comp
  const colX = [
    MARGIN, // Carrera
    MARGIN + 200, // Graduados
    MARGIN + 258, // Postulantes
    MARGIN + 320, // Contratados
    MARGIN + 388, // Tasa
    MARGIN + 440, // Competencias
  ];
  const rowH = 18;

  const cabeceraTabla = () => {
    asegurar(rowH + 4);
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: PAGE_W - MARGIN * 2,
      height: rowH,
      color: azul,
    });
    const th = (t: string, x: number) =>
      page.drawText(sane(t), {
        x,
        y: y + 2,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    th("Carrera", colX[0] + 4);
    th("Grad.", colX[1]);
    th("Post.", colX[2]);
    th("Contr.", colX[3]);
    th("Tasa", colX[4]);
    th("Comp.", colX[5]);
    y -= rowH + 4;
  };

  if (carreras.length === 0) {
    texto("Sin datos de empleabilidad registrados.", MARGIN, 10, font, gris);
    y -= 20;
  } else {
    cabeceraTabla();
    carreras.forEach((c, i) => {
      if (y - rowH < MARGIN) {
        nuevaPagina();
        cabeceraTabla();
      }
      if (i % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: y - 4,
          width: PAGE_W - MARGIN * 2,
          height: rowH,
          color: grisClaro,
        });
      }
      const tasa =
        c.graduados > 0 ? Math.round((c.contratados / c.graduados) * 100) : null;
      let nombre = sane(c.carrera);
      // recorta nombre largo para no invadir la siguiente columna (~190pt)
      while (font.widthOfTextAtSize(nombre, 8) > 190 && nombre.length > 3) {
        nombre = nombre.slice(0, -2);
      }
      const cell = (t: string, x: number, f: PDFFont = font, color = negro) =>
        page.drawText(sane(t), { x, y: y + 2, size: 8, font: f, color });
      cell(nombre, colX[0] + 4);
      cell(String(c.graduados), colX[1]);
      cell(String(c.postulantes), colX[2]);
      cell(String(c.contratados), colX[3]);
      const tasaColor =
        tasa === null
          ? gris
          : tasa >= 50
            ? rgb(0.02, 0.5, 0.28)
            : tasa >= 20
              ? rgb(0.72, 0.5, 0.03)
              : rgb(0.75, 0.15, 0.2);
      cell(tasa === null ? "-" : `${tasa}%`, colX[4], fontBold, tasaColor);
      cell(String(c.competencias_avaladas), colX[5]);
      y -= rowH;
    });
    y -= 8;
  }

  // --- Top brechas de competencias ---
  tituloSeccion("Brechas de competencias mas demandadas");

  const bColX = [
    MARGIN, // Competencia
    MARGIN + 210, // Area
    MARGIN + 330, // Empleos
    MARGIN + 400, // Aval
    MARGIN + 460, // Brecha
  ];

  const cabeceraBrechas = () => {
    asegurar(rowH + 4);
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: PAGE_W - MARGIN * 2,
      height: rowH,
      color: teal,
    });
    const th = (t: string, x: number) =>
      page.drawText(sane(t), {
        x,
        y: y + 2,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    th("Competencia", bColX[0] + 4);
    th("Area", bColX[1]);
    th("Piden", bColX[2]);
    th("Aval", bColX[3]);
    th("Brecha", bColX[4]);
    y -= rowH + 4;
  };

  if (brechas.length === 0) {
    texto("Sin brechas de competencias registradas.", MARGIN, 10, font, gris);
    y -= 20;
  } else {
    cabeceraBrechas();
    brechas.forEach((b, i) => {
      if (y - rowH < MARGIN) {
        nuevaPagina();
        cabeceraBrechas();
      }
      if (i % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: y - 4,
          width: PAGE_W - MARGIN * 2,
          height: rowH,
          color: grisClaro,
        });
      }
      const brecha = b.empleos_que_la_piden - b.graduados_con_aval;
      let comp = sane(b.competencia);
      while (font.widthOfTextAtSize(comp, 8) > 200 && comp.length > 3) {
        comp = comp.slice(0, -2);
      }
      let area = sane(b.area ?? "-");
      while (font.widthOfTextAtSize(area, 8) > 110 && area.length > 3) {
        area = area.slice(0, -2);
      }
      const cell = (t: string, x: number, f: PDFFont = font, color = negro) =>
        page.drawText(sane(t), { x, y: y + 2, size: 8, font: f, color });
      cell(comp, bColX[0] + 4);
      cell(area, bColX[1]);
      cell(String(b.empleos_que_la_piden), bColX[2]);
      cell(String(b.graduados_con_aval), bColX[3]);
      cell(
        (brecha > 0 ? "+" : "") + String(brecha),
        bColX[4],
        fontBold,
        brecha > 0 ? rgb(0.75, 0.15, 0.2) : rgb(0.02, 0.5, 0.28),
      );
      y -= rowH;
    });
  }

  // Pie de pagina en cada pagina
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawText(
      sane(
        `Documento auditable - Sistema de Vinculacion    Pagina ${i + 1} de ${paginas.length}`,
      ),
      {
        x: MARGIN,
        y: 24,
        size: 7,
        font,
        color: gris,
      },
    );
  });

  const bytes = await pdf.save();

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="informe-empleabilidad.pdf"',
    },
  });
}
