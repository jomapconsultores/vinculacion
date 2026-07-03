import { NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ImageRun, VerticalAlign,
} from "docx";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFImage } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import type { CVAnalisis } from "@/lib/cv-types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Paleta
const NAVY = rgb(0.118, 0.227, 0.541);
const TEAL = rgb(0.051, 0.58, 0.533);
const TEAL_LIGHT = rgb(0.941, 0.992, 0.98);
const TEAL_200 = rgb(0.6, 0.93, 0.85);
const TEXT = rgb(0.2, 0.25, 0.33);
const MUTED = rgb(0.39, 0.45, 0.55);
const RULE = rgb(0.8, 0.84, 0.89);
const WHITE = rgb(1, 1, 1);

const hex = { navy: "1E3A8A", teal: "0D9488", tealLight: "F0FDFA", text: "334155", muted: "64748B", rule: "CBD5E1", white: "FFFFFF" };

function join(parts: (string | null | undefined)[], sep = " · "): string {
  return parts.filter((p) => p != null && String(p).trim() !== "").map(String).join(sep);
}
const has = (s?: string | null) => s != null && String(s).trim() !== "";
const capsPeriodo = (c: any) => join([c.institucion, c.horas ? `${c.horas} h` : null, c.anio ? String(c.anio) : null]);

async function loadImageBytes(url?: string | null): Promise<{ bytes: Uint8Array; kind: "jpg" | "png" } | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, kind: "jpg" };
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return { bytes, kind: "png" };
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// PDF (pdf-lib)
// ============================================================
function sanitize(text: string): string {
  if (!text) return "";
  return text
    .replace(/[—–‒―]/g, "-")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[•●▪]/g, "-")
    .replace(/[^\x00-\xFF]/g, "");
}

async function generarPDF(cv: CVAnalisis): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const H = await doc.embedFont(StandardFonts.Helvetica);
  const HB = await doc.embedFont(StandardFonts.HelveticaBold);
  const HO = await doc.embedFont(StandardFonts.HelveticaOblique);

  const W = 612, PH = 792, M = 48;
  const CW = W - M * 2;
  const BAND = 140;

  let page = doc.addPage([W, PH]);
  let y = PH;
  let pageNum = 1;

  const foto = await loadImageBytes(cv.foto_url);

  function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
    const words = sanitize(text).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function footer() {
    page.drawText(`Página ${pageNum}`, { x: W / 2 - 18, y: 26, size: 8, font: H, color: MUTED });
  }
  function newPage() {
    footer();
    page = doc.addPage([W, PH]);
    pageNum++;
    y = PH - M;
  }
  function ensure(h: number) {
    if (y - h < M + 20) newPage();
  }

  function text(s: string, x: number, size: number, font: PDFFont, color = TEXT) {
    page.drawText(sanitize(s), { x, y, size, font, color });
  }
  function paragraph(s: string, size = 9.5, x = M, maxW = CW, color = TEXT, lh = 1.35) {
    for (const ln of wrap(s, H, size, maxW)) {
      ensure(size * lh);
      page.drawText(ln, { x, y: y - size, size, font: H, color });
      y -= size * lh;
    }
  }
  function bullet(s: string, size = 9.5) {
    const x = M + 12;
    const maxW = CW - 12;
    const lines = wrap(s, H, size, maxW);
    lines.forEach((ln, i) => {
      ensure(size * 1.35);
      if (i === 0) page.drawText("•", { x: M + 2, y: y - size, size, font: HB, color: TEAL });
      page.drawText(ln, { x, y: y - size, size, font: H, color: TEXT });
      y -= size * 1.35;
    });
  }
  function section(title: string) {
    ensure(30);
    y -= 14;
    page.drawText(title.toUpperCase(), { x: M, y: y - 11, size: 11, font: HB, color: NAVY });
    y -= 15;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: RULE });
    y -= 10;
  }

  // ---- Banda de encabezado ----
  page.drawRectangle({ x: 0, y: PH - BAND, width: W, height: BAND, color: NAVY });
  const nombre = has(cv.datos?.nombre) ? cv.datos!.nombre! : "Hoja de vida";
  page.drawText(sanitize(nombre), { x: M, y: PH - 56, size: 24, font: HB, color: WHITE });
  const subt = join([cv.nivel_profesional, cv.perfil_unesco?.area_principal ? `${cv.perfil_unesco.area_principal.codigo} · ${cv.perfil_unesco.area_principal.nombre}` : null]);
  if (subt) page.drawText(sanitize(subt), { x: M, y: PH - 78, size: 11, font: HB, color: TEAL_200 });
  const contacto = join([cv.datos?.email, cv.datos?.telefono, cv.datos?.ciudad, cv.datos?.linkedin]);
  if (contacto) {
    const [primeraLinea] = wrap(contacto, H, 9, CW - 110);
    if (primeraLinea) {
      page.drawText(primeraLinea, { x: M, y: PH - 100, size: 9, font: H, color: rgb(0.85, 0.89, 0.97) });
    }
  }
  // Foto
  if (foto) {
    try {
      const img: PDFImage = foto.kind === "jpg" ? await doc.embedJpg(foto.bytes) : await doc.embedPng(foto.bytes);
      const s = 86;
      const fx = W - M - s, fy = PH - BAND + (BAND - s) / 2;
      page.drawRectangle({ x: fx - 3, y: fy - 3, width: s + 6, height: s + 6, color: WHITE });
      page.drawImage(img, { x: fx, y: fy, width: s, height: s });
    } catch {}
  }
  y = PH - BAND - 22;

  // ---- Bloque UNESCO ----
  const ap = cv.perfil_unesco?.area_principal;
  if (ap) {
    const pad = 12;
    const innerW = CW - pad * 2 - 6;
    const just = has(ap.justificacion) ? wrap(ap.justificacion, H, 9.5, innerW) : [];
    const sec = cv.perfil_unesco.areas_secundarias?.length
      ? wrap("Áreas secundarias: " + cv.perfil_unesco.areas_secundarias.map((s) => `${s.codigo} · ${s.nombre}`).join(", "), H, 9, innerW)
      : [];
    const boxH = 18 + 16 + just.length * 13 + (sec.length ? sec.length * 12 + 4 : 0) + pad;
    ensure(boxH + 4);
    page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: TEAL_LIGHT });
    page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: TEAL });
    let ty = y - pad - 4;
    page.drawText("PERFIL PROFESIONAL · ÁREAS UNESCO", { x: M + pad + 6, y: ty - 8, size: 8.5, font: HB, color: TEAL });
    ty -= 20;
    page.drawText(sanitize(`${ap.codigo} · ${ap.nombre}`), { x: M + pad + 6, y: ty - 10, size: 12, font: HB, color: NAVY });
    ty -= 18;
    for (const ln of just) { page.drawText(ln, { x: M + pad + 6, y: ty - 9, size: 9.5, font: H, color: TEXT }); ty -= 13; }
    if (sec.length) { ty -= 4; for (const ln of sec) { page.drawText(ln, { x: M + pad + 6, y: ty - 9, size: 9, font: HO, color: MUTED }); ty -= 12; } }
    y -= boxH;
  }

  // ---- Perfil profesional ----
  if (has(cv.resumen)) { section("Perfil profesional"); paragraph(cv.resumen); }

  // ---- Experiencia ----
  if (cv.experiencia?.length) {
    section("Experiencia profesional");
    for (const e of cv.experiencia) {
      ensure(28);
      page.drawText(sanitize(e.cargo || ""), { x: M, y: y - 11, size: 11, font: HB, color: NAVY });
      if (has(e.periodo)) {
        const pw = H.widthOfTextAtSize(sanitize(e.periodo), 9);
        page.drawText(sanitize(e.periodo), { x: W - M - pw, y: y - 10, size: 9, font: H, color: MUTED });
      }
      y -= 15;
      if (has(e.empresa)) { page.drawText(sanitize(e.empresa), { x: M, y: y - 10, size: 10, font: HO, color: TEAL }); y -= 15; }
      for (const l of e.logros || []) bullet(l);
      y -= 6;
    }
  }

  // ---- Educación ----
  if (cv.educacion?.length) {
    section("Educación");
    for (const e of cv.educacion) {
      ensure(20);
      page.drawText(sanitize(e.titulo || ""), { x: M, y: y - 11, size: 10.5, font: HB, color: TEXT });
      if (has(e.periodo)) {
        const pw = H.widthOfTextAtSize(sanitize(e.periodo), 9);
        page.drawText(sanitize(e.periodo), { x: W - M - pw, y: y - 10, size: 9, font: H, color: MUTED });
      }
      y -= 14;
      if (has(e.institucion)) { page.drawText(sanitize(e.institucion), { x: M, y: y - 10, size: 9.5, font: H, color: MUTED }); y -= 15; }
    }
  }

  // ---- Capacitaciones ----
  if (cv.capacitaciones?.length) {
    section("Capacitaciones");
    for (const c of cv.capacitaciones) bullet(join([c.nombre, capsPeriodo(c)], " — "));
  }

  // ---- Certificaciones ----
  if (cv.certificaciones_detectadas?.length) {
    section("Certificaciones");
    for (const c of cv.certificaciones_detectadas) bullet(join([c.nombre, join([c.emisor, c.fecha])], " — "));
  }

  // ---- Habilidades ----
  if (cv.habilidades?.length) { section("Habilidades"); paragraph(cv.habilidades.join("  ·  ")); }

  footer();
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ============================================================
// WORD (docx)
// ============================================================
function runsWhite(text: string, size: number, bold = false, color = hex.white) {
  return new TextRun({ text, size, bold, color });
}
function heading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex.rule, space: 2 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24, color: hex.navy })],
  });
}
function bulletP(text: string) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text, size: 20, color: hex.text })] });
}

async function generarWord(cv: CVAnalisis): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  const nombre = has(cv.datos?.nombre) ? cv.datos!.nombre! : "Hoja de vida";
  const subt = join([cv.nivel_profesional, cv.perfil_unesco?.area_principal ? `${cv.perfil_unesco.area_principal.codigo} · ${cv.perfil_unesco.area_principal.nombre}` : null]);
  const contacto = join([cv.datos?.email, cv.datos?.telefono, cv.datos?.ciudad, cv.datos?.linkedin]);

  const headTextCell = new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: hex.navy },
    margins: { top: 160, bottom: 160, left: 220, right: 160 },
    children: [
      new Paragraph({ children: [runsWhite(nombre, 44, true)] }),
      ...(subt ? [new Paragraph({ spacing: { before: 40 }, children: [runsWhite(subt, 20, true, "A7F3D0")] })] : []),
      ...(contacto ? [new Paragraph({ spacing: { before: 40 }, children: [runsWhite(contacto, 17, false, "DBEAFE")] })] : []),
    ],
  });

  const foto = await loadImageBytes(cv.foto_url);
  const cells = [headTextCell];
  if (foto) {
    cells.push(
      new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: hex.navy },
        width: { size: 22, type: WidthType.PERCENTAGE },
        margins: { top: 120, bottom: 120, left: 60, right: 160 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: foto.bytes, type: foto.kind, transformation: { width: 92, height: 92 } } as any)],
          }),
        ],
      })
    );
  }
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
      rows: [new TableRow({ children: cells })],
    })
  );

  // Bloque UNESCO
  const ap = cv.perfil_unesco?.area_principal;
  if (ap) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 40 },
        shading: { fill: hex.tealLight },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: hex.teal, space: 8 } },
        children: [new TextRun({ text: "PERFIL PROFESIONAL · ÁREAS UNESCO", bold: true, size: 16, color: hex.teal })],
      }),
      new Paragraph({
        shading: { fill: hex.tealLight },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: hex.teal, space: 8 } },
        children: [new TextRun({ text: `${ap.codigo} · ${ap.nombre}`, bold: true, size: 24, color: hex.navy })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        shading: { fill: hex.tealLight },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: hex.teal, space: 8 } },
        children: [new TextRun({ text: ap.justificacion || "", size: 19, color: hex.text })],
      })
    );
    if (cv.perfil_unesco.areas_secundarias?.length) {
      children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Áreas secundarias: " + cv.perfil_unesco.areas_secundarias.map((s) => `${s.codigo} · ${s.nombre}`).join(", "), italics: true, size: 18, color: hex.muted })] }));
    }
  }

  if (has(cv.resumen)) {
    children.push(heading("Perfil profesional"), new Paragraph({ children: [new TextRun({ text: cv.resumen, size: 20, color: hex.text })] }));
  }

  if (cv.experiencia?.length) {
    children.push(heading("Experiencia profesional"));
    for (const e of cv.experiencia) {
      children.push(
        new Paragraph({
          spacing: { before: 80 },
          tabStops: [{ type: "right" as any, position: 9600 }],
          children: [
            new TextRun({ text: e.cargo || "", bold: true, size: 21, color: hex.navy }),
            ...(has(e.periodo) ? [new TextRun({ text: `\t${e.periodo}`, size: 18, color: hex.muted })] : []),
          ],
        })
      );
      if (has(e.empresa)) children.push(new Paragraph({ children: [new TextRun({ text: e.empresa, italics: true, size: 19, color: hex.teal })] }));
      for (const l of e.logros || []) children.push(bulletP(l));
    }
  }

  if (cv.educacion?.length) {
    children.push(heading("Educación"));
    for (const e of cv.educacion) {
      children.push(
        new Paragraph({
          spacing: { before: 60 },
          tabStops: [{ type: "right" as any, position: 9600 }],
          children: [
            new TextRun({ text: e.titulo || "", bold: true, size: 20, color: hex.text }),
            ...(has(e.periodo) ? [new TextRun({ text: `\t${e.periodo}`, size: 18, color: hex.muted })] : []),
          ],
        }),
        ...(has(e.institucion) ? [new Paragraph({ children: [new TextRun({ text: e.institucion, size: 19, color: hex.muted })] })] : [])
      );
    }
  }

  if (cv.capacitaciones?.length) {
    children.push(heading("Capacitaciones"));
    for (const c of cv.capacitaciones) children.push(bulletP(join([c.nombre, capsPeriodo(c)], " — ")));
  }

  if (cv.certificaciones_detectadas?.length) {
    children.push(heading("Certificaciones"));
    for (const c of cv.certificaciones_detectadas) children.push(bulletP(join([c.nombre, join([c.emisor, c.fecha])], " — ")));
  }

  if (cv.habilidades?.length) {
    children.push(heading("Habilidades"), new Paragraph({ children: [new TextRun({ text: cv.habilidades.join("  ·  "), size: 20, color: hex.text })] }));
  }

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }],
  });
  return await Packer.toBuffer(doc);
}

// ============================================================
// Handler
// ============================================================
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: { formato?: string; cv?: CVAnalisis };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { formato, cv } = body;
  if (!cv || (formato !== "word" && formato !== "pdf")) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    if (formato === "word") {
      const buf = await generarWord(cv);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": 'attachment; filename="hoja-de-vida.docx"',
        },
      });
    }
    const buf = await generarPDF(cv);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="hoja-de-vida.pdf"' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: `No se pudo generar el archivo: ${e?.message || e}` }, { status: 500 });
  }
}
