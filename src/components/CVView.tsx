"use client";

import { useState } from "react";
import { Sparkles, Loader2, Printer, Lightbulb } from "lucide-react";

type CV = {
  resumen?: string;
  experiencia?: { cargo: string; empresa: string; periodo: string; logros: string[] }[];
  educacion?: { titulo: string; institucion: string; periodo: string }[];
  habilidades?: string[];
  sugerencias?: string[];
};

export function CVView({
  cvInicial,
  generadoIa,
  nombre,
  titulo,
  contacto,
}: {
  cvInicial: CV | null;
  generadoIa: boolean;
  nombre: string;
  titulo: string;
  contacto: string;
}) {
  const [cv, setCv] = useState<CV | null>(cvInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ia, setIa] = useState(generadoIa);

  async function generar() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/cv/generar", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setCv(j.cv);
      setIa(true);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi CV inteligente</h1>
          <p className="mt-1 text-slate-500">La IA redacta tu hoja de vida a partir de tu perfil.</p>
        </div>
        <div className="flex gap-2">
          {cv && (
            <button className="btn-outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </button>
          )}
          <button className="btn-primary" onClick={generar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {cv ? "Regenerar con IA" : "Generar con IA"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 print:hidden">{error}</p>}

      {!cv && !loading && (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center print:hidden">
          <Sparkles className="h-10 w-10 text-teal-500" />
          <p className="max-w-sm text-slate-500">
            Aún no has generado tu CV. Pulsa <b>Generar con IA</b> y crearemos una hoja de vida
            profesional desde tus datos.
          </p>
        </div>
      )}

      {cv && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* CV imprimible */}
          <div className="card p-8 lg:col-span-2 print:border-0 print:shadow-none">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-2xl font-bold text-slate-900">{nombre}</h2>
              <p className="text-teal-700">{titulo}</p>
              <p className="text-sm text-slate-400">{contacto}</p>
            </div>

            {cv.resumen && (
              <section className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Perfil</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{cv.resumen}</p>
              </section>
            )}

            {cv.experiencia?.length ? (
              <section className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Experiencia</h3>
                <div className="mt-2 space-y-4">
                  {cv.experiencia.map((e, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between">
                        <p className="font-semibold text-slate-800">{e.cargo}</p>
                        <span className="text-xs text-slate-400">{e.periodo}</span>
                      </div>
                      <p className="text-sm text-slate-500">{e.empresa}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                        {e.logros?.map((l, j) => <li key={j}>{l}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {cv.educacion?.length ? (
              <section className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Educación</h3>
                <div className="mt-2 space-y-2">
                  {cv.educacion.map((e, i) => (
                    <div key={i} className="flex items-baseline justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{e.titulo}</p>
                        <p className="text-sm text-slate-500">{e.institucion}</p>
                      </div>
                      <span className="text-xs text-slate-400">{e.periodo}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {cv.habilidades?.length ? (
              <section className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Habilidades</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cv.habilidades.map((h, i) => (
                    <span key={i} className="badge bg-slate-100 text-slate-600">{h}</span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Sugerencias IA */}
          {cv.sugerencias?.length ? (
            <aside className="card h-fit border-teal-200 bg-teal-50/50 p-6 print:hidden">
              <h3 className="flex items-center gap-2 font-semibold text-teal-800">
                <Lightbulb className="h-5 w-5" /> Sugerencias de la IA
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-teal-900">
                {cv.sugerencias.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
