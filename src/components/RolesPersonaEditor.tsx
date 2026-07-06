"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, X } from "lucide-react";

type RolAsignado = {
  id: number;
  rol: string;
  empresa_id: number | null;
  empresas: { nombre: string } | null;
};

type Empresa = { id: number; nombre: string };

type RolOtorgable = "estudiante" | "profesional" | "empleador" | "autoridad" | "admin";

const ROLES_OTORGABLES: { value: RolOtorgable; label: string }[] = [
  { value: "estudiante", label: "Estudiante" },
  { value: "profesional", label: "Profesional" },
  { value: "empleador", label: "Empleador" },
  { value: "autoridad", label: "Autoridad" },
  { value: "admin", label: "Administrador" },
];

// 'autoridad' y 'admin' no se otorgan al instante: quedan pendientes de
// aprobación en /admin/solicitudes (0033_solicitudes_rol.sql).
const ROLES_REQUIEREN_APROBACION = new Set(["autoridad", "admin"]);

function rolLabel(rol: string): string {
  switch (rol) {
    case "estudiante":
      return "Estudiante";
    case "profesional":
      return "Profesional";
    case "empleador":
      return "Empleador";
    default:
      return rol.charAt(0).toUpperCase() + rol.slice(1);
  }
}

// Otorga/revoca roles de roles_asignados (0031_roles_multiples.sql) desde la
// ficha de admin. Los datos ya vienen resueltos del server component padre;
// tras cada acción se hace router.refresh() para releer esa misma consulta.
export function RolesPersonaEditor({
  profileId,
  rolActual,
  rolesAsignados,
  empresasDisponibles,
  solicitudesPendientes = [],
  puedeAdministrar,
}: {
  profileId: string;
  rolActual: string;
  rolesAsignados: RolAsignado[];
  empresasDisponibles: Empresa[];
  // Solicitudes de 'autoridad'/'admin' aún sin resolver (0033), para mostrar
  // el badge "Pendiente de aprobación" mientras no aparecen en rolesAsignados.
  solicitudesPendientes?: { rol: string }[];
  // Otorgar/revocar roles es exclusivo del administrador (autoridad puede
  // ver esta ficha y esta lista, pero no modificarla).
  puedeAdministrar: boolean;
}) {
  const router = useRouter();
  const [nuevoRol, setNuevoRol] = useState<RolOtorgable>("estudiante");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function otorgar() {
    setError(null);
    setMensaje(null);
    if (nuevoRol === "empleador" && !empresaId) {
      setError("Selecciona una empresa.");
      return;
    }
    setCargando(true);
    try {
      const r = await fetch(`/api/admin/personas/${profileId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rol: nuevoRol,
          empresa_id: nuevoRol === "empleador" ? Number(empresaId) : undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || "No se pudo otorgar el rol.");
        return;
      }
      if (j.pendiente) {
        setMensaje("Solicitud enviada. Debe aprobarse en Solicitudes antes de tomar efecto.");
      }
      setEmpresaId("");
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  async function revocar(rol: string) {
    setError(null);
    setCargando(true);
    try {
      const r = await fetch(`/api/admin/personas/${profileId}/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || "No se pudo revocar el rol.");
        return;
      }
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <ShieldCheck className="h-5 w-5 text-blue-700" /> Roles
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Roles otorgados a esta persona. El resaltado en azul es su rol activo actual.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {rolesAsignados.length === 0 && <p className="text-sm text-slate-400">Sin roles asignados.</p>}
        {rolesAsignados.map((r) => {
          const esActivo = r.rol === rolActual;
          return (
            <span
              key={r.id}
              className={`badge ${esActivo ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}
            >
              {rolLabel(r.rol)}
              {r.rol === "empleador" && r.empresas?.nombre ? ` · ${r.empresas.nombre}` : ""}
              {!esActivo && puedeAdministrar && (
                <button
                  type="button"
                  className="ml-1 rounded-full hover:text-red-600 disabled:opacity-50"
                  onClick={() => revocar(r.rol)}
                  disabled={cargando}
                  title="Revocar"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
        {solicitudesPendientes.map((s) => (
          <span key={`pendiente-${s.rol}`} className="badge bg-amber-50 text-amber-700">
            {rolLabel(s.rol)} · Pendiente de aprobación
            {puedeAdministrar && (
              <button
                type="button"
                className="ml-1 rounded-full hover:text-red-600 disabled:opacity-50"
                onClick={() => revocar(s.rol)}
                disabled={cargando}
                title="Cancelar solicitud"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {puedeAdministrar ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <div>
            <label className="label">Otorgar rol</label>
            <select
              className="input"
              value={nuevoRol}
              onChange={(ev) => setNuevoRol(ev.target.value as typeof nuevoRol)}
            >
              {ROLES_OTORGABLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {nuevoRol === "empleador" && (
            <div>
              <label className="label">Empresa</label>
              <select className="input" value={empresaId} onChange={(ev) => setEmpresaId(ev.target.value)}>
                <option value="">Selecciona…</option>
                {empresasDisponibles.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="btn-outline" onClick={otorgar} disabled={cargando}>
            Otorgar
          </button>
        </div>
      ) : (
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Solo el administrador puede otorgar o revocar roles.
        </p>
      )}

      {mensaje && <p className="mt-3 text-sm text-amber-700">{mensaje}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
