"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, CheckCircle2, GraduationCap, Award } from "lucide-react";

export function CursoCard({
  curso,
  estadoInicial,
  destacado,
}: {
  curso: { id: number; nombre: string; descripcion: string; duracion_horas: number; modalidad: string; competencia?: string | null };
  estadoInicial: "ninguno" | "en_progreso" | "aprobado";
  destacado: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoInicial);
  const [loading, setLoading] = useState<null | "inscribir" | "aprobar">(null);
  const [error, setError] = useState<string | null>(null);

  async function accionar(accion: "inscribir" | "aprobar") {
    setLoading(accion);
    setError(null);
    try {
      const r = await fetch("/api/curso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId: curso.id, accion }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "No se pudo completar la acción");
      }
      setEstado(accion === "aprobar" ? "aprobado" : "en_progreso");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Sin conexión. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`card p-6 ${destacado ? "ring-2 ring-teal-400" : ""}`}>
      <div className="flex items-start justify-between">
        <GraduationCap className="h-8 w-8 text-blue-700" />
        {estado === "aprobado" && (
          <span className="badge bg-teal-50 text-teal-700"><CheckCircle2 className="h-3.5 w-3.5" /> Aprobado</span>
        )}
        {estado === "en_progreso" && (
          <span className="badge bg-amber-50 text-amber-700">En progreso</span>
        )}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{curso.nombre}</h3>
      <p className="mt-1 text-sm text-slate-500">{curso.descripcion}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {curso.duracion_horas} h</span>
        <span>{curso.modalidad}</span>
      </div>
      {curso.competencia && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
          <Award className="h-4 w-4" /> Avala: <b>{curso.competencia}</b>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {estado === "ninguno" && (
          <button className="btn-outline flex-1" onClick={() => accionar("inscribir")} disabled={!!loading}>
            {loading === "inscribir" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Inscribirme
          </button>
        )}
        {estado === "en_progreso" && (
          <button className="btn-primary flex-1" onClick={() => accionar("aprobar")} disabled={!!loading}>
            {loading === "aprobar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            Aprobar y avalar
          </button>
        )}
        {estado === "aprobado" && (
          <p className="flex-1 text-center text-sm font-medium text-teal-700">Competencia avalada ✓</p>
        )}
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">{error}</p>}
      {estado === "en_progreso" && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          (Demo) &quot;Aprobar&quot; simula la culminación del curso y el aval institucional.
        </p>
      )}
    </div>
  );
}
