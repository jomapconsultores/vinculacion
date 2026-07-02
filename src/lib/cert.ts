import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

const NAVY = rgb(0.118, 0.227, 0.541);
const TEAL = rgb(0.051, 0.58, 0.533);
const GRAY = rgb(0.3, 0.35, 0.42);
const GOLD = rgb(0.72, 0.55, 0.16);

function san(t: string) {
  return (t || "").replace(/[—–]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/[^\x00-\xFF]/g, "");
}

export type CertData = {
  nombre: string;
  competencia: string;
  area?: string | null;
  avaladaPor?: string | null;
  fecha?: string | null;
  curso?: string | null;
  codigo: string;
  verifyUrl: string;
};

export async function generarCertificadoPDF(d: CertData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const W = 792, H = 612;
  const page = doc.addPage([W, H]);
  const F = await doc.embedFont(StandardFonts.Helvetica);
  const FB = await doc.embedFont(StandardFonts.HelveticaBold);
  const FO = await doc.embedFont(StandardFonts.HelveticaOblique);

  const center = (text: string, y: number, size: number, font = F, color = GRAY) => {
    const t = san(text);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: (W - w) / 2, y, size, font, color });
  };

  // Marcos
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: NAVY, borderWidth: 3 });
  page.drawRectangle({ x: 34, y: 34, width: W - 68, height: H - 68, borderColor: TEAL, borderWidth: 1 });

  // Encabezado
  center("PROYECTO CONECTA · VINCULACIÓN CON GRADUADOS", H - 78, 11, FB, TEAL);
  center("CERTIFICADO DE COMPETENCIA", H - 120, 30, FB, NAVY);
  page.drawLine({ start: { x: W / 2 - 90, y: H - 132 }, end: { x: W / 2 + 90, y: H - 132 }, thickness: 2, color: GOLD });

  center("La Universidad certifica que", H - 175, 13, F, GRAY);
  center(d.nombre, H - 215, 26, FB, NAVY);
  center("ha adquirido y demostrado la competencia profesional:", H - 250, 13, F, GRAY);
  center(d.competencia, H - 285, 20, FB, TEAL);
  if (d.area) center(`Área: ${d.area}`, H - 307, 11, FO, GRAY);

  center("avalada por la Universidad a través de Educación Continua.", H - 340, 12, F, GRAY);
  if (d.curso) center(`Mediante el curso: ${d.curso}`, H - 360, 11, FO, GRAY);
  if (d.fecha) center(`Fecha de aval: ${d.fecha}`, H - 384, 11, F, GRAY);

  // QR de verificación (abajo a la derecha)
  try {
    const dataUrl = await QRCode.toDataURL(d.verifyUrl, { margin: 1, width: 240 });
    const png = await doc.embedPng(dataUrl);
    const qs = 96;
    page.drawImage(png, { x: W - 60 - qs, y: 70, width: qs, height: qs });
    page.drawText("Verifica la autenticidad", { x: W - 60 - qs - 6, y: 60, size: 8, font: F, color: GRAY });
  } catch {}

  // Firma (izquierda) y código
  page.drawLine({ start: { x: 90, y: 120 }, end: { x: 290, y: 120 }, thickness: 1, color: GRAY });
  page.drawText("Educación Continua — Universidad", { x: 100, y: 106, size: 9, font: F, color: GRAY });
  page.drawText(`Código de verificación: ${san(d.codigo)}`, { x: 90, y: 74, size: 9, font: FB, color: NAVY });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
