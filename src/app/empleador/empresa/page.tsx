import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { EmpresaForm } from "./EmpresaForm";
import { Building2, CheckCircle2, Clock } from "lucide-react";

export default async function EmpresaPage() {
  const profile = await requireProfile();

  if (!profile.empresa_id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Mi empresa</h1>
        <div className="card p-8 text-center text-slate-500">
          Tu cuenta no tiene una empresa asociada. Contacta al administrador.
        </div>
      </div>
    );
  }

  // Las políticas RLS solo permiten leer empresas validadas; usamos admin acotado
  // a la empresa del propio empleador.
  const admin = createAdminClient();
  const { data: empresa } = await admin
    .from("empresas")
    .select("nombre, ruc, sector, descripcion, validada")
    .eq("id", profile.empresa_id)
    .maybeSingle();

  const e = (empresa as any) ?? { nombre: "", ruc: "", sector: "", descripcion: "", validada: false };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mi empresa</h1>
            <p className="text-sm text-slate-500">Mantén actualizados los datos de tu organización.</p>
          </div>
        </div>
        {e.validada ? (
          <span className="badge bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validada
          </span>
        ) : (
          <span className="badge bg-amber-50 text-amber-700">
            <Clock className="h-3.5 w-3.5" /> Pendiente de validación
          </span>
        )}
      </div>

      <EmpresaForm inicial={e} />
    </div>
  );
}
