import { NextResponse } from "next/server";
import { iniciarSesionSenescyt, consultarSenescytLive } from "@/lib/senescyt-live";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { limiteExcedido, ipDe } from "@/lib/seguridad";

export const runtime = "nodejs";
export const maxDuration = 40;

// GET: abre una sesión con SENESCYT y devuelve el captcha oficial para mostrarlo.
// Límite de tasa más estricto que las rutas hermanas (padrón/senescyt): cada
// llamada golpea el sitio oficial de SENESCYT, no solo nuestra base de datos.
export async function GET(req: Request) {
  if (limiteExcedido(`senescyt-live:${ipDe(req)}`, 8, 60_000, Date.now())) {
    return NextResponse.json({ error: "Demasiadas consultas. Espera un momento." }, { status: 429 });
  }
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
  if (limiteExcedido(`senescyt-live:${ipDe(req)}`, 8, 60_000, Date.now())) {
    return NextResponse.json({ error: "Demasiadas consultas. Espera un momento." }, { status: 429 });
  }
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

  // Guarda el resultado autoritativo (server-side) para que /importar lo use
  // directamente, en vez de confiar en titulos/cursos/nombre enviados por el cliente.
  // Solo se cachea (y por lo tanto solo se puede importar) si la cédula consultada
  // es la propia del usuario: de lo contrario cualquiera podría consultar la cédula
  // de otra persona y atribuirse sus títulos reales y verificados como si fueran suyos.
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("cedula").eq("id", user.id).maybeSingle();
      // Solo si el perfil YA tiene una cédula registrada y coincide con la consultada.
      // Si el perfil no tiene cédula aún, NO se puede considerar "propia" ninguna
      // consulta: de lo contrario cualquiera podría atribuirse el nombre y los
      // títulos reales de un tercero antes de registrar su propia cédula.
      const esPropia = !!prof?.cedula && String(prof.cedula).trim() === String(cedula || "").trim();
      if (esPropia) {
        const admin = createAdminClient();
        await admin.from("senescyt_live_cache").upsert({
          profile_id: user.id,
          nombre: r.nombre,
          titulos: r.titulos,
          cursos: r.cursos,
          creado: new Date().toISOString(),
        });
      }
    }
  } catch {}

  return NextResponse.json({ ok: true, nombre: r.nombre, titulos: r.titulos, cursos: r.cursos });
}
