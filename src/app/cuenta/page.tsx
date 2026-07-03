import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { CuentaForm } from "@/components/CuentaForm";
import { ArrowLeft, HeartHandshake } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const profile = await requireProfile();

  const inicio =
    profile.rol === "empleador" ? "/empleador"
    : profile.rol === "admin" || profile.rol === "autoridad" ? "/admin"
    : "/dashboard";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-blue-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
              <HeartHandshake className="h-5 w-5" />
            </div>
            Conecta
          </div>
          <Link href={inicio} className="btn-ghost text-slate-500">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Mi cuenta</h1>
        <p className="mt-1 text-slate-500">Gestiona tus credenciales de acceso.</p>
        <div className="mt-6">
          <CuentaForm emailActual={profile.email ?? ""} />
        </div>
      </main>
    </div>
  );
}
