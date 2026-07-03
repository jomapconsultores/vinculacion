import { etiquetaDimension, type Dimension, type PuntuacionDimension } from "@/lib/psicometria";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// Dimensiones donde un puntaje alto es la señal de alerta (el resto, un puntaje bajo lo es).
const RIESGO_SI_ALTO = new Set<Dimension>(["agotamiento_emocional", "cinismo", "ansiedad_estres"]);

function colorBanda(banda: "bajo" | "medio" | "alto", riesgoSiAlto: boolean) {
  const malo = riesgoSiAlto ? banda === "alto" : banda === "bajo";
  if (malo) return "bg-rose-500";
  if (banda === "medio") return "bg-amber-500";
  return "bg-emerald-500";
}

export function InformePsicometrico({
  puntuaciones,
  interpretacion,
  alerta,
}: {
  puntuaciones: Record<Dimension, PuntuacionDimension>;
  interpretacion: Record<Dimension, string> & { resumen: string };
  alerta: boolean;
}) {
  const dimensiones = Object.keys(puntuaciones) as Dimension[];
  return (
    <div className="space-y-6">
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
          alerta
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}
      >
        {alerta ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <p>{interpretacion.resumen}</p>
      </div>

      <div className="space-y-4">
        {dimensiones.map((dim) => {
          const p = puntuaciones[dim];
          const pct = Math.round((p.promedio / 5) * 100);
          return (
            <div key={dim} className="card p-4">
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-800">{etiquetaDimension(dim)}</span>
                <span className="shrink-0 text-slate-500">
                  {p.promedio.toFixed(1)} / 5 · <span className="capitalize">{p.banda}</span>
                </span>
              </div>
              <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${colorBanda(p.banda, RIESGO_SI_ALTO.has(dim))}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-sm text-slate-600">{interpretacion[dim]}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        Este informe es una herramienta de autoconocimiento y orientación laboral, no reemplaza una
        evaluación clínica profesional.
      </p>
    </div>
  );
}
