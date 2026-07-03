"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, RefreshCw, Search, Download, BadgeCheck, ExternalLink } from "lucide-react";

type Titulo = {
  titulo: string;
  institucion: string;
  tipo: string;
  numero_registro: string;
  fecha_registro: string;
  area: string;
};

export function SenescytLive({ cedula }: { cedula: string | null }) {
  const router = useRouter();
  const [ced, setCed] = useState(cedula ?? "");
  const [sesion, setSesion] = useState<{ jsessionid: string; viewstate: string; captcha: string } | null>(null);
  const [captchaTxt, setCaptchaTxt] = useState("");
  const [cargandoCaptcha, setCargandoCaptcha] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [titulos, setTitulos] = useState<Titulo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function cargarCaptcha() {
    setCargandoCaptcha(true);
    setError(null);
    setCaptchaTxt("");
    try {
      const r = await fetch("/api/senescyt/live");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No disponible");
      setSesion(j);
      setTitulos(null);
    } catch (e: any) {
      setError(e.message);
    }
    setCargandoCaptcha(false);
  }

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    if (!sesion) return;
    setConsultando(true);
    setError(null);
    setMsg(null);
    try {
      const r = await fetch("/api/senescyt/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sesion, cedula: ced, captcha: captchaTxt }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 422 || r.status === 440) await cargarCaptcha(); // captcha malo/expirado → nuevo
        throw new Error(j.error || "No se pudo consultar");
      }
      setTitulos(j.titulos);
    } catch (e: any) {
      setError(e.message);
    }
    setConsultando(false);
  }

  async function importar() {
    if (!titulos?.length) return;
    setImportando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/senescyt/live/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulos }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMsg(j.importados > 0 ? `Se agregaron ${j.importados} título(s) a tu educación.` : "Tus títulos ya estaban en tu perfil.");
      router.refresh();
    } catch (e: any) {
      setMsg(e.message || "No se pudo importar.");
    }
    setImportando(false);
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-teal-600" /> Consulta oficial en SENESCYT
        </h2>
        <span className="badge bg-teal-50 text-teal-700">En vivo</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Consulta tus títulos directamente en el sistema oficial de SENESCYT. Resuelve el código de
        seguridad de la imagen (igual que en el sitio oficial) y verás tus títulos reales.
      </p>

      {!sesion && (
        <button className="btn-primary mt-4" onClick={cargarCaptcha} disabled={cargandoCaptcha}>
          {cargandoCaptcha ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Consultar en SENESCYT
        </button>
      )}

      {sesion && (
        <form onSubmit={consultar} className="mt-4 space-y-3">
          <div>
            <label className="label">Cédula</label>
            <input className="input" value={ced} onChange={(e) => setCed(e.target.value.replace(/\D/g, ""))} maxLength={10} required />
          </div>
          <div>
            <label className="label">Código de seguridad de la imagen</label>
            <div className="flex items-center gap-3">
              <img src={sesion.captcha} alt="Código de seguridad SENESCYT" className="h-12 rounded border border-slate-200 bg-white" />
              <button type="button" onClick={cargarCaptcha} className="btn-ghost" title="Cambiar imagen" disabled={cargandoCaptcha}>
                {cargandoCaptcha ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            </div>
            <input
              className="input mt-2 w-48"
              value={captchaTxt}
              onChange={(e) => setCaptchaTxt(e.target.value)}
              placeholder="Escribe el código"
              autoComplete="off"
              required
            />
          </div>
          <button className="btn-primary" disabled={consultando}>
            {consultando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar títulos
          </button>
        </form>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {titulos !== null && (
        <div className="mt-4">
          {titulos.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              SENESCYT no registra títulos para esta cédula.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {titulos.map((t, i) => (
                  <div key={i} className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                      <BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" /> {t.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[t.institucion, t.tipo, t.fecha_registro].filter(Boolean).join(" · ")}
                    </p>
                    {t.area && <p className="text-xs text-teal-700">{t.area}</p>}
                    {t.numero_registro && <p className="text-xs text-slate-400">Registro: {t.numero_registro}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className="btn-primary" onClick={importar} disabled={importando}>
                  {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Agregar a mi educación
                </button>
                <a
                  href="https://www.senescyt.gob.ec/consulta-titulos-web/faces/vista/consulta/consulta.xhtml"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                >
                  Sitio oficial <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          )}
          {msg && <p className="mt-3 rounded-lg bg-teal-50 p-2 text-sm text-teal-700">{msg}</p>}
        </div>
      )}
    </section>
  );
}
