// OCR con Mistral Document AI (mistral-ocr-latest).
// Lee PDFs e imágenes (incluye certificados) y devuelve texto en markdown.

const OCR_URL = "https://api.mistral.ai/v1/ocr";

export async function ocrDataUrl(dataUrl: string, kind: "pdf" | "image"): Promise<string> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("Falta MISTRAL_API_KEY para OCR.");

  const document =
    kind === "pdf"
      ? { type: "document_url", document_url: dataUrl }
      : { type: "image_url", image_url: dataUrl };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 90000);
  const res = await fetch(OCR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "mistral-ocr-latest", document }),
    signal: controller.signal,
  }).finally(() => clearTimeout(t));

  if (!res.ok) {
    throw new Error(`OCR HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  const data = await res.json();
  const pages: any[] = data?.pages ?? [];
  return pages.map((p) => p.markdown ?? "").join("\n\n").trim();
}

export function bufferToDataUrl(buf: Buffer, mime: string): string {
  return `data:${mime};base64,${buf.toString("base64")}`;
}
