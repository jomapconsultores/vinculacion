import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aprueba o rechaza un curso interno enviado a revisión. Solo staff
// (admin o autoridad aprobada, ver is_staff() en 0005_niveles.sql); la
// función RPC lo vuelve a comprobar por su cuenta (ver 0016_revisar_curso_rpc.sql).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const profileId = body?.profileId;
  const cursoId = Number(body?.cursoId);
  const aprobar = !!body?.aprobar;
  if (!profileId || !Number.isFinite(cursoId)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const { data: resultado, error } = await supabase.rpc("revisar_curso", {
    p_profile_id: profileId,
    p_curso_id: cursoId,
    p_aprobar: aprobar,
  });
  if (error) {
    const status = error.message === "No autorizado" ? 403 : /pendiente de revisión|No existe/.test(error.message) ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(resultado ?? { ok: true });
}
