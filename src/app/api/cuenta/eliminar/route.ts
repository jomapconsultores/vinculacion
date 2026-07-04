import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { passwordCorrecta } from "@/lib/verificar-password";
import { limiteExcedido } from "@/lib/seguridad";
import { DOCUMENTOS_BUCKET } from "@/lib/documentos";

// Elimina por completo la cuenta del usuario (auth + datos por cascada).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // La confirmación de contraseña es, en la práctica, un oráculo de fuerza
  // bruta si se roba la sesión: se limita por cuenta antes de verificarla.
  if (limiteExcedido(`confirmar-password:${user.id}`, 5, 5 * 60_000, Date.now())) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, { status: 429 });
  }

  const { password } = await req.json().catch(() => ({}));
  if (!(await passwordCorrecta(user.email, password || ""))) {
    return NextResponse.json({ error: "Confirma tu contraseña para eliminar tu cuenta." }, { status: 403 });
  }

  const admin = createAdminClient();

  // Los objetos en Storage no se borran solos al eliminar las filas de
  // documentos_personales (la cascada de FK solo alcanza a la base de datos):
  // hay que removerlos explícitamente o quedan huérfanos y accesibles vía
  // las políticas de staff, pese al mensaje de "se borran todos tus datos".
  const { data: docs } = await admin
    .from("documentos_personales")
    .select("storage_path")
    .eq("profile_id", user.id);
  if (docs && docs.length > 0) {
    await admin.storage.from(DOCUMENTOS_BUCKET).remove(docs.map((d: { storage_path: string }) => d.storage_path));
  }

  try {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo eliminar la cuenta." }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
