"use client";

import { useState } from "react";
import Link from "next/link";
import { PasswordInput } from "@/components/PasswordInput";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Login same-origin: no depende de que el navegador alcance supabase.co
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setLoading(false);
        return setError(j.error || "No se pudo iniciar sesión. Intenta de nuevo.");
      }
      window.location.assign("/dashboard");
    } catch {
      setLoading(false);
      setError("Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6">
          <Logo size="md" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Ingresar</h1>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Contraseña</label>
              <Link href="/recuperar" className="mb-1 text-xs font-medium text-blue-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput value={password} onChange={setPassword} required />
          </div>
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Ingresar
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿No tienes cuenta? <Link href="/register" className="font-medium text-blue-700">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
