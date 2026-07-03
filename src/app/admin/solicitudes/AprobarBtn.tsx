"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

export function AprobarBtn({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "ok" | "no">(null);

  async function accion(aprobar: boolean) {
    setLoading(aprobar ? "ok" : "no");
    const r = await fetch("/api/admin/aprobar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, aprobar }),
    });
    setLoading(null);
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button className="btn-accent" onClick={() => accion(true)} disabled={loading !== null}>
        {loading === "ok" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprobar
      </button>
      <button className="btn-outline text-red-600" onClick={() => accion(false)} disabled={loading !== null}>
        {loading === "no" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Rechazar
      </button>
    </div>
  );
}
