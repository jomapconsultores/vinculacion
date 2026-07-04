"use client";

import { useState } from "react";
import { type Dimension, type PuntuacionDimension } from "@/lib/psicometria";
import { InformePsicometrico } from "@/components/InformePsicometrico";
import { AlertTriangle, ChevronDown, ChevronUp, UserRound } from "lucide-react";

export type ResultadoAdmin = {
  id: number;
  profile_id: string;
  puntuaciones: Record<Dimension, PuntuacionDimension>;
  interpretacion: Record<Dimension, string> & { resumen: string };
  alerta: boolean;
  created_at: string;
  profiles: {
    nombres: string | null;
    apellidos: string | null;
    cedula: string | null;
    carreras: { nombre: string } | null;
  } | null;
};

export function ListaPsicometria({ resultados }: { resultados: ResultadoAdmin[] }) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const [soloAlerta, setSoloAlerta] = useState(false);

  if (resultados.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-400">
        Todavía nadie ha completado la evaluación psicométrica.
      </div>
    );
  }

  // Los casos con alerta van primero (son los que requieren atención), y el
  // filtro permite enfocarse solo en ellos cuando la lista crece.
  const ordenados = [...resultados].sort((a, b) => Number(b.alerta) - Number(a.alerta));
  const visibles = soloAlerta ? ordenados.filter((r) => r.alerta) : ordenados;
  const conAlerta = resultados.filter((r) => r.alerta).length;

  return (
    <div className="space-y-3">
      <label className="flex w-fit items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={soloAlerta}
          onChange={(e) => setSoloAlerta(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Mostrar solo con alerta ({conAlerta})
      </label>

      {visibles.length === 0 && (
        <div className="card p-6 text-sm text-slate-400">No hay resultados con alerta.</div>
      )}

      {visibles.map((r) => {
        const nombre = [r.profiles?.nombres, r.profiles?.apellidos].filter(Boolean).join(" ") || "Persona sin nombre registrado";
        const expandido = abierto === r.id;
        return (
          <div key={r.id} className={`card overflow-hidden ${r.alerta ? "border-rose-200" : ""}`}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
              onClick={() => setAbierto(expandido ? null : r.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{nombre}</p>
                  <p className="text-xs text-slate-400">
                    {r.profiles?.carreras?.nombre ?? "Carrera no registrada"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("es-EC")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.alerta && (
                  <span className="badge bg-rose-50 text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Riesgo elevado
                  </span>
                )}
                {expandido ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>

            {expandido && (
              <div className="border-t border-slate-100 bg-slate-50 p-4">
                <InformePsicometrico
                  puntuaciones={r.puntuaciones}
                  interpretacion={r.interpretacion}
                  alerta={r.alerta}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
