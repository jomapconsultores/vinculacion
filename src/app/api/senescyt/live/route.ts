import { NextResponse } from "next/server";
import { iniciarSesionSenescyt, consultarSenescytLive } from "@/lib/senescyt-live";

export const runtime = "nodejs";
export const maxDuration = 40;

// GET: abre una sesión con SENESCYT y devuelve el captcha oficial para mostrarlo.
export async function GET() {
  try {
    const s = await iniciarSesionSenescyt();
    return NextResponse.json({ jsessionid: s.jsessionid, viewstate: s.viewstate, captcha: s.captcha });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SENESCYT no está disponible en este momento. Intenta más tarde." },
      { status: 502 }
    );
  }
}

// POST: envía la consulta con el captcha resuelto por el usuario.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { jsessionid, viewstate, cedula, captcha } = body || {};
  if (!captcha) return NextResponse.json({ error: "Escribe el código de la imagen." }, { status: 400 });

  const r = await consultarSenescytLive({ jsessionid, viewstate, cedula, captcha });
  if (!r.ok) {
    if (r.motivo === "captcha") return NextResponse.json({ error: "El código de la imagen es incorrecto. Intenta de nuevo." }, { status: 422 });
    if (r.motivo === "sin_sesion") return NextResponse.json({ error: "La sesión con SENESCYT expiró. Recarga el captcha." }, { status: 440 });
    return NextResponse.json({ error: "No se pudo consultar SENESCYT. Intenta de nuevo." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, titulos: r.titulos });
}
