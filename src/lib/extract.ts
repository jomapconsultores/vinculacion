// Extracción de texto de documentos subidos (PDF, Word, Excel, imágenes).
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { ocrDataUrl, bufferToDataUrl } from "@/lib/ocr";

export type Extraccion = { texto: string; tipo: string };

function ext(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export async function extraerTexto(file: File): Promise<Extraccion> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = (file.type || "").toLowerCase();
  const e = ext(file.name);

  // PDF -> OCR
  if (mime.includes("pdf") || e === "pdf") {
    const texto = await ocrDataUrl(bufferToDataUrl(buf, "application/pdf"), "pdf");
    return { texto, tipo: "pdf" };
  }

  // Imágenes -> OCR
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(e)) {
    const m = mime.startsWith("image/") ? mime : `image/${e === "jpg" ? "jpeg" : e}`;
    const texto = await ocrDataUrl(bufferToDataUrl(buf, m), "image");
    return { texto, tipo: "imagen" };
  }

  // Word .docx -> mammoth
  if (mime.includes("wordprocessingml") || e === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return { texto: value.trim(), tipo: "word" };
  }

  // Excel .xlsx/.xls -> SheetJS
  if (mime.includes("spreadsheet") || mime.includes("excel") || ["xlsx", "xls", "csv"].includes(e)) {
    const wb = XLSX.read(buf, { type: "buffer" });
    const partes = wb.SheetNames.map(
      (n) => `# ${n}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n])
    );
    return { texto: partes.join("\n\n").trim(), tipo: "excel" };
  }

  // Word antiguo .doc u otros: intentar texto plano
  const texto = buf.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7E -￿]/g, " ").trim();
  return { texto, tipo: e || "desconocido" };
}
