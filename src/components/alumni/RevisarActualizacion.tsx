"use client";

// Tarjeta de revisión de una actualización de alumni: diff campo a campo
// (valor actual vs propuesto) + títulos nuevos + aprobar/rechazar.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Mic, FileText, Pencil } from "lucide-react";

const ETIQUETAS: Record<string, string> = {
  genero: "Género",
  email: "Correo",
  celular: "Celular",
  telefono_fijo: "Teléfono fijo",
  ciudad: "Ciudad",
  ocupacion: "Ocupación",
  cargo: "Cargo",
  empresa: "Empresa",
};

type Titulo = { titulo: string; nivel: string | null; instituto: string | null; anio: number | null };

export function RevisarActualizacion({
  id,
  cedula,
  creada,
  actual,
  payload,
}: {
  id: number;
  cedula: string;
  creada: string;
  actual: Record<string, string | null> | null;
  payload: {
    datos?: Record<string, string | null>;
    titulos?: Titulo[];
    origen_campos?: Record<string, string>;
  };
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState<"aprobar" | "rechazar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resuelta, setResuelta] = useState<string | null>(null);

  const datos = payload.datos ?? {};
  const titulos = payload.titulos ?? [];
  const origen = payload.origen_campos ?? {};

  const cambios = Object.entries(datos).filter(
    ([, v]) => v != null && String(v).trim() !== ""
  );

  async function resolver(accion: "aprobar" | "rechazar") {
    setCargando(accion);
    setError(null);
    try {
      const res = await fetch(`/api/admin/alumni/actualizaciones/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const json = await res.json();
      if (!res.ok || json.error) setError(json.error || `Error ${res.status}`);
      else {
        setResuelta(accion === "aprobar" ? "Aprobada y aplicada." : "Rechazada.");
        setTimeout(() => router.refresh(), 900);
      }
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setCargando(null);
    }
  }

  function IconoOrigen({ campo }: { campo: string }) {
    const o = origen[campo];
    if (o === "voz") return <Mic className="h-3.5 w-3.5 text-violet-500" aria-label="Dictado por voz" />;
    if (o === "documento") return <FileText className="h-3.5 w-3.5 text-teal-600" aria-label="Extraído de documento" />;
    return <Pencil className="h-3.5 w-3.5 text-slate-300" aria-label="Manual" />;
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">
            {actual ? `${actual.nombres ?? ""} ${actual.apellidos ?? ""}`.trim() : "Graduado sin ficha previa"}
          </p>
          <p className="text-xs text-slate-400">
            Cédula {cedula} · enviado {new Date(creada).toLocaleString("es-EC")}
          </p>
        </div>
        {resuelta ? (
          <span className="badge bg-teal-50 text-teal-700">{resuelta}</span>
        ) : (
          <div className="flex gap-2">
            <button
              className="btn-outline"
              disabled={cargando !== null}
              onClick={() => resolver("rechazar")}
            >
              {cargando === "rechazar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Rechazar
            </button>
            <button
              className="btn-accent"
              disabled={cargando !== null}
              onClick={() => resolver("aprobar")}
            >
              {cargando === "aprobar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Aprobar
            </button>
          </div>
        )}
      </div>

      {error && <div className="mb-3 rounded-xl bg-red-50 p-2 text-sm text-red-600">{error}</div>}

      {cambios.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-1 pr-3">Campo</th>
              <th className="py-1 pr-3">Actual</th>
              <th className="py-1">Propuesto</th>
            </tr>
          </thead>
          <tbody className="text-slate-600">
            {cambios.map(([campo, valor]) => {
              const previo = actual?.[campo] ?? null;
              const cambia = String(previo ?? "") !== String(valor ?? "");
              return (
                <tr key={campo} className="border-t border-slate-100">
                  <td className="flex items-center gap-1.5 py-1.5 pr-3 font-medium text-slate-700">
                    <IconoOrigen campo={campo} /> {ETIQUETAS[campo] ?? campo}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-400">{previo || "—"}</td>
                  <td className={`py-1.5 ${cambia ? "font-medium text-slate-900" : "text-slate-400"}`}>
                    {String(valor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {titulos.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="mb-1 font-medium text-slate-700">Títulos declarados</p>
          <ul className="list-inside list-disc text-slate-600">
            {titulos.map((t, i) => (
              <li key={i}>
                {t.titulo}
                {t.instituto ? ` — ${t.instituto}` : ""}
                {t.anio ? ` (${t.anio})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cambios.length === 0 && titulos.length === 0 && (
        <p className="text-sm text-slate-400">El envío no contiene cambios.</p>
      )}
    </div>
  );
}
