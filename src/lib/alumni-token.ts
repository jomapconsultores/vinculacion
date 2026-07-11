// Token efímero para el autoservicio público de alumni.
//
// Tras verificar cédula + año de graduación, el servidor emite un token
// HMAC-SHA256 (30 min) que autoriza las llamadas siguientes del asistente
// (actualizar datos, analizar documento, transcribir voz) sin repetir el
// reto. Solo firma {cedula, exp}: no es una sesión ni da acceso a leer datos.

import { createHmac, timingSafeEqual } from "node:crypto";

const VIGENCIA_MS = 30 * 60 * 1000;

function secreto(): string {
  // ALUMNI_TOKEN_SECRET dedicado si existe; si no, se deriva de la clave de
  // servicio (ya secreta y presente en el entorno del servidor).
  const s = process.env.ALUMNI_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta ALUMNI_TOKEN_SECRET o SUPABASE_SERVICE_ROLE_KEY.");
  return `alumni:${s}`;
}

function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("base64url");
}

export function firmarTokenAlumni(cedula: string): string {
  const payload = Buffer.from(
    JSON.stringify({ cedula, exp: Date.now() + VIGENCIA_MS })
  ).toString("base64url");
  return `${payload}.${firmar(payload)}`;
}

export function verificarTokenAlumni(token: string): { cedula: string } | null {
  const partes = (token || "").split(".");
  if (partes.length !== 2) return null;
  const [payload, firma] = partes;
  const esperada = firmar(payload);
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof datos?.cedula !== "string" || typeof datos?.exp !== "number") return null;
    if (Date.now() > datos.exp) return null;
    return { cedula: datos.cedula };
  } catch {
    return null;
  }
}
