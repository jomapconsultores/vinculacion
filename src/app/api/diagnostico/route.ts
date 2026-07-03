import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Recibe el reporte de diagnóstico del navegador del usuario.
export async function POST(req: Request) {
  let datos: Record<string, unknown> = {};
  try {
    datos = await req.json();
  } catch {}
  datos.ua = req.headers.get("user-agent") ?? "";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("debug_eventos")
      .insert({ tipo: "diagnostico", datos })
      .select("id")
      .single();
    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
