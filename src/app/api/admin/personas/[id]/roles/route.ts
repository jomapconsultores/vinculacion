import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Otorga/revoca filas de roles_asignados para una persona. Exclusivo del
// administrador (no de autoridad): RLS (0031, roles_asignados_admin_write)
// ya lo exige a nivel de fila, pero autenticamos aquí primero para devolver
// un mensaje de error más claro que el genérico de Postgres.
//
// 'autoridad' y 'admin' dan acceso de staff (o control total), así que no se
// otorgan al instante: quedan en solicitudes_rol (0033) pendientes de
// aprobación por el administrador en /admin/solicitudes. Estudiante,
// profesional y empleador no elevan ese nivel de acceso y se otorgan de
// inmediato, como antes.
const ROLES_OTORGABLES = ["estudiante", "profesional", "empleador", "autoridad", "admin"] as const;
type RolOtorgable = (typeof ROLES_OTORGABLES)[number];
const ROLES_REQUIEREN_APROBACION = ["autoridad", "admin"] as const;

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
    return { error: NextResponse.json({ error: "Solo el administrador puede otorgar o revocar roles." }, { status: 403 }) } as const;
  }

  return { supabase, userId: user.id } as const;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const body = await req.json().catch(() => null);
  const rol = body?.rol as string | undefined;
  const empresaId = body?.empresa_id;

  if (!rol || !ROLES_OTORGABLES.includes(rol as RolOtorgable)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  if (ROLES_REQUIEREN_APROBACION.includes(rol as (typeof ROLES_REQUIEREN_APROBACION)[number])) {
    const { data: existente } = await supabase
      .from("solicitudes_rol")
      .select("id")
      .eq("profile_id", params.id)
      .eq("rol", rol)
      .eq("estado", "pendiente")
      .maybeSingle();
    if (existente) {
      return NextResponse.json({ error: "Ya existe una solicitud pendiente para ese rol." }, { status: 400 });
    }

    const { data: solicitud, error } = await supabase
      .from("solicitudes_rol")
      .insert({ profile_id: params.id, rol, solicitado_por: userId })
      .select("id, rol")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, pendiente: true, solicitud });
  }

  let empresaIdFinal: number | null = null;
  if (rol === "empleador") {
    if (empresaId === undefined || empresaId === null || empresaId === "") {
      return NextResponse.json({ error: "Selecciona una empresa." }, { status: 400 });
    }
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("id", empresaId)
      .maybeSingle();
    if (!empresa) return NextResponse.json({ error: "La empresa seleccionada no existe." }, { status: 400 });
    empresaIdFinal = empresa.id;
  }

  // upsert (no insert simple): si la persona ya tenía este rol otorgado
  // (unique(profile_id, rol)), esto actualiza su empresa_id/otorgado_por en
  // vez de descartar el cambio silenciosamente como si nada hubiera pasado.
  const { data: fila, error } = await supabase
    .from("roles_asignados")
    .upsert(
      {
        profile_id: params.id,
        rol,
        empresa_id: empresaIdFinal,
        otorgado_por: userId,
      },
      { onConflict: "profile_id,rol" }
    )
    .select("id, rol, empresa_id, empresas(nombre)")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fila });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await req.json().catch(() => null);
  const url = new URL(req.url);
  const rol = (body?.rol as string | undefined) ?? url.searchParams.get("rol") ?? undefined;

  if (!rol) return NextResponse.json({ error: "Falta rol" }, { status: 400 });

  const { data: persona } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", params.id)
    .maybeSingle();

  if (!persona) {
    return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
  }

  if (persona.rol === rol) {
    return NextResponse.json(
      { error: "No puedes revocar el rol activo actual de la persona. Cambia primero su rol activo." },
      { status: 400 }
    );
  }

  // Si había una solicitud pendiente para ese rol (autoridad/admin, 0033),
  // "revocar" antes de que se apruebe simplemente la cancela.
  await supabase
    .from("solicitudes_rol")
    .delete()
    .eq("profile_id", params.id)
    .eq("rol", rol)
    .eq("estado", "pendiente");

  const { error } = await supabase
    .from("roles_asignados")
    .delete()
    .eq("profile_id", params.id)
    .eq("rol", rol);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
