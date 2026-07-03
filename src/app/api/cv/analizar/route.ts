import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { extraerTexto } from "@/lib/extract";
import { askJSON } from "@/lib/ai";
import { AREAS_UNESCO, type CVAnalisis } from "@/lib/cv-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_CERTS = 6;

// Extrae fechas aproximadas de un período tipo "Ene 2022 - Dic 2024" o "2020 - Actualidad".
function parsePeriodo(periodo?: string): { inicio: string | null; fin: string | null; actual: boolean } {
  const s = (periodo || "").toLowerCase();
  const years = (s.match(/(19|20)\d{2}/g) || []).map(Number);
  const actual = /actual|presente|actualidad|current|hoy|vigente/.test(s);
  const inicio = years[0] ? `${years[0]}-01-01` : null;
  const fin = actual ? null : years[1] ? `${years[1]}-12-01` : null;
  return { inicio, fin, actual };
}

const norm = (v?: string | null) => (v || "").trim().toLowerCase();

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
 "capacitaciones": [{"nombre","institucion","horas":number|null,"anio":number|null,"categoria","fuente":"hoja de vida"|"certificado"}],
 "certificaciones_detectadas": [{"nombre","emisor","fecha","categoria"}],
 "perfil_unesco": {"area_principal": {"codigo","nombre","justificacion"}, "areas_secundarias": [{"codigo","nombre"}]},
 "nivel_profesional": string,
 "recomendaciones": [string]
}
Reglas:
- Redacta el "resumen" (perfil profesional) en 3-4 frases, tono profesional, en español.
- Reescribe la experiencia orientada a logros (viñetas).
- "capacitaciones": combina cursos/capacitaciones detectados en la hoja de vida Y en los certificados; marca la "fuente".
- "categoria": clasifica cada capacitación y certificación en un GRUPO TEMÁTICO breve y consistente que agrupe cursos parecidos. Usa preferentemente uno de: "Tecnología/TIC", "Administración/Finanzas", "Salud", "Educación/Docencia", "Idiomas", "Seguridad/Prevención", "Legal/Normativa", "Habilidades blandas", "Otros". Reutiliza EXACTAMENTE la misma etiqueta para cursos del mismo tema.
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

  // 5) Guardar CV + RELLENAR EL PERFIL desde el documento (aditivo, sin duplicar)
  const perfil_actualizado = { experiencia: 0, educacion: 0, habilidades: 0 };
  try {
    await supabase.from("cvs").upsert(
      { profile_id: user.id, contenido: analisis, generado_ia: true, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );

    // Perfil: resumen + foto siempre; contacto solo si está vacío (no pisar lo existente)
    const { data: prof } = await supabase
      .from("profiles").select("telefono, ciudad, linkedin").eq("id", user.id).maybeSingle();
    const upd: Record<string, any> = {};
    if (foto_url) upd.foto_url = foto_url;
    if (analisis.resumen) upd.resumen_profesional = analisis.resumen;
    if (!prof?.telefono && analisis.datos?.telefono) upd.telefono = analisis.datos.telefono;
    if (!prof?.ciudad && analisis.datos?.ciudad) upd.ciudad = analisis.datos.ciudad;
    if (!prof?.linkedin && analisis.datos?.linkedin) upd.linkedin = analisis.datos.linkedin;
    if (Object.keys(upd).length) await supabase.from("profiles").update(upd).eq("id", user.id);

    // Experiencia laboral (dedup por empresa+cargo)
    const { data: exExp } = await supabase.from("experiencia_laboral").select("empresa, cargo").eq("profile_id", user.id);
    const setExp = new Set((exExp ?? []).map((e: any) => `${norm(e.empresa)}|${norm(e.cargo)}`));
    const nuevasExp = (analisis.experiencia ?? [])
      .filter((e) => (e.cargo || e.empresa) && !setExp.has(`${norm(e.empresa)}|${norm(e.cargo)}`))
      .map((e) => {
        const p = parsePeriodo(e.periodo);
        return {
          profile_id: user.id,
          empresa: e.empresa || "—",
          cargo: e.cargo || "—",
          descripcion: (e.logros || []).join("\n") || null,
          fecha_inicio: p.inicio,
          fecha_fin: p.fin,
          actual: p.actual,
        };
      });
    if (nuevasExp.length) {
      const { error } = await supabase.from("experiencia_laboral").insert(nuevasExp);
      if (!error) perfil_actualizado.experiencia = nuevasExp.length;
    }

    // Educación (dedup por titulo+institucion)
    const { data: exEdu } = await supabase.from("educacion").select("titulo, institucion").eq("profile_id", user.id);
    const setEdu = new Set((exEdu ?? []).map((e: any) => `${norm(e.titulo)}|${norm(e.institucion)}`));
    const nuevasEdu = (analisis.educacion ?? [])
      .filter((e) => (e.titulo || e.institucion) && !setEdu.has(`${norm(e.titulo)}|${norm(e.institucion)}`))
      .map((e) => {
        const p = parsePeriodo(e.periodo);
        return {
          profile_id: user.id,
          titulo: e.titulo || "—",
          institucion: e.institucion || "—",
          fecha_inicio: p.inicio,
          fecha_fin: p.fin,
        };
      });
    if (nuevasEdu.length) {
      const { error } = await supabase.from("educacion").insert(nuevasEdu);
      if (!error) perfil_actualizado.educacion = nuevasEdu.length;
    }

    // Habilidades (dedup por nombre)
    const { data: exHab } = await supabase.from("habilidades").select("nombre").eq("profile_id", user.id);
    const setHab = new Set((exHab ?? []).map((h: any) => norm(h.nombre)));
    const nuevasHab = (analisis.habilidades ?? [])
      .filter((h) => h && !setHab.has(norm(h)))
      .map((h) => ({ profile_id: user.id, nombre: h, nivel: 3 }));
    if (nuevasHab.length) {
      const { error } = await supabase.from("habilidades").insert(nuevasHab);
      if (!error) perfil_actualizado.habilidades = nuevasHab.length;
    }
  } catch {
    // no bloquear la respuesta por errores de guardado
  }

  return NextResponse.json({ analisis, perfil_actualizado });
}
