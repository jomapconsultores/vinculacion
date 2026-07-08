import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = cookies();

  // Se construye primero la respuesta de redirección y se hace que Supabase
  // escriba las cookies (borrado de sesión) SOBRE ella. Devolver un
  // NextResponse nuevo sin esto perdía los Set-Cookie y la sesión no se
  // cerraba. El Location es RELATIVO ("/"): el navegador lo resuelve contra el
  // dominio público, evitando el redirect a localhost detrás del proxy.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/" },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();
  return response;
}
