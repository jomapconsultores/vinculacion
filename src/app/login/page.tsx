"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { HeartHandshake, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    // Navegación completa: garantiza que la cookie de sesión llegue al servidor
    // y el middleware reconozca la sesión (evita el rebote a /login).
    window.location.assign("/dashboard");
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
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">Credenciales inválidas o correo sin verificar.</p>}
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
