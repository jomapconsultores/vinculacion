import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODULOS_VALIDOS, type Modulo } from "@/lib/modulos";

export const runtime = "nodejs";

// Otorga/revoca filas de permisos_modulo para una autoridad. Exclusivo del
// administrador (no de autoridad): RLS (0032, permisos_modulo_admin_write)
// ya lo exige a nivel de fila, pero autenticamos aquí primero para devolver
// un mensaje de error más claro que el genérico de Postgres.

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) } as const;

  const { data: me } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.rol !== "admin") {
    return {
      error: NextResponse.json({ error: "Solo el administrador puede otorgar o revocar módulos." }, { status: 403 }),
    } as const;
  }

  return { supabase, userId: user.id } as const;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const body = await req.json().catch(() => null);
  const modulo = body?.modulo as string | undefined;

  if (!modulo || !MODULOS_VALIDOS.includes(modulo as Modulo)) {
    return NextResponse.json({ error: "Módulo inválido" }, { status: 400 });
  }

  const { data: autoridad } = await supabase
    .from("profiles")
    .select("id, rol")
    .eq("id", params.id)
    .maybeSingle();
  if (!autoridad) {
    return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
  }
  if (autoridad.rol !== "autoridad") {
    return NextResponse.json({ error: "Solo se pueden otorgar módulos a una autoridad." }, { status: 400 });
  }

  // upsert (no insert simple): si la autoridad ya tenía este módulo otorgado
  // (unique(profile_id, modulo)), esto no falla, simplemente no cambia nada.
  const { error } = await supabase.from("permisos_modulo").upsert(
    {
      profile_id: params.id,
      modulo,
      otorgado_por: userId,
    },
    { onConflict: "profile_id,modulo" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await req.json().catch(() => null);
  const url = new URL(req.url);
  const modulo = (body?.modulo as string | undefined) ?? url.searchParams.get("modulo") ?? undefined;

  if (!modulo) return NextResponse.json({ error: "Falta módulo" }, { status: 400 });

  const { data: autoridad } = await supabase
    .from("profiles")
    .select("id, rol")
    .eq("id", params.id)
    .maybeSingle();
  if (!autoridad) {
    return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
  }
  if (autoridad.rol !== "autoridad") {
    return NextResponse.json({ error: "Solo se pueden revocar módulos de una autoridad." }, { status: 400 });
  }

  const { error } = await supabase
    .from("permisos_modulo")
    .delete()
    .eq("profile_id", params.id)
    .eq("modulo", modulo);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
