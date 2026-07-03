"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { HeartHandshake, Loader2, CheckCircle2, KeyRound } from "lucide-react";

export default function RestablecerPage() {
  const router = useRouter();
  const [sesionOk, setSesionOk] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/password")
      .then((r) => r.json())
      .then((j) => setSesionOk(!!j.authenticated))
      .catch(() => setSesionOk(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await r.json().catch(() => ({}));
      setLoading(false);
      if (!r.ok) return setError(j.error || "No se pudo actualizar la contraseña.");
      setListo(true);
      setTimeout(() => {
        window.location.assign("/dashboard");
      }, 1500);
    } catch {
      setLoading(false);
      setError("Sin conexión con el servidor. Intenta de nuevo.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2 font-semibold text-blue-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          Proyecto Conecta
        </div>

        {sesionOk === null && (
          <p className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando enlace…
          </p>
        )}

        {sesionOk === false && (
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">Enlace inválido o expirado</h1>
            <p className="mt-2 text-slate-500">
              Solicita un nuevo enlace de recuperación e inténtalo otra vez.
            </p>
            <Link href="/recuperar" className="btn-primary mt-6">Solicitar nuevo enlace</Link>
          </div>
        )}

        {sesionOk && (listo ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Contraseña actualizada</h1>
            <p className="mt-2 text-slate-500">Entrando a tu panel…</p>
          </div>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <KeyRound className="h-5 w-5 text-teal-600" /> Nueva contraseña
            </h1>
            <p className="mt-1 text-sm text-slate-500">Define tu nueva contraseña de acceso.</p>
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="label">Nueva contraseña</label>
                <PasswordInput value={password} onChange={setPassword} minLength={6} required autoComplete="new-password" />
                <p className="mt-1 text-xs text-slate-400">Mínimo 6 caracteres.</p>
              </div>
              <div>
                <label className="label">Confirmar contraseña</label>
                <PasswordInput value={confirmar} onChange={setConfirmar} minLength={6} required autoComplete="new-password" />
              </div>
              {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Guardar contraseña
              </button>
            </form>
          </>
        ))}
      </div>
    </div>
  );
}
