import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { passwordCorrecta } from "@/lib/verificar-password";

// Elimina por completo la cuenta del usuario (auth + datos por cascada).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { password } = await req.json().catch(() => ({}));
  if (!(await passwordCorrecta(user.email, password || ""))) {
    return NextResponse.json({ error: "Confirma tu contraseña para eliminar tu cuenta." }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo eliminar la cuenta." }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
