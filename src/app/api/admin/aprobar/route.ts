import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Aprobar (o rechazar) una cuenta de autoridad. Solo el administrador.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "admin") return NextResponse.json({ error: "Solo el administrador puede aprobar" }, { status: 403 });

  const { profileId, aprobar } = await req.json();
  if (!profileId) return NextResponse.json({ error: "Falta profileId" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ aprobado: !!aprobar }).eq("id", profileId).eq("rol", "autoridad");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
