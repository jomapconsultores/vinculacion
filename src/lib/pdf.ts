// Generador genérico de reportes PDF (pdf-lib), reutilizable por todos los
// endpoints de reportes. Produce un A4 con banda de encabezado azul, secciones
// con tablas (encabezado + filas cebra, columnas auto-ajustadas y paginación)
// y pie de página numerado. Mantiene el estilo del informe de empleabilidad.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";

export type SeccionPdf = {
  titulo: string;
  encabezados: string[];
  filas: (string | number)[][];
  // Pesos relativos de ancho por columna (opcional). Si se omite, se calculan
  // a partir del contenido más largo de cada columna.
  pesos?: number[];
};

export type ReportePdfOpts = {
  titulo: string;
  subtitulo?: string;
  generado?: string;
  secciones: SeccionPdf[];
};

// Sanitiza a Latin-1 (WinAnsi) para no romper las fuentes estándar de pdf-lib.
function sane(input: unknown): string {
  return String(input ?? "")
    .replace(/[—–]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, "...")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, "");
}

export async function reportePdf(opts: ReportePdfOpts): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 42;
  const azul = rgb(0.118, 0.227, 0.541);
  const teal = rgb(0.031, 0.53, 0.494);
  const gris = rgb(0.4, 0.44, 0.52);
  const grisClaro = rgb(0.95, 0.96, 0.97);
  const negro = rgb(0.1, 0.12, 0.16);
  const blanco = rgb(1, 1, 1);
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  const banda = () => {
    page.drawRectangle({ x: 0, y: PAGE_H - 84, width: PAGE_W, height: 84, color: azul });
    page.drawText(sane(opts.titulo), {
      x: MARGIN,
      y: PAGE_H - 42,
      size: 17,
      font: fontBold,
      color: blanco,
    });
    if (opts.subtitulo) {
      page.drawText(sane(opts.subtitulo), {
        x: MARGIN,
        y: PAGE_H - 62,
        size: 9.5,
        font,
        color: rgb(0.85, 0.89, 0.98),
      });
    }
    if (opts.generado) {
      page.drawText(sane(`Generado: ${opts.generado}`), {
        x: MARGIN,
        y: PAGE_H - 76,
        size: 8,
        font,
        color: rgb(0.78, 0.83, 0.95),
      });
    }
    y = PAGE_H - 84 - 26;
  };

  const nuevaPagina = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const asegurar = (alto: number) => {
    if (y - alto < MARGIN + 16) nuevaPagina();
  };

  // Recorta texto para que quepa en `ancho` puntos a `size`.
  const recortar = (t: string, ancho: number, size: number, f: PDFFont): string => {
    let s = sane(t);
    if (f.widthOfTextAtSize(s, size) <= ancho) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + "…", size) > ancho) s = s.slice(0, -1);
    return s + "…";
  };

  const tituloSeccion = (t: string) => {
    asegurar(30);
    y -= 6;
    page.drawRectangle({ x: MARGIN, y: y - 4, width: 3.5, height: 15, color: teal });
    page.drawText(sane(t), { x: MARGIN + 11, y, size: 12.5, font: fontBold, color: azul });
    y -= 24;
  };

  banda();

  for (const sec of opts.secciones) {
    tituloSeccion(sec.titulo);

    const nCols = sec.encabezados.length;
    // Detecta columnas numéricas (todas sus celdas son number) para alinear a la derecha.
    const numerica = new Array(nCols).fill(true).map((_, c) =>
      sec.filas.length > 0 ? sec.filas.every((f) => typeof f[c] === "number") : false
    );
    // Pesos por contenido si no se dan.
    const pesos =
      sec.pesos ??
      sec.encabezados.map((h, c) => {
        let max = h.length;
        for (const f of sec.filas) max = Math.max(max, String(f[c] ?? "").length);
        return Math.max(max, 3);
      });
    const sumaPesos = pesos.reduce((a, b) => a + b, 0) || 1;
    const anchos = pesos.map((p) => (CONTENT_W * p) / sumaPesos);
    const xs: number[] = [];
    let acc = MARGIN;
    for (let c = 0; c < nCols; c++) {
      xs.push(acc);
      acc += anchos[c];
    }

    const rowH = 16;
    const pad = 4;

    const cabecera = () => {
      asegurar(rowH + 6);
      page.drawRectangle({ x: MARGIN, y: y - 4, width: CONTENT_W, height: rowH, color: azul });
      for (let c = 0; c < nCols; c++) {
        const t = recortar(sec.encabezados[c], anchos[c] - pad * 2, 8, fontBold);
        const w = fontBold.widthOfTextAtSize(t, 8);
        const x = numerica[c] ? xs[c] + anchos[c] - pad - w : xs[c] + pad;
        page.drawText(t, { x, y: y + 1.5, size: 8, font: fontBold, color: blanco });
      }
      y -= rowH + 4;
    };

    if (sec.filas.length === 0) {
      page.drawText(sane("Sin datos para este reporte."), {
        x: MARGIN,
        y,
        size: 9,
        font,
        color: gris,
      });
      y -= 18;
      continue;
    }

    cabecera();
    sec.filas.forEach((fila, i) => {
      if (y - rowH < MARGIN + 16) {
        nuevaPagina();
        cabecera();
      }
      if (i % 2 === 1) {
        page.drawRectangle({ x: MARGIN, y: y - 4, width: CONTENT_W, height: rowH, color: grisClaro });
      }
      for (let c = 0; c < nCols; c++) {
        const bold = c === 0 ? false : false;
        const t = recortar(String(fila[c] ?? ""), anchos[c] - pad * 2, 8, font);
        const w = font.widthOfTextAtSize(t, 8);
        const x = numerica[c] ? xs[c] + anchos[c] - pad - w : xs[c] + pad;
        page.drawText(t, { x, y: y + 1.5, size: 8, font: bold ? fontBold : font, color: negro });
      }
      y -= rowH;
    });
    y -= 8;
  }

  // Pie de página numerado.
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawText(sane(`Documento generado por el Sistema de Vinculación    Página ${i + 1} de ${paginas.length}`), {
      x: MARGIN,
      y: 22,
      size: 7,
      font,
      color: gris,
    });
  });

  return pdf.save();
}
