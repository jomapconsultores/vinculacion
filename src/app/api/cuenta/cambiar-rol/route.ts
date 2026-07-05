import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ROLES_PERMITIDOS = ["estudiante", "profesional", "empleador"] as const;
type RolPermitido = (typeof ROLES_PERMITIDOS)[number];

function esRolPermitido(rol: unknown): rol is RolPermitido {
  return typeof rol === "string" && (ROLES_PERMITIDOS as readonly string[]).includes(rol);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { rol } = await req.json().catch(() => ({}));
  if (!esRolPermitido(rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  const { data: asignado } = await supabase
    .from("roles_asignados")
    .select("id")
    .eq("profile_id", user.id)
    .eq("rol", rol)
    .maybeSingle();

  if (!asignado) {
    return NextResponse.json({ error: "No tienes ese rol asignado." }, { status: 403 });
  }

  const { error } = await supabase.from("profiles").update({ rol }).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rol });
}
