import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListaPsicometria, type ResultadoAdmin } from "@/components/ListaPsicometria";
import { Brain, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

export default async function AdminPsicometriaPage({ searchParams }: { searchParams: { page?: string } }) {
  const profile = await requireProfile();
  if (profile.rol !== "admin" && profile.rol !== "autoridad") {
    redirect("/dashboard");
  }

  const page = Math.max(1, Number(searchParams.page) || 1);
  const desde = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const [{ data, count }, { count: countAlerta }] = await Promise.all([
    supabase
      .from("psicometria_resultados")
      .select(
        "id, profile_id, puntuaciones, interpretacion, alerta, created_at, profiles(nombres, apellidos, cedula, carreras(nombre))",
        { count: "exact" }
      )
      .order("alerta", { ascending: false })
      .order("created_at", { ascending: false })
      .range(desde, desde + PAGE_SIZE - 1),
    supabase.from("psicometria_resultados").select("id", { count: "exact", head: true }).eq("alerta", true),
  ]);

  const resultados = (data ?? []) as unknown as ResultadoAdmin[];
  const totalRegistros = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / PAGE_SIZE));
  const conAlerta = countAlerta ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <span className="badge bg-indigo-50 text-indigo-700">
          <Brain className="h-4 w-4" /> Bienestar
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Evaluaciones psicométricas</h1>
        <p className="mt-1 max-w-3xl text-slate-500">
          Resultados del &quot;Perfil Psicolaboral&quot; que las personas usuarias completan de forma voluntaria.
          {conAlerta > 0 && (
            <> Hay <strong className="text-rose-700">{conAlerta}</strong> {conAlerta === 1 ? "resultado" : "resultados"} con señales de riesgo psicosocial que sugieren acompañamiento.</>
          )}
        </p>
      </header>

      <ListaPsicometria resultados={resultados} />

      {totalPaginas > 1 && (
        <div className="card flex items-center justify-between px-4 py-3 text-sm text-slate-500">
          <span>Página {page} de {totalPaginas} · {totalRegistros} resultados</span>
          <div className="flex gap-2">
            <Link
              href={`?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`btn-outline ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
            <Link
              href={`?page=${page + 1}`}
              aria-disabled={page >= totalPaginas}
              className={`btn-outline ${page >= totalPaginas ? "pointer-events-none opacity-40" : ""}`}
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

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
