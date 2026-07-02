import { NextRequest } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import type { CVAnalisis } from "@/lib/cv-types";

export const runtime = "nodejs";
export const maxDuration = 30;

// ---------------------------------------------------------------------------
// Utilidades comunes
// ---------------------------------------------------------------------------

/** Reemplaza caracteres que WinAnsi (StandardFonts de pdf-lib) no soporta. */
function sanitize(text: string): string {
  if (!text) return "";
  return text
    .replace(/[—–‒―]/g, "-") // guiones tipográficos → -
    .replace(/[‘’‚‛]/g, "'") // comillas simples
    .replace(/[“”„‟]/g, '"') // comillas dobles
    .replace(/…/g, "...") // elipsis
    .replace(/[   ]/g, " ") // espacios no separables
    .replace(/[•●▪]/g, "-") // viñetas
    .replace(/[^\x00-\xFF]/g, ""); // cualquier otro fuera de Latin-1
}

/** Une partes no vacías con un separador. */
function join(parts: (string | null | undefined)[], sep = " · "): string {
  return parts.filter((p) => p != null && String(p).trim() !== "").join(sep);
}

function nonEmpty(s?: string | null): boolean {
  return s != null && String(s).trim() !== "";
}

// ---------------------------------------------------------------------------
// Generación Word (.docx)
// ---------------------------------------------------------------------------

async function generarWord(cv: CVAnalisis): Promise<Buffer> {
  const children: Paragraph[] = [];

  const sectionHeading = (text: string): Paragraph =>
    new Paragraph({
      spacing: { before: 260, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "2563EB", space: 2 },
      },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 24, // 12pt
          color: "1E3A8A",
        }),
      ],
    });

  // 1. Encabezado
  const nombre = nonEmpty(cv.datos?.nombre) ? cv.datos.nombre! : "Hoja de vida";
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 40 },
      children: [new TextRun({ text: nombre, bold: true, size: 44, color: "111827" })],
    })
  );

  if (nonEmpty(cv.nivel_profesional)) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: cv.nivel_profesional!, italics: true, size: 22, color: "374151" }),
        ],
      })
    );
  }

  const contacto = join([
    cv.datos?.email,
    cv.datos?.telefono,
    cv.datos?.ciudad,
    cv.datos?.linkedin,
  ]);
  if (contacto) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: contacto, size: 20, color: "4B5563" })],
      })
    );
  }

  // 2. Perfil profesional
  if (nonEmpty(cv.resumen)) {
    children.push(sectionHeading("Perfil profesional"));
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: cv.resumen.trim(), size: 22 })],
      })
    );
  }

  // 3. Perfil según áreas UNESCO
  const pu = cv.perfil_unesco;
  if (pu?.area_principal && nonEmpty(pu.area_principal.nombre)) {
    children.push(sectionHeading("Perfil según áreas UNESCO"));
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "Área principal: ", bold: true, size: 22 }),
          new TextRun({
            text: join([pu.area_principal.codigo, pu.area_principal.nombre], " - "),
            size: 22,
          }),
        ],
      })
    );
    if (nonEmpty(pu.area_principal.justificacion)) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: pu.area_principal.justificacion.trim(), italics: true, size: 20 }),
          ],
        })
      );
    }
    const secundarias = (pu.areas_secundarias || [])
      .filter((a) => a && nonEmpty(a.nombre))
      .map((a) => join([a.codigo, a.nombre], " - "));
    if (secundarias.length) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "Áreas secundarias: ", bold: true, size: 22 }),
            new TextRun({ text: secundarias.join("; "), size: 22 }),
          ],
        })
      );
    }
  }

  // 4. Experiencia
  const experiencia = (cv.experiencia || []).filter(
    (e) => e && (nonEmpty(e.cargo) || nonEmpty(e.empresa))
  );
  if (experiencia.length) {
    children.push(sectionHeading("Experiencia"));
    for (const exp of experiencia) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [
            new TextRun({ text: nonEmpty(exp.cargo) ? exp.cargo : "", bold: true, size: 22 }),
            ...(nonEmpty(exp.empresa)
              ? [new TextRun({ text: ` — ${exp.empresa}`, size: 22, color: "374151" })]
              : []),
            ...(nonEmpty(exp.periodo)
              ? [new TextRun({ text: `  (${exp.periodo})`, italics: true, size: 20, color: "6B7280" })]
              : []),
          ],
        })
      );
      for (const logro of exp.logros || []) {
        if (!nonEmpty(logro)) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [new TextRun({ text: logro.trim(), size: 20 })],
          })
        );
      }
    }
  }

  // 5. Educación
  const educacion = (cv.educacion || []).filter(
    (e) => e && (nonEmpty(e.titulo) || nonEmpty(e.institucion))
  );
  if (educacion.length) {
    children.push(sectionHeading("Educación"));
    for (const ed of educacion) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 20 },
          children: [
            new TextRun({ text: nonEmpty(ed.titulo) ? ed.titulo : "", bold: true, size: 22 }),
            ...(nonEmpty(ed.institucion)
              ? [new TextRun({ text: ` — ${ed.institucion}`, size: 22, color: "374151" })]
              : []),
            ...(nonEmpty(ed.periodo)
              ? [new TextRun({ text: `  (${ed.periodo})`, italics: true, size: 20, color: "6B7280" })]
              : []),
          ],
        })
      );
    }
  }

  // 6. Capacitaciones
  const capacitaciones = (cv.capacitaciones || []).filter((c) => c && nonEmpty(c.nombre));
  if (capacitaciones.length) {
    children.push(sectionHeading("Capacitaciones"));
    for (const cap of capacitaciones) {
      const detalles = join(
        [
          nonEmpty(cap.institucion) ? cap.institucion : null,
          cap.horas != null ? `${cap.horas} h` : null,
          cap.anio != null ? String(cap.anio) : null,
        ],
        " · "
      );
      const esCert = nonEmpty(cap.fuente) && /certificad/i.test(cap.fuente!);
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          children: [
            new TextRun({ text: cap.nombre.trim(), bold: true, size: 20 }),
            ...(detalles ? [new TextRun({ text: ` — ${detalles}`, size: 20, color: "374151" })] : []),
            ...(esCert
              ? [new TextRun({ text: "  [certificado]", italics: true, size: 18, color: "2563EB" })]
              : []),
          ],
        })
      );
    }
  }

  // 7. Certificaciones
  const certificaciones = (cv.certificaciones_detectadas || []).filter((c) => c && nonEmpty(c.nombre));
  if (certificaciones.length) {
    children.push(sectionHeading("Certificaciones"));
    for (const cert of certificaciones) {
      const detalles = join(
        [
          nonEmpty(cert.emisor) ? cert.emisor : null,
          nonEmpty(cert.fecha) ? cert.fecha : null,
        ],
        " · "
      );
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          children: [
            new TextRun({ text: cert.nombre.trim(), bold: true, size: 20 }),
            ...(detalles ? [new TextRun({ text: ` — ${detalles}`, size: 20, color: "374151" })] : []),
          ],
        })
      );
    }
  }

  // 8. Habilidades
  const habilidades = (cv.habilidades || []).filter((h) => nonEmpty(h)).map((h) => h.trim());
  if (habilidades.length) {
    children.push(sectionHeading("Habilidades"));
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: habilidades.join(", "), size: 22 })],
      })
    );
  }

  // 9. Recomendaciones (opcional)
  const recomendaciones = (cv.recomendaciones || []).filter((r) => nonEmpty(r));
  if (recomendaciones.length) {
    children.push(sectionHeading("Recomendaciones"));
    for (const rec of recomendaciones) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          children: [new TextRun({ text: rec.trim(), size: 20 })],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
          },
        },
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------------
// Generación PDF (pdf-lib) con flujo de texto
// ---------------------------------------------------------------------------

async function generarPdf(cv: CVAnalisis): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Tamaño carta
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BOTTOM = MARGIN;

  const colorTitle = rgb(0.117, 0.227, 0.541); // #1E3A8A
  const colorAccent = rgb(0.145, 0.388, 0.922); // #2563EB
  const colorText = rgb(0.13, 0.13, 0.13);
  const colorMuted = rgb(0.3, 0.32, 0.36);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < BOTTOM) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  // Envuelve texto por ancho midiendo con la fuente.
  const wrapText = (
    text: string,
    f: PDFFont,
    size: number,
    maxWidth: number
  ): string[] => {
    const words = sanitize(text).split(/\s+/).filter((w) => w.length > 0);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (f.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = word;
        // Palabra individual más ancha que la línea: partir por caracteres.
        while (f.widthOfTextAtSize(current, size) > maxWidth && current.length > 1) {
          let cut = current.length - 1;
          while (cut > 1 && f.widthOfTextAtSize(current.slice(0, cut), size) > maxWidth) {
            cut--;
          }
          lines.push(current.slice(0, cut));
          current = current.slice(cut);
        }
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  const drawParagraph = (
    text: string,
    opts: {
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      lineGap?: number;
      spaceAfter?: number;
      bullet?: boolean;
    } = {}
  ) => {
    const size = opts.size ?? 10;
    const f = opts.font ?? font;
    const color = opts.color ?? colorText;
    const indent = opts.indent ?? 0;
    const lineGap = opts.lineGap ?? 3;
    const lineHeight = size + lineGap;
    const bulletIndent = opts.bullet ? 12 : 0;
    const x = MARGIN + indent + bulletIndent;
    const maxWidth = CONTENT_W - indent - bulletIndent;

    const lines = wrapText(text, f, size, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(lineHeight);
      if (opts.bullet && i === 0) {
        page.drawText("-", {
          x: MARGIN + indent,
          y,
          size,
          font: fontBold,
          color,
        });
      }
      page.drawText(lines[i], { x, y, size, font: f, color });
      y -= lineHeight;
    }
    if (opts.spaceAfter) y -= opts.spaceAfter;
  };

  // Título de sección con línea separadora.
  const drawSection = (title: string) => {
    ensureSpace(30);
    y -= 8;
    ensureSpace(24);
    page.drawText(sanitize(title.toUpperCase()), {
      x: MARGIN,
      y,
      size: 12,
      font: fontBold,
      color: colorTitle,
    });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1,
      color: colorAccent,
    });
    y -= 12;
  };

  // --- Encabezado ---
  const nombre = nonEmpty(cv.datos?.nombre) ? cv.datos.nombre! : "Hoja de vida";
  ensureSpace(28);
  page.drawText(sanitize(nombre), {
    x: MARGIN,
    y,
    size: 22,
    font: fontBold,
    color: rgb(0.067, 0.094, 0.153),
  });
  y -= 26;

  if (nonEmpty(cv.nivel_profesional)) {
    drawParagraph(cv.nivel_profesional!, {
      size: 11,
      font: fontItalic,
      color: colorMuted,
      spaceAfter: 2,
    });
  }

  const contacto = join([
    cv.datos?.email,
    cv.datos?.telefono,
    cv.datos?.ciudad,
    cv.datos?.linkedin,
  ]);
  if (contacto) {
    drawParagraph(contacto, { size: 9.5, color: colorMuted, spaceAfter: 4 });
  }

  // --- Perfil profesional ---
  if (nonEmpty(cv.resumen)) {
    drawSection("Perfil profesional");
    drawParagraph(cv.resumen.trim(), { size: 10, spaceAfter: 4 });
  }

  // --- Perfil UNESCO ---
  const pu = cv.perfil_unesco;
  if (pu?.area_principal && nonEmpty(pu.area_principal.nombre)) {
    drawSection("Perfil según áreas UNESCO");
    drawParagraph(
      "Área principal: " + join([pu.area_principal.codigo, pu.area_principal.nombre], " - "),
      { size: 10, font: fontBold, spaceAfter: 2 }
    );
    if (nonEmpty(pu.area_principal.justificacion)) {
      drawParagraph(pu.area_principal.justificacion.trim(), {
        size: 9.5,
        font: fontItalic,
        color: colorMuted,
        spaceAfter: 3,
      });
    }
    const secundarias = (pu.areas_secundarias || [])
      .filter((a) => a && nonEmpty(a.nombre))
      .map((a) => join([a.codigo, a.nombre], " - "));
    if (secundarias.length) {
      drawParagraph("Áreas secundarias: " + secundarias.join("; "), {
        size: 10,
        spaceAfter: 4,
      });
    }
  }

  // --- Experiencia ---
  const experiencia = (cv.experiencia || []).filter(
    (e) => e && (nonEmpty(e.cargo) || nonEmpty(e.empresa))
  );
  if (experiencia.length) {
    drawSection("Experiencia");
    for (const exp of experiencia) {
      const encabezado = join(
        [
          nonEmpty(exp.cargo) ? exp.cargo : null,
          nonEmpty(exp.empresa) ? exp.empresa : null,
        ],
        " - "
      );
      const periodo = nonEmpty(exp.periodo) ? `  (${exp.periodo})` : "";
      drawParagraph(encabezado + periodo, { size: 10.5, font: fontBold, spaceAfter: 1 });
      for (const logro of exp.logros || []) {
        if (!nonEmpty(logro)) continue;
        drawParagraph(logro.trim(), { size: 9.5, bullet: true, spaceAfter: 1 });
      }
      y -= 4;
    }
  }

  // --- Educación ---
  const educacion = (cv.educacion || []).filter(
    (e) => e && (nonEmpty(e.titulo) || nonEmpty(e.institucion))
  );
  if (educacion.length) {
    drawSection("Educación");
    for (const ed of educacion) {
      const texto = join(
        [nonEmpty(ed.titulo) ? ed.titulo : null, nonEmpty(ed.institucion) ? ed.institucion : null],
        " - "
      );
      const periodo = nonEmpty(ed.periodo) ? `  (${ed.periodo})` : "";
      drawParagraph(texto + periodo, { size: 10, font: fontBold, spaceAfter: 3 });
    }
  }

  // --- Capacitaciones ---
  const capacitaciones = (cv.capacitaciones || []).filter((c) => c && nonEmpty(c.nombre));
  if (capacitaciones.length) {
    drawSection("Capacitaciones");
    for (const cap of capacitaciones) {
      const detalles = join(
        [
          nonEmpty(cap.institucion) ? cap.institucion : null,
          cap.horas != null ? `${cap.horas} h` : null,
          cap.anio != null ? String(cap.anio) : null,
        ],
        " · "
      );
      const esCert = nonEmpty(cap.fuente) && /certificad/i.test(cap.fuente!);
      let texto = cap.nombre.trim();
      if (detalles) texto += " - " + detalles;
      if (esCert) texto += " [certificado]";
      drawParagraph(texto, { size: 9.5, bullet: true, spaceAfter: 1 });
    }
    y -= 3;
  }

  // --- Certificaciones ---
  const certificaciones = (cv.certificaciones_detectadas || []).filter((c) => c && nonEmpty(c.nombre));
  if (certificaciones.length) {
    drawSection("Certificaciones");
    for (const cert of certificaciones) {
      const detalles = join(
        [nonEmpty(cert.emisor) ? cert.emisor : null, nonEmpty(cert.fecha) ? cert.fecha : null],
        " · "
      );
      let texto = cert.nombre.trim();
      if (detalles) texto += " - " + detalles;
      drawParagraph(texto, { size: 9.5, bullet: true, spaceAfter: 1 });
    }
    y -= 3;
  }

  // --- Habilidades ---
  const habilidades = (cv.habilidades || []).filter((h) => nonEmpty(h)).map((h) => h.trim());
  if (habilidades.length) {
    drawSection("Habilidades");
    drawParagraph(habilidades.join(", "), { size: 10, spaceAfter: 4 });
  }

  // --- Recomendaciones ---
  const recomendaciones = (cv.recomendaciones || []).filter((r) => nonEmpty(r));
  if (recomendaciones.length) {
    drawSection("Recomendaciones");
    for (const rec of recomendaciones) {
      drawParagraph(rec.trim(), { size: 9.5, bullet: true, spaceAfter: 1 });
    }
  }

  return doc.save();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Body
  let body: { formato?: unknown; cv?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formato = body?.formato;
  const cv = body?.cv as CVAnalisis | undefined;

  if (formato !== "word" && formato !== "pdf") {
    return new Response(
      JSON.stringify({ error: "El campo 'formato' debe ser 'word' o 'pdf'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!cv || typeof cv !== "object" || typeof (cv as CVAnalisis).datos !== "object") {
    return new Response(JSON.stringify({ error: "Falta el objeto 'cv' o es inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (formato === "word") {
      const buffer = await generarWord(cv);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": 'attachment; filename="hoja-de-vida.docx"',
          "Cache-Control": "no-store",
        },
      });
    } else {
      const bytes = await generarPdf(cv);
      return new Response(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="hoja-de-vida.pdf"',
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (err) {
    console.error("Error generando la hoja de vida:", err);
    return new Response(
      JSON.stringify({ error: "No se pudo generar el archivo" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
