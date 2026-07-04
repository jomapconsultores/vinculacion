import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Solo admin/autoridad (is_staff()) llegan a ver documentos de otra persona;
// RLS ya lo exige a nivel de fila, pero devolvemos 403 explícito para no
// depender solo del silencio de una tabla vacía.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, aprobado")
    .eq("id", user.id)
    .maybeSingle();
  const esStaff = !!perfil && (perfil.rol === "admin" || (perfil.rol === "autoridad" && perfil.aprobado));
  if (!esStaff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { data, error } = await supabase
    .from("documentos_personales")
    .select("id, categoria, nombre_original, mime_type, tamano_bytes, created_at")
    .eq("profile_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documentos: data ?? [] });
}
