// Entrada por voz del asistente de alumni: transcripción con Mistral
// (Voxtral, misma MISTRAL_API_KEY que ya usa el OCR) + estructuración de la
// transcripción a campos del formulario con la capa de IA existente.
// No se toca src/lib/ai.ts: sigue siendo solo chat-completions.

import { askJSON } from "@/lib/ai";

const VOXTRAL_URL = "https://api.mistral.ai/v1/audio/transcriptions";
const VOXTRAL_MODEL = process.env.VOXTRAL_MODEL || "voxtral-mini-latest";

export function vozConfigurada(): boolean {
  return !!process.env.MISTRAL_API_KEY;
}

/** Transcribe un audio (webm/opus de Chrome/Android, mp4/AAC de iOS). */
export async function transcribirAudio(archivo: File): Promise<string> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("Voz no configurada: falta MISTRAL_API_KEY.");

  const fd = new FormData();
  fd.append("file", archivo, archivo.name || "audio.webm");
  fd.append("model", VOXTRAL_MODEL);
  fd.append("language", "es");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  const res = await fetch(VOXTRAL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const detalle = (await res.text()).slice(0, 200);
    throw new Error(`Transcripción falló (HTTP ${res.status}): ${detalle}`);
  }
  const data = await res.json();
  const texto: string = data?.text ?? "";
  return texto.trim();
}

export type CamposVoz = {
  genero: "masculino" | "femenino" | "otro" | null;
  email: string | null;
  celular: string | null;
  ciudad: string | null;
  ocupacion: string | null;
  cargo: string | null;
  empresa: string | null;
  titulos: {
    titulo: string;
    nivel: "PROFESIONAL" | "ESPECIALISTA" | "MAESTRIA" | null;
    instituto: string | null;
    anio: number | null;
  }[];
};

const VACIO: CamposVoz = {
  genero: null,
  email: null,
  celular: null,
  ciudad: null,
  ocupacion: null,
  cargo: null,
  empresa: null,
  titulos: [],
};

/** Convierte lo dictado en campos del formulario. Nunca inventa datos. */
export async function estructurarVozAlumni(transcripcion: string): Promise<CamposVoz> {
  if (transcripcion.trim().length < 5) return VACIO;

  const system = `Extraes datos de contacto y laborales de la transcripción de un audio en español
donde un graduado universitario dicta su información. Devuelve SOLO JSON con este esquema:
{"genero":"masculino|femenino|otro|null","email":"...|null","celular":"...|null","ciudad":"...|null",
"ocupacion":"...|null","cargo":"...|null","empresa":"...|null",
"titulos":[{"titulo":"...","nivel":"PROFESIONAL|ESPECIALISTA|MAESTRIA|null","instituto":"...|null","anio":2020}]}

Reglas:
- null para todo lo que NO se mencione. NO inventes.
- El correo dictado suele venir con palabras: "arroba" -> @, "punto" -> ".", sin espacios,
  en minúsculas (ej. "juan punto perez arroba gmail punto com" -> "juan.perez@gmail.com").
- Celular ecuatoriano: 10 dígitos empezando por 09; si dicta 9 dígitos que empiezan en 9,
  antepón el 0.
- "ocupacion" es a qué se dedica; "cargo" su puesto; "empresa" dónde trabaja.
- En títulos, "nivel": pregrado/licenciatura/ingeniería -> PROFESIONAL;
  especialización -> ESPECIALISTA; maestría/máster/magíster -> MAESTRIA.`;

  try {
    const res = await askJSON<Partial<CamposVoz>>(system, transcripcion, 1200);
    const generoValido = ["masculino", "femenino", "otro"].includes(String(res.genero))
      ? (res.genero as CamposVoz["genero"])
      : null;
    return {
      genero: generoValido,
      email: typeof res.email === "string" && res.email.includes("@") ? res.email.trim().toLowerCase() : null,
      celular: typeof res.celular === "string" ? res.celular.replace(/\D/g, "") || null : null,
      ciudad: typeof res.ciudad === "string" ? res.ciudad.trim() || null : null,
      ocupacion: typeof res.ocupacion === "string" ? res.ocupacion.trim() || null : null,
      cargo: typeof res.cargo === "string" ? res.cargo.trim() || null : null,
      empresa: typeof res.empresa === "string" ? res.empresa.trim() || null : null,
      titulos: Array.isArray(res.titulos)
        ? res.titulos
            .filter((t) => t && typeof t.titulo === "string" && t.titulo.trim().length >= 3)
            .slice(0, 10)
            .map((t) => ({
              titulo: t.titulo.trim(),
              nivel: ["PROFESIONAL", "ESPECIALISTA", "MAESTRIA"].includes(String(t.nivel))
                ? (t.nivel as any)
                : null,
              instituto: typeof t.instituto === "string" ? t.instituto.trim() || null : null,
              anio:
                typeof t.anio === "number" && t.anio >= 1950 && t.anio <= 2035 ? t.anio : null,
            }))
        : [],
    };
  } catch {
    return VACIO;
  }
}
