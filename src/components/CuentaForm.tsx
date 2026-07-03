"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { Mail, KeyRound, Trash2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

function Aviso({ tipo, children }: { tipo: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p className={`flex items-center gap-2 rounded-lg p-2 text-sm ${tipo === "ok" ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}`}>
      {tipo === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {children}
    </p>
  );
}

export function CuentaForm({ emailActual }: { emailActual: string }) {
  // Correo
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [passEmail, setPassEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ t: "ok" | "error"; m: string } | null>(null);
  const [emailLoad, setEmailLoad] = useState(false);

  // Contraseña
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passMsg, setPassMsg] = useState<{ t: "ok" | "error"; m: string } | null>(null);
  const [passLoad, setPassLoad] = useState(false);

  // Eliminar
  const [passDel, setPassDel] = useState("");
  const [confirmarTexto, setConfirmarTexto] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [delLoad, setDelLoad] = useState(false);

  async function cambiarEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoad(true);
    setEmailMsg(null);
    const r = await fetch("/api/cuenta/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: nuevoEmail, password: passEmail }),
    });
    const j = await r.json().catch(() => ({}));
    setEmailLoad(false);
    if (r.ok) {
      setEmailMsg({ t: "ok", m: `Enviamos un enlace de confirmación a ${nuevoEmail}. El cambio se aplica al confirmarlo.` });
      setNuevoEmail(""); setPassEmail("");
    } else setEmailMsg({ t: "error", m: j.error || "No se pudo cambiar el correo." });
  }

  async function cambiarPass(e: React.FormEvent) {
    e.preventDefault();
    setPassLoad(true);
    setPassMsg(null);
    const r = await fetch("/api/cuenta/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual: passActual, nueva: passNueva }),
    });
    const j = await r.json().catch(() => ({}));
    setPassLoad(false);
    if (r.ok) {
      setPassMsg({ t: "ok", m: "Contraseña actualizada." });
      setPassActual(""); setPassNueva("");
    } else setPassMsg({ t: "error", m: j.error || "No se pudo cambiar la contraseña." });
  }

  async function eliminar(e: React.FormEvent) {
    e.preventDefault();
    setDelLoad(true);
    setDelMsg(null);
    const r = await fetch("/api/cuenta/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passDel }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      window.location.assign("/?cuenta=eliminada");
      return;
    }
    setDelLoad(false);
    setDelMsg(j.error || "No se pudo eliminar la cuenta.");
  }

  return (
    <div className="space-y-6">
      {/* Correo */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Mail className="h-5 w-5 text-blue-700" /> Correo electrónico</h2>
        <p className="mt-1 text-sm text-slate-500">Tu correo actual es <b>{emailActual}</b>.</p>
        <form onSubmit={cambiarEmail} className="mt-4 space-y-3">
          <div>
            <label className="label">Nuevo correo</label>
            <input type="email" className="input" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Confirma tu contraseña</label>
            <PasswordInput value={passEmail} onChange={setPassEmail} required />
          </div>
          {emailMsg && <Aviso tipo={emailMsg.t}>{emailMsg.m}</Aviso>}
          <button className="btn-primary" disabled={emailLoad}>
            {emailLoad && <Loader2 className="h-4 w-4 animate-spin" />} Cambiar correo
          </button>
        </form>
      </section>

      {/* Contraseña */}
      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><KeyRound className="h-5 w-5 text-teal-600" /> Contraseña</h2>
        <form onSubmit={cambiarPass} className="mt-4 space-y-3">
          <div>
            <label className="label">Contraseña actual</label>
            <PasswordInput value={passActual} onChange={setPassActual} required />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <PasswordInput value={passNueva} onChange={setPassNueva} minLength={6} required autoComplete="new-password" />
            <p className="mt-1 text-xs text-slate-400">Mínimo 6 caracteres.</p>
          </div>
          {passMsg && <Aviso tipo={passMsg.t}>{passMsg.m}</Aviso>}
          <button className="btn-primary" disabled={passLoad}>
            {passLoad && <Loader2 className="h-4 w-4 animate-spin" />} Cambiar contraseña
          </button>
        </form>
      </section>

      {/* Eliminar cuenta */}
      <section className="card border-red-200 p-6">
        <h2 className="flex items-center gap-2 font-semibold text-red-700"><Trash2 className="h-5 w-5" /> Eliminar mi cuenta</h2>
        <p className="mt-1 text-sm text-slate-500">
          Esta acción es <b>permanente</b>: se borran tu cuenta y todos tus datos (perfil, CV, postulaciones,
          títulos, etc.). No se puede deshacer.
        </p>
        <form onSubmit={eliminar} className="mt-4 space-y-3">
          <div>
            <label className="label">Confirma tu contraseña</label>
            <PasswordInput value={passDel} onChange={setPassDel} required />
          </div>
          <div>
            <label className="label">Escribe <b>ELIMINAR</b> para confirmar</label>
            <input className="input" value={confirmarTexto} onChange={(e) => setConfirmarTexto(e.target.value)} placeholder="ELIMINAR" />
          </div>
          {delMsg && <Aviso tipo="error">{delMsg}</Aviso>}
          <button className="btn bg-red-600 text-white hover:bg-red-700" disabled={delLoad || confirmarTexto !== "ELIMINAR"}>
            {delLoad ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar mi cuenta permanentemente
          </button>
        </form>
      </section>
    </div>
  );
}
