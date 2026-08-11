import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/empleador") ||
    path.startsWith("/admin") ||
    path.startsWith("/cuenta");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Cierre de sesión por inactividad: 20 min sin ninguna petición.
  // Se rastrea la última actividad en una cookie que se refresca en cada
  // request (ventana deslizante). Al vencer se cierra la sesión de Supabase.
  //
  // OJO con los dos plazos de abajo: NUNCA deben ser iguales. Antes lo eran
  // (ambos 30 min) y eso hacía que este corte no se ejecutara jamás. El
  // navegador borraba la cookie justo al cumplirse el plazo, así que cuando la
  // condición `now - last > IDLE_MS` habría sido cierta ya no quedaba cookie
  // que leer: `parseInt(undefined)` daba NaN, la guarda `!Number.isNaN(last)`
  // era falsa, y el middleware seguía adelante recreando la cookie. La sesión
  // no caducaba nunca por inactividad.
  //
  // La cookie vive ahora mucho más (24 h) que la ventana de inactividad, de
  // modo que al volver tras 20 minutos la marca SIGUE ahí y el corte dispara.
  const IDLE_MS = 20 * 60 * 1000;
  const ACTIVITY_MAX_AGE_S = 24 * 60 * 60;
  const ACTIVITY_COOKIE = "last_activity";
  if (user) {
    const now = Date.now();
    const raw = request.cookies.get(ACTIVITY_COOKIE)?.value;
    const last = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isNaN(last) && now - last > IDLE_MS) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirect = NextResponse.redirect(url);
      // Conserva las cookies de cierre de sesión que fijó signOut() y borra
      // la de actividad.
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      redirect.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
      return redirect;
    }
    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: ACTIVITY_MAX_AGE_S,
    });
  }

  return response;
}
