import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListaPsicometria, type ResultadoAdmin } from "@/components/ListaPsicometria";
import { Brain, ShieldCheck } from "lucide-react";

export default async function AdminPsicometriaPage() {
  const profile = await requireProfile();
  if (profile.rol !== "admin" && profile.rol !== "autoridad") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("psicometria_resultados")
    .select(
      "id, profile_id, puntuaciones, interpretacion, alerta, created_at, profiles(nombres, apellidos, cedula, carreras(nombre))"
    )
    .order("created_at", { ascending: false });

  const resultados = (data ?? []) as unknown as ResultadoAdmin[];
  const conAlerta = resultados.filter((r) => r.alerta).length;

  return (
    <div className="space-y-8">
      <header>
        <span className="badge bg-indigo-50 text-indigo-700">
          <Brain className="h-4 w-4" /> Bienestar
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Evaluaciones psicométricas</h1>
        <p className="mt-1 max-w-3xl text-slate-500">
          Resultados del "Perfil Psicolaboral" que las personas usuarias completan de forma voluntaria.
          {conAlerta > 0 && (
            <> Hay <strong className="text-rose-700">{conAlerta}</strong> {conAlerta === 1 ? "resultado" : "resultados"} con señales de riesgo psicosocial que sugieren acompañamiento.</>
          )}
        </p>
      </header>

      <ListaPsicometria resultados={resultados} />

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
        <p>
          Esta información es de acceso restringido a autoridades y administración institucional, con
          fines de acompañamiento y bienestar. No debe usarse con fines de selección, sanción o
          discriminación laboral.
        </p>
      </div>
    </div>
  );
}
