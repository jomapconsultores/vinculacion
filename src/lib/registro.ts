import { createAdminClient } from "@/lib/supabase/server";

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}***${u.slice(-1)}@${d}`;
}

// Si la cédula ya pertenece a otra cuenta, devuelve un mensaje útil; si no, null.
export async function cedulaOcupada(cedula?: string): Promise<string | null> {
  const limpia = (cedula || "").replace(/\D/g, "");
  if (limpia.length !== 10) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("email").eq("cedula", limpia).maybeSingle();
    if (data?.email) {
      return `Esta cédula ya está registrada con el correo ${maskEmail(data.email)}. Inicia sesión con esa cuenta o usa "¿Olvidaste tu contraseña?".`;
    }
  } catch {}
  return null;
}
