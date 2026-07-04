import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Rol = "estudiante" | "profesional" | "graduado" | "empleador" | "autoridad" | "admin";

export type Profile = {
  id: string;
  rol: Rol;
  aprobado: boolean;
  cedula: string | null;
  nombres: string | null;
  apellidos: string | null;
  carrera_id: number | null;
  anio_graduacion: number | null;
  titulo: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  linkedin: string | null;
  resumen_profesional: string | null;
  empresa_id: number | null;
  origen_padron: boolean;
  carreras?: { nombre: string } | null;
};

// cache() memoiza por request de servidor: layout + page pueden llamar
// requireProfile()/getSessionProfile() por separado sin duplicar el
// round-trip a Supabase (auth.getUser() + select de profiles).
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*, carreras(nombre)")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
}
