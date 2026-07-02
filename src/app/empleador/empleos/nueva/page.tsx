"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, Check } from "lucide-react";

type Competencia = { id: number; nombre: string; area: string | null };

export default function NuevaOfertaPage() {
  const router = useRouter();
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    ciudad: "",
    modalidad: "Presencial",
    salario_min: "",
    salario_max: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("competencias")
      .select("id, nombre, area")
      .order("area")
      .then(({ data }) => setCompetencias((data as Competencia[]) ?? []));
  }, []);

  function toggle(id: number) {
    setSeleccionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/empleador/empleos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salario_min: form.salario_min ? Number(form.salario_min) : null,
          salario_max: form.salario_max ? Number(form.salario_max) : null,
          competencias: seleccionadas,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear la oferta");
      router.push(`/empleador/empleos/${json.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  // Agrupar competencias por área
  const porArea = competencias.reduce<Record<string, Competencia[]>>((acc, c) => {
    const a = c.area ?? "Otras";
    (acc[a] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Link href="/empleador/empleos" className="btn-ghost -ml-2 w-fit text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Volver a mis ofertas
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Publicar oferta</h1>
        <p className="mt-1 text-slate-500">Describe la vacante y las competencias que requieres.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Título del puesto</label>
            <input
              className="input"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Ej. Desarrollador Full-Stack Junior"
              required
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[120px]"
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Responsabilidades, requisitos y beneficios…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Ciudad</label>
              <input
                className="input"
                value={form.ciudad}
                onChange={(e) => set("ciudad", e.target.value)}
                placeholder="Ej. Cuenca"
              />
            </div>
            <div>
              <label className="label">Modalidad</label>
              <select
                className="input"
                value={form.modalidad}
                onChange={(e) => set("modalidad", e.target.value)}
              >
                <option>Presencial</option>
                <option>Remoto</option>
                <option>Híbrido</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Salario mínimo (USD)</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.salario_min}
                onChange={(e) => set("salario_min", e.target.value)}
                placeholder="Ej. 600"
              />
            </div>
            <div>
              <label className="label">Salario máximo (USD)</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.salario_max}
                onChange={(e) => set("salario_max", e.target.value)}
                placeholder="Ej. 900"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <div>
            <h2 className="font-semibold text-slate-900">Competencias requeridas</h2>
            <p className="text-sm text-slate-500">
              Selecciona las competencias clave; la IA las usará para rankear a los candidatos.
            </p>
          </div>

          {competencias.length === 0 ? (
            <p className="text-sm text-slate-400">Cargando competencias…</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(porArea).map(([area, comps]) => (
                <div key={area}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{area}</p>
                  <div className="flex flex-wrap gap-2">
                    {comps.map((c) => {
                      const active = seleccionadas.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggle(c.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                            active
                              ? "border-teal-600 bg-teal-600 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {active && <Check className="h-3.5 w-3.5" />}
                          {c.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Link href="/empleador/empleos" className="btn-outline">
            Cancelar
          </Link>
          <button className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar oferta
          </button>
        </div>
      </form>
    </div>
  );
}
