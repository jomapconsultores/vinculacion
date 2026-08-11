/* ------------------------------------------------------------
 * Desarrollado por Marco Antonio Posligua San Martín
 * ------------------------------------------------------------ */

"use client";

import { Save, RotateCcw } from "lucide-react";
import type { EstadoBorrador } from "@/hooks/useBorrador";

/**
 * Avisa de que lo respondido se está guardando en el dispositivo.
 *
 * No es decoración: una red de seguridad que nadie ve no tranquiliza a nadie.
 * Quien lleva quince minutos respondiendo necesita saber que puede cerrar y
 * volver — sobre todo ahora que la sesión se cierra sola a los 20 minutos.
 */
export default function AvisoBorrador({
  estado,
  onDescartar,
}: {
  estado: EstadoBorrador;
  onDescartar?: () => void;
}) {
  const { recuperado, guardadoEn, descartar } = estado;

  // Antes del primer guardado no hay nada que contar.
  if (!recuperado && !guardadoEn) return null;

  const hora = guardadoEn
    ? guardadoEn.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border p-3 text-sm ${
        recuperado
          ? "border-teal-200 bg-teal-50 text-teal-800"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0">
        {recuperado ? (
          <>
            <strong>Recuperamos tus respuestas.</strong> Retomamos donde lo dejaste; puedes
            seguir y enviarlas cuando quieras.
          </>
        ) : (
          <>
            Tus respuestas se guardan en este dispositivo
            {hora ? <> · última vez a las {hora}</> : null}. Si cierras la página, no se pierden.
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => {
          descartar();
          onDescartar?.();
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold underline underline-offset-2 hover:bg-white/60"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Empezar de nuevo
      </button>
    </div>
  );
}
