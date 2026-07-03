"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartHandshake, Loader2, MailCheck, KeyRound } from "lucide-react";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setLoading(false);
      if (!r.ok) setError("No se pudo enviar el correo. Verifica la dirección e intenta de nuevo.");
      else setEnviado(true);
    } catch {
      setLoading(false);
      setError("Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.");
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

        {enviado ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-12 w-12 text-teal-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Revisa tu correo</h1>
            <p className="mt-2 text-slate-500">
              Si <b>{email}</b> está registrado, te enviamos un enlace para restablecer tu contraseña.
            </p>
            <Link href="/login" className="btn-outline mt-6">Volver a ingresar</Link>
          </div>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <KeyRound className="h-5 w-5 text-teal-600" /> ¿Olvidaste tu contraseña?
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Escribe tu correo y te enviaremos un enlace para crear una nueva.
            </p>
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="label">Correo electrónico</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enviar enlace
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              <Link href="/login" className="font-medium text-blue-700">Volver a ingresar</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
