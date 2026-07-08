import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { origenPublico } from "@/lib/url";

// Intercambia el código del enlace de verificación por una sesión.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Origen público (no localhost) para que el redirect tras verificar el correo
  // vuelva al dominio real detrás del proxy.
  const origin = origenPublico(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=verificacion`);
}
