import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CVView } from "@/components/CVView";

export default async function CVPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: cv } = await supabase
    .from("cvs")
    .select("contenido, generado_ia")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const contacto = [profile.email, profile.telefono, profile.ciudad].filter(Boolean).join(" · ");

  return (
    <CVView
      cvInicial={(cv?.contenido as any) ?? null}
      generadoIa={!!cv?.generado_ia}
      nombre={`${profile.nombres ?? ""} ${profile.apellidos ?? ""}`.trim()}
      titulo={profile.titulo ?? profile.carreras?.nombre ?? ""}
      contacto={contacto}
    />
  );
}
