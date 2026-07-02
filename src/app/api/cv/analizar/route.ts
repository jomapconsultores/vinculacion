import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { extraerTexto } from "@/lib/extract";
import { askJSON } from "@/lib/ai";
import { AREAS_UNESCO, type CVAnalisis } from "@/lib/cv-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_CERTS = 6;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido (se espera multipart/form-data)." }, { status: 400 });
  }

  const cvFile = form.get("cv");
  if (!(cvFile instanceof File)) {
    return NextResponse.json({ error: "Sube tu hoja de vida (PDF, Word o Excel)." }, { status: 400 });
  }

  const certs = form.getAll("certificados").filter((f): f is File => f instanceof File).slice(0, MAX_CERTS);
  const foto = form.get("foto");

  // 1) Extraer texto del CV
  let cvTexto = "";
  try {
    cvTexto = (await extraerTexto(cvFile)).texto;
  } catch (e: any) {
    return NextResponse.json({ error: `No se pudo leer el documento: ${e?.message || e}` }, { status: 502 });
  }
  if (!cvTexto || cvTexto.length < 20) {
    return NextResponse.json({ error: "No se pudo extraer texto de la hoja de vida. Prueba con un PDF nítido." }, { status: 422 });
  }

  // 2) Extraer texto de certificados (en paralelo)
  const certTextos = await Promise.all(
    certs.map(async (f) => {
      try {
        const { texto } = await extraerTexto(f);
        return `--- Certificado: ${f.name} ---\n${texto}`;
      } catch {
        return `--- Certificado: ${f.name} (no legible) ---`;
      }
    })
  );

  // 3) Subir foto (opcional) con service role
  let foto_url: string | null = null;
  if (foto instanceof File && foto.size > 0) {
    try {
      const admin = createAdminClient();
      const ext = (foto.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/foto.${ext}`;
      const buf = Buffer.from(await foto.arrayBuffer());
      await admin.storage.from("cv-fotos").upload(path, buf, {
        contentType: foto.type || "image/jpeg",
        upsert: true,
      });
      const { data } = admin.storage.from("cv-fotos").getPublicUrl(path);
      foto_url = data.publicUrl;
    } catch {
      // La foto es opcional; continuar sin ella
    }
  }

  // 4) Análisis con IA
  const areas = AREAS_UNESCO.map((a) => `${a.codigo} — ${a.nombre}`).join("; ");
  const system = `Eres un experto en talento humano y orientación profesional en Ecuador. Recibes el texto (extraído por OCR) de una hoja de vida y, opcionalmente, textos de certificados. Estructuras y estandarizas la información y devuelves SOLO un objeto JSON válido con esta forma exacta:
{
 "datos": {"nombre","email","telefono","ciudad","linkedin"},
 "resumen": string,
 "experiencia": [{"cargo","empresa","periodo","logros":[string]}],
 "educacion": [{"titulo","institucion","periodo"}],
 "habilidades": [string],
 "capacitaciones": [{"nombre","institucion","horas":number|null,"anio":number|null,"fuente":"hoja de vida"|"certificado"}],
 "certificaciones_detectadas": [{"nombre","emisor","fecha"}],
 "perfil_unesco": {"area_principal": {"codigo","nombre","justificacion"}, "areas_secundarias": [{"codigo","nombre"}]},
 "nivel_profesional": string,
 "recomendaciones": [string]
}
Reglas:
- Redacta el "resumen" (perfil profesional) en 3-4 frases, tono profesional, en español.
- Reescribe la experiencia orientada a logros (viñetas).
- "capacitaciones": combina cursos/capacitaciones detectados en la hoja de vida Y en los certificados; marca la "fuente".
- "certificaciones_detectadas": las que provengan de los certificados adjuntos.
- "perfil_unesco": clasifica el perfil profesional según las ÁREAS AMPLIAS UNESCO/ISCED-F. Usa EXACTAMENTE uno de estos códigos y nombres para area_principal y areas_secundarias: ${areas}. Justifica brevemente la elección del área principal.
- "nivel_profesional": p.ej. "Junior", "Semi-senior", "Senior", "Técnico", según la experiencia.
- 3-5 recomendaciones accionables para mejorar la empleabilidad según un estándar de hoja de vida.
- Si un dato no aparece, usa null o [] (no inventes datos personales).`;

  const userMsg = `HOJA DE VIDA (texto OCR):\n${cvTexto.slice(0, 12000)}\n\nCERTIFICADOS:\n${certTextos.join("\n\n").slice(0, 8000) || "(ninguno)"}`;

  let analisis: CVAnalisis;
  try {
    analisis = await askJSON<CVAnalisis>(system, userMsg, 3000);
  } catch (e: any) {
    return NextResponse.json({ error: `La IA no pudo analizar el documento: ${e?.message || e}` }, { status: 502 });
  }
  analisis.foto_url = foto_url;

  // 5) Guardar
  try {
    await supabase.from("cvs").upsert(
      { profile_id: user.id, contenido: analisis, generado_ia: true, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );
    const upd: Record<string, any> = {};
    if (foto_url) upd.foto_url = foto_url;
    if (analisis.resumen) upd.resumen_profesional = analisis.resumen;
    if (Object.keys(upd).length) await supabase.from("profiles").update(upd).eq("id", user.id);
  } catch {
    // no bloquear la respuesta por errores de guardado
  }

  return NextResponse.json({ analisis });
}
