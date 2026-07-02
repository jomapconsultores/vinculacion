"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

export function RankingButton({ empleoId }: { empleoId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function rankear() {
    setLoading(true);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch("/api/empleador/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empleoId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo rankear");
      if (json.mensaje) setAviso(json.mensaje);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={rankear} className="btn-accent" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Rankear candidatos con IA
      </button>
      {aviso && <p className="text-xs text-amber-600">{aviso}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
