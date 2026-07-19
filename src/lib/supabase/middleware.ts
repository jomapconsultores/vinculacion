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

  // Cierre de sesión por inactividad: 30 min sin ninguna petición.
  // Se rastrea la última actividad en una cookie que se refresca en cada
  // request (ventana deslizante). Al vencer se cierra la sesión de Supabase.
  const IDLE_MS = 30 * 60 * 1000;
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
      maxAge: 30 * 60,
    });
  }

  return response;
}
