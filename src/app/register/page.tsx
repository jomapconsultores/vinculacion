"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HeartHandshake, CheckCircle2, Loader2, MailCheck } from "lucide-react";

function RegisterForm() {
  const params = useSearchParams();
  const rolInicial = params.get("rol") === "empleador" ? "empleador" : "graduado";

  const [rol, setRol] = useState<"graduado" | "empleador">(rolInicial as any);
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [padron, setPadron] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  // Vista previa del padrón en vivo
  useEffect(() => {
    if (rol !== "graduado" || cedula.trim().length < 10) {
      setPadron(null);
      return;
    }
    const ctrl = new AbortController();
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/padron?cedula=${cedula.trim()}`, { signal: ctrl.signal });
        setPadron(await r.json());
      } catch {}
      setBuscando(false);
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [cedula, rol]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { cedula, rol, empresa_nombre: empresa },
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-teal-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Revisa tu correo</h1>
        <p className="mt-2 text-slate-500">
          Enviamos un enlace de verificación a <b>{email}</b>. Confírmalo para activar tu cuenta
          e ingresar a tu perfil autollenado.
        </p>
        <Link href="/login" className="btn-outline mt-6">Ir a ingresar</Link>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-md p-8">
      <h1 className="text-xl font-bold text-slate-900">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-500">
        Verificamos tu identidad y autollenamos tus datos institucionales.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm">
        {(["graduado", "empleador"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRol(r)}
            className={`rounded-md py-1.5 font-medium capitalize transition ${
              rol === r ? "bg-white shadow-sm text-blue-900" : "text-slate-500"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {rol === "graduado" && (
          <div>
            <label className="label">Cédula</label>
            <input
              className="input"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej. 0102030405"
              maxLength={10}
              required
            />
            {buscando && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando en el padrón…
              </p>
            )}
            {padron?.encontrado && (
              <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
                <p className="flex items-center gap-1 font-medium text-teal-800">
                  <CheckCircle2 className="h-4 w-4" /> Graduado verificado
                </p>
                <p className="text-teal-700">
                  {padron.nombres} {padron.apellidos} — {padron.carrera} ({padron.anio_graduacion})
                </p>
              </div>
            )}
            {padron && !padron.encontrado && cedula.length === 10 && (
              <p className="mt-1 text-xs text-amber-600">
                No estás en el padrón; podrás completar tus datos manualmente.
              </p>
            )}
          </div>
        )}

        {rol === "empleador" && (
          <div>
            <label className="label">Nombre de la empresa</label>
            <input className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
          </div>
        )}

        <div>
          <label className="label">Correo electrónico</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>

        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
          Crear cuenta
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta? <Link href="/login" className="font-medium text-blue-700">Ingresar</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
