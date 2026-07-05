// Clasificación y extracción de fecha por IA para el repositorio de
// documentos personales. Reusa el mismo patrón que /api/cv/analizar:
// OCR (extraerTexto) + un único llamado a askJSON.

import { extraerTexto } from "@/lib/extract";
import { askJSON } from "@/lib/ai";
import { DOCUMENTOS_CATEGORIAS, type DocumentoCategoria } from "@/lib/documentos";

export type AnalisisExperiencia = {
  empresa: string;
  cargo: string;
  ciudad: string | null;
  fecha_inicio: string | null; // YYYY-MM-DD
  fecha_fin: string | null; // YYYY-MM-DD; null si sigue vigente
  actual: boolean;
  descripcion: string | null;
};

export type AnalisisCurso = {
  nombre: string;
  institucion: string | null;
  fecha: string | null; // YYYY-MM-DD
  area_nombre: string | null;
};

export type AnalisisDocumento = {
  categoria: DocumentoCategoria;
  fecha_documento: string | null; // YYYY-MM-DD
  experiencia: AnalisisExperiencia | null;
  curso: AnalisisCurso | null;
};

const CATEGORIAS_VALIDAS = new Set<string>(DOCUMENTOS_CATEGORIAS.map((c) => c.value));
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(v: unknown): string | null {
  return typeof v === "string" && FECHA_RE.test(v) ? v : null;
}

const ANALISIS_VACIO: AnalisisDocumento = {
  categoria: "otro",
  fecha_documento: null,
  experiencia: null,
  curso: null,
};

// Analiza un documento (PDF, imagen, Word o Excel) con OCR + IA: sugiere en
// qué carpeta guardarlo y extrae una fecha para ordenar el repositorio
// cronológicamente. Si además parece un comprobante de experiencia laboral o
// de un curso/capacitación, devuelve los campos estructurados para
// prellenar esas secciones del perfil. Degrada a ANALISIS_VACIO (categoría
// "otro", sin fecha) si el OCR falla, el texto es insuficiente, o la IA no
// está configurada/falla — nunca lanza, para que la subida no se bloquee.
export async function analizarDocumentoIA(archivo: File): Promise<AnalisisDocumento> {
  let texto = "";
  try {
    texto = (await extraerTexto(archivo)).texto;
  } catch {
    return ANALISIS_VACIO;
  }
  if (!texto || texto.length < 15) return ANALISIS_VACIO;

  const categorias = DOCUMENTOS_CATEGORIAS.map((c) => c.value).join(", ");
  const system = `Eres un asistente que organiza el repositorio de documentos de estudiantes y profesionales de una universidad. Recibes el texto (extraído por OCR) de UN documento y devuelves SOLO un objeto JSON válido con esta forma exacta:
{
  "categoria": string,
  "fecha_documento": string|null,
  "experiencia": {"empresa":string,"cargo":string,"ciudad":string|null,"fecha_inicio":string|null,"fecha_fin":string|null,"actual":boolean,"descripcion":string|null} | null,
  "curso": {"nombre":string,"institucion":string|null,"fecha":string|null,"area_nombre":string|null} | null
}
Reglas:
- "categoria": EXACTAMENTE uno de estos valores (sin inventar otros): ${categorias}.
- "fecha_documento": la fecha más relevante del documento (emisión, finalización, firma del contrato, etc.) en formato YYYY-MM-DD. Si no hay una fecha clara e inequívoca, usa null. Nunca inventes ni aproximes una fecha.
- "experiencia": completa este objeto SOLO si el documento es un certificado laboral, contrato, acción de personal o similar que demuestre EXPERIENCIA LABORAL (profesional, académica o administrativa). "fecha_inicio"/"fecha_fin" en YYYY-MM-DD; "fecha_fin" null y "actual":true si el cargo sigue vigente. Si no aplica, usa null (no lo completes a medias).
- "curso": completa este objeto SOLO si el documento es un certificado de CURSO, SEMINARIO, TALLER, CONGRESO O CAPACITACIÓN. Si no aplica, usa null.
- No inventes datos que no estén explícitos en el texto. Si un campo puntual no aparece, usa null en ese campo (pero completa el resto del objeto si el documento sí corresponde a esa categoría).`;

  try {
    const resultado = await askJSON<Partial<AnalisisDocumento>>(
      system,
      `Texto extraído del documento:\n${texto.slice(0, 6000)}`,
      700
    );
    const categoria = CATEGORIAS_VALIDAS.has(String(resultado?.categoria))
      ? (resultado!.categoria as DocumentoCategoria)
      : "otro";
    return {
      categoria,
      fecha_documento: fechaValida(resultado?.fecha_documento),
      experiencia: resultado?.experiencia
        ? {
            empresa: String(resultado.experiencia.empresa || "").trim() || "—",
            cargo: String(resultado.experiencia.cargo || "").trim() || "—",
            ciudad: resultado.experiencia.ciudad || null,
            fecha_inicio: fechaValida(resultado.experiencia.fecha_inicio),
            fecha_fin: fechaValida(resultado.experiencia.fecha_fin),
            actual: !!resultado.experiencia.actual,
            descripcion: resultado.experiencia.descripcion || null,
          }
        : null,
      curso: resultado?.curso
        ? {
            nombre: String(resultado.curso.nombre || "").trim() || "—",
            institucion: resultado.curso.institucion || null,
            fecha: fechaValida(resultado.curso.fecha),
            area_nombre: resultado.curso.area_nombre || null,
          }
        : null,
    };
  } catch {
    return ANALISIS_VACIO;
  }
}
