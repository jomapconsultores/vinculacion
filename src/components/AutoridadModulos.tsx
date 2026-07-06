"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

export const MODULOS_DISPONIBLES: { value: string; label: string }[] = [
  { value: "personas", label: "Personas" },
  { value: "empleabilidad", label: "Empleabilidad" },
  { value: "servicios", label: "Servicios" },
  { value: "practicas", label: "Prácticas" },
  { value: "cursos", label: "Revisión de cursos" },
  { value: "indicadores", label: "Indicadores" },
  { value: "encuestas", label: "Encuestas" },
  { value: "psicometria", label: "Psicometría" },
];

// Marca/desmarca a qué módulos de /admin tiene acceso una autoridad
// (permisos_modulo, 0032_permisos_modulo.sql). Exclusivo del administrador:
// esta pantalla solo la ve admin (lo garantiza la página server padre), así
// que aquí no hay una prop `puedeAdministrar` como en RolesPersonaEditor.
export function AutoridadModulos({
  autoridadId,
  nombre,
  modulosActuales,
  aprobado,
}: {
  autoridadId: string;
  nombre: string;
  modulosActuales: string[];
  aprobado: boolean;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Estado optimista: router.refresh() relee permisos_modulo en el server
  // component padre de forma asíncrona y no expone cuándo termina, así que
  // no podemos esperarlo. Sin este override, el checkbox quedaba habilitado
  // mostrando el valor ANTERIOR justo después del fetch (antes de que el
  // refresh trajera el nuevo valor), invitando a un segundo clic apresurado.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  async function alternar(modulo: string, otorgado: boolean) {
    setError(null);
    setCargando(modulo);
    try {
      const r = await fetch(`/api/admin/autoridades/${autoridadId}/modulos`, {
        method: otorgado ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulo }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || "No se pudo actualizar el módulo.");
        return;
      }
      setOverrides((prev) => ({ ...prev, [modulo]: !otorgado }));
      router.refresh();
    } finally {
      setCargando(null);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <LayoutGrid className="h-5 w-5 text-blue-700" /> {nombre}
      </h2>

      {!aprobado ? (
        <p className="mt-2 text-sm text-slate-400">
          Esta cuenta aún no está aprobada. Los módulos se podrán gestionar una vez que la autoridad sea aprobada.
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Módulos de /admin a los que tiene acceso.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODULOS_DISPONIBLES.map((m) => {
          const otorgado = overrides[m.value] ?? modulosActuales.includes(m.value);
          return (
            <label
              key={m.value}
              className={`flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm ${
                !aprobado ? "text-slate-300" : "text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={otorgado}
                disabled={!aprobado || cargando === m.value}
                onChange={() => alternar(m.value, otorgado)}
              />
              {m.label}
            </label>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
