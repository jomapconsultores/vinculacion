"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

export function RevisarCursoBtn({ profileId, cursoId }: { profileId: string; cursoId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "ok" | "no">(null);
  const [error, setError] = useState<string | null>(null);

  async function accion(aprobar: boolean) {
    setLoading(aprobar ? "ok" : "no");
    setError(null);
    const r = await fetch("/api/admin/cursos/revisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, cursoId, aprobar }),
    });
    setLoading(null);
    if (r.ok) {
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "No se pudo completar la acción.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button className="btn-accent" onClick={() => accion(true)} disabled={loading !== null}>
          {loading === "ok" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprobar y avalar
        </button>
        <button className="btn-outline text-red-600" onClick={() => accion(false)} disabled={loading !== null}>
          {loading === "no" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Rechazar
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
