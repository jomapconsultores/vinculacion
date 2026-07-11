// Verificación pública del asistente de alumni.
//
// POST { cedula, anio } — el reto es la cédula (con checksum) más el año de
// graduación de cualquiera de los títulos de la persona. Si coincide, se
// devuelve un token efímero + los datos precargados con email/celular
// ENMASCARADOS (nunca completos: el reto es adivinable con esfuerzo, por eso
// además lo enviado por este canal queda en staging hasta revisión admin).
//
// Respuestas de fallo deliberadamente genéricas: no revelan si una cédula
// existe en el registro.

import { createAdminClient } from "@/lib/supabase/server";
import { cedulaValida, limiteExcedido, ipDe } from "@/lib/seguridad";
import { firmarTokenAlumni } from "@/lib/alumni-token";

export const runtime = "nodejs";

const GENERICO = "No pudimos verificar tus datos. Revisa la cédula y el año de graduación.";

function enmascararEmail(email: string | null): string | null {
  if (!email) return null;
  const [usuario, dominio] = email.split("@");
  if (!dominio) return null;
  const visible = usuario.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(3, usuario.length - 2))}@${dominio}`;
}

function enmascararCelular(cel: string | null): string | null {
  if (!cel) return null;
  return `${"•".repeat(Math.max(0, cel.length - 3))}${cel.slice(-3)}`;
}

export async function POST(req: Request) {
  const ip = ipDe(req);
  const ahora = Date.now();
  if (limiteExcedido(`alumni-verificar:ip:${ip}`, 5, 60_000, ahora)) {
    return Response.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  }

  let body: { cedula?: string; anio?: number | string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const cedula = String(body.cedula || "").replace(/\D/g, "");
  const anio = parseInt(String(body.anio || ""), 10);
  if (!cedulaValida(cedula) || !Number.isFinite(anio)) {
    return Response.json({ error: GENERICO }, { status: 400 });
  }

  // Límite adicional por cédula: frena la fuerza bruta del año (~25 valores).
  if (limiteExcedido(`alumni-verificar:cedula:${cedula}`, 5, 60 * 60_000, ahora)) {
    return Response.json(
      { error: "Demasiados intentos para esta cédula. Intenta más tarde." },
      { status: 429 }
    );
  }

  const admin = createAdminClient();

  // Ficha de alumni con títulos; si no existe, fallback al padrón (personas
  // aún no importadas al registro de alumni).
  const { data: alumni } = await admin
    .from("alumni")
    .select(
      "id, cedula, nombres, apellidos, genero, email, celular, telefono_fijo, ciudad, ocupacion, cargo, empresa, alumni_titulos(titulo, nivel_formacion, instituto, anio_graduacion)"
    )
    .eq("cedula", cedula)
    .maybeSingle();

  let anios: number[] = [];
  let persona: any = alumni;
  if (alumni) {
    anios = (alumni.alumni_titulos ?? [])
      .map((t: { anio_graduacion: number | null }) => t.anio_graduacion)
      .filter((a: number | null): a is number => a != null);
  } else {
    const { data: padron } = await admin
      .from("graduados_padron")
      .select("cedula, nombres, apellidos, titulo, anio_graduacion")
      .eq("cedula", cedula)
      .maybeSingle();
    if (padron) {
      persona = padron;
      anios = padron.anio_graduacion != null ? [padron.anio_graduacion] : [];
    }
  }

  if (!persona || anios.length === 0 || !anios.includes(anio)) {
    return Response.json({ error: GENERICO }, { status: 403 });
  }

  const token = firmarTokenAlumni(cedula);

  return Response.json({
    ok: true,
    token,
    persona: {
      nombres: persona.nombres ?? "",
      apellidos: persona.apellidos ?? "",
      genero: persona.genero ?? null,
      ciudad: persona.ciudad ?? null,
      ocupacion: persona.ocupacion ?? null,
      cargo: persona.cargo ?? null,
      empresa: persona.empresa ?? null,
      emailMasked: enmascararEmail(persona.email ?? null),
      celularMasked: enmascararCelular(persona.celular ?? null),
      titulos: (persona.alumni_titulos ?? []).map(
        (t: {
          titulo: string;
          nivel_formacion: string | null;
          instituto: string | null;
          anio_graduacion: number | null;
        }) => ({
          titulo: t.titulo,
          nivel: t.nivel_formacion,
          instituto: t.instituto,
          anio: t.anio_graduacion,
        })
      ),
    },
  });
}
