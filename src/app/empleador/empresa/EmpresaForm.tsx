"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check } from "lucide-react";

type Empresa = {
  nombre: string;
  ruc: string | null;
  sector: string | null;
  descripcion: string | null;
};

export function EmpresaForm({ inicial }: { inicial: Empresa }) {
  const router = useRouter();
  const [form, setForm] = useState<Empresa>({
    nombre: inicial.nombre ?? "",
    ruc: inicial.ruc ?? "",
    sector: inicial.sector ?? "",
    descripcion: inicial.descripcion ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function set<K extends keyof Empresa>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setOk(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/empleador/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setOk(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label">Nombre de la empresa</label>
        <input className="input" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">RUC</label>
          <input
            className="input"
            value={form.ruc ?? ""}
            onChange={(e) => set("ruc", e.target.value)}
            placeholder="Ej. 0190000000001"
          />
        </div>
        <div>
          <label className="label">Sector</label>
          <input
            className="input"
            value={form.sector ?? ""}
            onChange={(e) => set("sector", e.target.value)}
            placeholder="Ej. Tecnología, Salud…"
          />
        </div>
      </div>
      <div>
        <label className="label">Descripción</label>
        <textarea
          className="input min-h-[110px]"
          value={form.descripcion ?? ""}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="A qué se dedica la empresa…"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {ok && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check className="h-4 w-4" /> Guardado
          </span>
        )}
        <button className="btn-primary" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </button>
      </div>
    </form>
  );
}
