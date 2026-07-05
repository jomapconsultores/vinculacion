import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extraerTexto } from "@/lib/extract";
import { askJSON } from "@/lib/ai";
import { cedulaValida } from "@/lib/seguridad";

export const runtime = "nodejs";
export const maxDuration = 60;

type Extraido = { nombres: string; apellidos: string; cedula: string };

const TAMANO_MAX = 10 * 1024 * 1024; // 10MB
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function archivoValido(f: File): string | null {
  if (f.size > TAMANO_MAX) return "El archivo supera el tamaño máximo permitido (10MB).";
  const tipo = (f.type || "").toLowerCase();
  const extPermitida = /\.(pdf|jpe?g|png|webp)$/.test(f.name.toLowerCase());
  const tipoPermitido = tipo ? TIPOS_PERMITIDOS.includes(tipo) : false;
  if (!tipoPermitido && !extPermitida) {
    return "Sube una imagen (JPG, PNG, WEBP) o PDF de tu cédula.";
  }
  return null;
}

// Sube/arrastra la cédula de ciudadanía: OCR + IA extraen nombres y apellidos,
// verifican contra la cédula de la cuenta y completan el perfil.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: prof } = await supabase
    .from("profiles").select("cedula, origen_padron").eq("id", user.id).maybeSingle();
  if (prof?.origen_padron) {
    return NextResponse.json({ error: "Tu identidad ya está verificada por el padrón; no es necesario." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }
  const archivo = form.get("cedula");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Sube una imagen o PDF de tu cédula." }, { status: 400 });
  }
  const errorArchivo = archivoValido(archivo);
  if (errorArchivo) return NextResponse.json({ error: errorArchivo }, { status: 413 });

  // 1) OCR
  let texto = "";
  try {
    texto = (await extraerTexto(archivo)).texto;
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo leer la imagen. Prueba con una foto nítida." }, { status: 502 });
  }
  if (!texto || texto.length < 15) {
    return NextResponse.json({ error: "La imagen no es legible. Usa una foto clara de la cédula." }, { status: 422 });
  }

  // 2) Extracción con IA
  let d: Extraido;
  try {
    d = await askJSON<Extraido>(
      `Extraes datos de una CÉDULA DE IDENTIDAD ECUATORIANA a partir de texto OCR. Devuelves SOLO JSON válido con la forma {"nombres": string, "apellidos": string, "cedula": string}.
- "apellidos": los dos apellidos (como constan en la cédula, en MAYÚSCULAS).
- "nombres": los nombres.
- "cedula": el número de identificación (10 dígitos, solo números).
- Si algún dato no aparece, usa "".`,
      `Texto OCR de la cédula:\n${texto.slice(0, 4000)}`,
      600
    );
  } catch {
    return NextResponse.json({ error: "No se pudieron extraer los datos. Intenta con otra foto." }, { status: 502 });
  }

  const nombres = (d.nombres || "").trim();
  const apellidos = (d.apellidos || "").trim();
  const cedulaLeidaBruta = (d.cedula || "").replace(/\D/g, "");
  // Un OCR ruidoso puede devolver 10 dígitos "con forma" pero inventados; el checksum
  // oficial descarta esos casos en vez de compararlos con confianza contra la cuenta.
  const cedulaLeida = cedulaValida(cedulaLeidaBruta) ? cedulaLeidaBruta : "";
  if (!nombres && !apellidos) {
    return NextResponse.json({ error: "No se reconocieron el nombre y apellidos en la imagen." }, { status: 422 });
  }

  // 3) Verificación contra la cédula de la cuenta
  const coincide = !!prof?.cedula && !!cedulaLeida && cedulaLeida === prof.cedula;

  // 4) Guardar en el perfil SOLO si la cédula leída coincide con la de la cuenta.
  // Si no coincide (o no se pudo leer una cédula válida), no tocamos el perfil: de lo
  // contrario cualquier foto subida —de otra persona o mal leída— sobrescribiría el
  // nombre de la cuenta sin verificación real.
  if (coincide) {
    const { error } = await supabase.from("profiles").update({ nombres, apellidos }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    nombres,
    apellidos,
    cedula_leida: cedulaLeida,
    cedula_cuenta: prof?.cedula ?? null,
    coincide,
    actualizado: coincide,
  });
}
