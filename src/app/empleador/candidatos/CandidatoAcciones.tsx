"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus, Check } from "lucide-react";

const ESTADOS: { value: string; label: string }[] = [
  { value: "enviada", label: "Enviada" },
  { value: "en_revision", label: "En revisión" },
  { value: "preseleccionado", label: "Preseleccionado" },
  { value: "rechazado", label: "Rechazado" },
  { value: "contratado", label: "Contratado" },
];

export function CandidatoAcciones({
  postulacionId,
  estadoActual,
  tieneRetro,
}: {
  postulacionId: number;
  estadoActual: string;
  tieneRetro: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoActual);
  const [savingEstado, setSavingEstado] = useState(false);
  const [openRetro, setOpenRetro] = useState(false);
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState("");
  const [savingRetro, setSavingRetro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function cambiarEstado(nuevo: string) {
    setEstado(nuevo);
    setSavingEstado(true);
    setError(null);
    try {
      const res = await fetch("/api/empleador/candidatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postulacionId, estado: nuevo }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setEstado(estadoActual);
    } finally {
      setSavingEstado(false);
    }
  }

  async function guardarRetro() {
    setSavingRetro(true);
    setError(null);
    try {
      const res = await fetch("/api/empleador/candidatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postulacionId, calificacion, comentario }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setOk(true);
      setOpenRetro(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingRetro(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Estado:</span>
        <select
          className="input h-9 w-auto py-1 text-sm"
          value={estado}
          onChange={(e) => cambiarEstado(e.target.value)}
          disabled={savingEstado}
        >
          {ESTADOS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {savingEstado && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}

        {!tieneRetro && !ok && (
          <button
            type="button"
            onClick={() => setOpenRetro((v) => !v)}
            className="btn-ghost h-9 py-1 text-sm text-slate-600"
          >
            <MessageSquarePlus className="h-4 w-4" /> Retroalimentación
          </button>
        )}
        {(tieneRetro || ok) && (
          <span className="badge bg-emerald-50 text-emerald-700">
            <Check className="h-3 w-3" /> Retroalimentación enviada
          </span>
        )}
      </div>

      {openRetro && (
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Calificación:</span>
            <select
              className="input h-9 w-auto py-1 text-sm"
              value={calificacion}
              onChange={(e) => setCalificacion(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="input mt-2 min-h-[70px] text-sm"
            placeholder="Comentario para el candidato…"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button className="btn-outline h-9 py-1 text-sm" onClick={() => setOpenRetro(false)}>
              Cancelar
            </button>
            <button className="btn-primary h-9 py-1 text-sm" onClick={guardarRetro} disabled={savingRetro}>
              {savingRetro ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
