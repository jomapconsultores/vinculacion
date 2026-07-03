// Verifica la contraseña actual del usuario sin alterar su sesión
// (consulta directa a GoTrue desde el servidor).
export async function passwordCorrecta(email: string, password: string): Promise<boolean> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
