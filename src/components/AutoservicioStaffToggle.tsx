"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

// Toggle de administración: activa/desactiva el autoservicio de roles de staff
// para una persona (profiles.autoservicio_staff). Solo se muestra desde la
// ficha de usuario, que ya es exclusiva de admin.
export function AutoservicioStaffToggle({
  profileId,
  inicial,
  tieneRolStaff,
}: {
  profileId: string;
  inicial: boolean;
  tieneRolStaff: boolean;
}) {
  const [activo, setActivo] = useState(inicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alternar() {
    if (cargando) return;
    const nuevo = !activo;
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/usuarios/${profileId}/autoservicio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevo }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(j.error || "No se pudo actualizar.");
        setCargando(false);
        return;
      }
      setActivo(nuevo);
    } catch {
      setError("Sin conexión con el servidor.");
    }
    setCargando(false);
  }

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-blue-700" />
            Autoservicio de roles de staff
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Permite que esta persona cambie por sí misma su rol activo a{" "}
            <b>Autoridad</b> o <b>Administrador</b>, siempre que ya tenga ese rol otorgado.
            Sin esta opción solo puede alternar entre roles que no son de staff.
          </p>
          {!tieneRolStaff && (
            <p className="mt-2 text-xs text-amber-600">
              Esta persona aún no tiene un rol de Autoridad/Administrador otorgado, así que la
              opción no tendrá efecto hasta que se le asigne uno.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={activo}
          onClick={alternar}
          disabled={cargando}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
            activo ? "bg-blue-700" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
              activo ? "translate-x-5" : "translate-x-0.5"
            }`}
          >
            {cargando && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          </span>
        </button>
      </div>
    </section>
  );
}
