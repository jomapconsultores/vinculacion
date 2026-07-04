import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PsicometriaForm, { type ResultadoGuardado } from "./PsicometriaForm";

export const dynamic = "force-dynamic";

// requireProfile() ya lo exige dashboard/layout.tsx antes de llegar aquí; se
// vuelve a llamar (memoizado por request) solo para tener el id del usuario.
export default async function PsicometriaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("psicometria_resultados")
    .select("id, tipo, puntuaciones, interpretacion, alerta, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });
  if (error) console.error("[dashboard/psicometria] historial:", error.message);

  return <PsicometriaForm historialInicial={(data ?? []) as unknown as ResultadoGuardado[]} />;
}
