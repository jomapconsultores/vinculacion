// Entrada por voz del asistente de alumni.
// POST multipart { token, audio } -> { transcripcion, sugerencias }.
// No persiste nada: el usuario confirma las sugerencias en el asistente y
// recién entonces se envían por /api/alumni/actualizar.

import { verificarTokenAlumni } from "@/lib/alumni-token";
import { limiteExcedido, ipDe } from "@/lib/seguridad";
import { transcribirAudio, estructurarVozAlumni, vozConfigurada } from "@/lib/voz";

export const runtime = "nodejs";
export const maxDuration = 120;

const AUDIO_MAX = 10 * 1024 * 1024; // ~2 minutos de audio comprimido

export async function POST(req: Request) {
  const ip = ipDe(req);
  if (limiteExcedido(`alumni-voz:ip:${ip}`, 10, 60 * 60_000, Date.now())) {
    return Response.json({ error: "Demasiadas grabaciones. Intenta más tarde." }, { status: 429 });
  }

  if (!vozConfigurada()) {
    return Response.json(
      { error: "El dictado por voz no está disponible en este momento." },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const token = String(form.get("token") || "");
  const audio = form.get("audio");

  const t = verificarTokenAlumni(token);
  if (!t) {
    return Response.json(
      { error: "La sesión de verificación expiró. Vuelve a ingresar tu cédula." },
      { status: 401 }
    );
  }
  if (limiteExcedido(`alumni-voz:cedula:${t.cedula}`, 6, 60 * 60_000, Date.now())) {
    return Response.json({ error: "Demasiadas grabaciones. Intenta más tarde." }, { status: 429 });
  }

  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "Falta el audio." }, { status: 400 });
  }
  if (audio.size > AUDIO_MAX) {
    return Response.json({ error: "El audio es demasiado largo (máx. ~2 minutos)." }, { status: 400 });
  }

  try {
    const transcripcion = await transcribirAudio(audio);
    if (transcripcion.length < 5) {
      return Response.json(
        { error: "No se entendió el audio. Intenta de nuevo hablando más cerca del micrófono." },
        { status: 422 }
      );
    }
    const sugerencias = await estructurarVozAlumni(transcripcion);
    return Response.json({ ok: true, transcripcion, sugerencias });
  } catch (e: any) {
    console.error("[alumni/voz]", e?.message || e);
    return Response.json(
      { error: "No se pudo procesar el audio. Intenta de nuevo." },
      { status: 502 }
    );
  }
}
