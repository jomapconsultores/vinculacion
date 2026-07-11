// Análisis de documentos del asistente de alumni (arrastrar/soltar o cámara).
// POST multipart { token, archivo } -> campos sugeridos (título/experiencia).
// Reutiliza el pipeline OCR+IA existente (analizarDocumentoIA). En el canal
// público NO se persiste el archivo: solo se devuelven sugerencias que el
// usuario confirma y que viajan luego por /api/alumni/actualizar.

import { verificarTokenAlumni } from "@/lib/alumni-token";
import { limiteExcedido, ipDe } from "@/lib/seguridad";
import { analizarDocumentoIA } from "@/lib/documentos-ia";
import {
  DOCUMENTOS_TAMANO_MAX,
  DOCUMENTOS_TIPOS_PERMITIDOS,
  DOCUMENTOS_EXTENSIONES_PERMITIDAS,
} from "@/lib/documentos";
import { nivelPorTitulo } from "@/lib/senescyt";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const ip = ipDe(req);
  if (limiteExcedido(`alumni-doc:ip:${ip}`, 12, 60 * 60_000, Date.now())) {
    return Response.json({ error: "Demasiados documentos. Intenta más tarde." }, { status: 429 });
  }

  const form = await req.formData();
  const token = String(form.get("token") || "");
  const archivo = form.get("archivo");

  const t = verificarTokenAlumni(token);
  if (!t) {
    return Response.json(
      { error: "La sesión de verificación expiró. Vuelve a ingresar tu cédula." },
      { status: 401 }
    );
  }
  if (limiteExcedido(`alumni-doc:cedula:${t.cedula}`, 8, 60 * 60_000, Date.now())) {
    return Response.json({ error: "Demasiados documentos. Intenta más tarde." }, { status: 429 });
  }

  if (!(archivo instanceof File) || archivo.size === 0) {
    return Response.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (archivo.size > DOCUMENTOS_TAMANO_MAX) {
    return Response.json({ error: "El archivo supera el tamaño máximo (15 MB)." }, { status: 400 });
  }
  const tipoOk =
    DOCUMENTOS_TIPOS_PERMITIDOS.includes(archivo.type as (typeof DOCUMENTOS_TIPOS_PERMITIDOS)[number]) ||
    DOCUMENTOS_EXTENSIONES_PERMITIDAS.test(archivo.name || "");
  if (!tipoOk) {
    return Response.json(
      { error: "Formato no soportado. Usa PDF, foto (JPG/PNG) o Word." },
      { status: 400 }
    );
  }

  try {
    const analisis = await analizarDocumentoIA(archivo);

    // Traducción del análisis genérico a sugerencias del asistente.
    const sugerencias: {
      titulo?: { titulo: string; nivel: string | null; instituto: string | null; anio: number | null };
      experiencia?: { empresa: string | null; cargo: string | null; ocupacion: string | null };
      categoria: string;
    } = { categoria: analisis.categoria };

    // Un título/certificado académico -> sugerir fila de título.
    if (analisis.categoria === "titulo" && analisis.curso?.nombre) {
      sugerencias.titulo = {
        titulo: analisis.curso.nombre,
        nivel: nivelPorTitulo(analisis.curso.nombre) === "Cuarto nivel" ? "MAESTRIA" : "PROFESIONAL",
        instituto: analisis.curso.institucion,
        anio: analisis.curso.fecha ? parseInt(analisis.curso.fecha.slice(0, 4), 10) : null,
      };
    }
    // Certificado laboral / contrato -> sugerir situación laboral.
    if (analisis.experiencia) {
      sugerencias.experiencia = {
        empresa: analisis.experiencia.empresa || null,
        cargo: analisis.experiencia.cargo || null,
        ocupacion: analisis.experiencia.cargo || null,
      };
    }

    return Response.json({ ok: true, sugerencias });
  } catch (e: any) {
    console.error("[alumni/documento]", e?.message || e);
    return Response.json(
      { error: "No se pudo analizar el documento. Intenta con otro archivo." },
      { status: 502 }
    );
  }
}
