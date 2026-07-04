"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, GraduationCap, Send } from "lucide-react";

type Brecha = { competencia: string; por_que: string; curso_sugerido: string | null; curso_id: number | null };
type Analisis = {
  match_score: number;
  apto: boolean;
  fortalezas: string[];
  brechas: Brecha[];
  recomendacion: string;
  fuente: "ia" | "heuristica";
};

export function PostularPanel({
  empleoId,
  analisisInicial,
  yaEnviada,
}: {
  empleoId: number;
  analisisInicial: Analisis | null;
  yaEnviada: boolean;
}) {
  const [analisis, setAnalisis] = useState<Analisis | null>(analisisInicial);
  const [loading, setLoading] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviada, setEnviada] = useState(yaEnviada);
  const [error, setError] = useState<string | null>(null);

  async function evaluar() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/postular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empleoId, accion: "evaluar" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setAnalisis(j.analisis);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function confirmar() {
    setConfirmando(true);
    setError(null);
    try {
      const r = await fetch("/api/postular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empleoId, accion: "confirmar" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setAnalisis(j.analisis);
      setEnviada(true);
    } catch (e: any) {
      setError(e.message);
    }
    setConfirmando(false);
  }

  const color = analisis
    ? analisis.match_score >= 80 ? "text-teal-600" : analisis.match_score >= 50 ? "text-amber-500" : "text-red-500"
    : "";

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <Sparkles className="h-5 w-5 text-teal-600" /> Evaluación de competencias con IA
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Antes de postular, la IA compara tu perfil con los requisitos y te dice qué te falta.
      </p>

      {!analisis && (
        <button className="btn-primary mt-4" onClick={evaluar} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Evaluar mi postulación
        </button>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {analisis && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                  className={color} strokeDasharray={`${analisis.match_score} 100`} strokeLinecap="round" />
              </svg>
              <span className={`absolute text-xl font-bold ${color}`}>{analisis.match_score}%</span>
            </div>
            <div className="flex-1">
              {analisis.apto ? (
                <p className="flex items-center gap-2 font-medium text-teal-700"><CheckCircle2 className="h-5 w-5" /> Cumples el perfil requerido</p>
              ) : (
                <p className="flex items-center gap-2 font-medium text-amber-600"><AlertTriangle className="h-5 w-5" /> Te faltan competencias avaladas</p>
              )}
              <p className="mt-1 text-sm text-slate-600">{analisis.recomendacion}</p>
              {analisis.fuente === "heuristica" && (
                <p className="mt-1 text-xs text-slate-400">Evaluación heurística (IA no configurada).</p>
              )}
            </div>
          </div>

          {analisis.fortalezas?.length ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Tus fortalezas</h3>
              <ul className="mt-2 space-y-1">
                {analisis.fortalezas.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" /> {f}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {analisis.brechas?.length ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Brechas y cómo cerrarlas</h3>
              <div className="mt-2 space-y-3">
                {analisis.brechas.map((b, i) => (
                  <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-medium text-amber-900">{b.competencia}</p>
                    <p className="mt-0.5 text-sm text-amber-800">{b.por_que}</p>
                    {b.curso_sugerido && (
                      <Link
                        href={`/dashboard/cursos${b.curso_id ? `?curso=${b.curso_id}` : ""}`}
                        className="btn-accent mt-3"
                      >
                        <GraduationCap className="h-4 w-4" /> Estudiar: {b.curso_sugerido}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            {enviada ? (
              <button className="btn-primary" disabled>
                <CheckCircle2 className="h-4 w-4" /> Postulación enviada
              </button>
            ) : (
              <button className="btn-primary" disabled={!analisis.apto || confirmando} onClick={confirmar}>
                {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {analisis.apto ? "Confirmar y enviar postulación" : "Habilítate para postular"}
              </button>
            )}
            {!analisis.apto && !enviada && (
              <span className="text-sm text-slate-500">Completa los cursos avalados para habilitar la postulación.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
