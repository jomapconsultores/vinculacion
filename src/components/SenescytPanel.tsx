"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Search, Loader2, Download, BadgeCheck, Plus, BookOpen } from "lucide-react";
import { AREAS_UNESCO } from "@/lib/cv-types";

type Titulo = {
  titulo: string;
  institucion: string | null;
  tipo: string | null;
  fecha_registro: string | null;
  numero_registro: string | null;
  area_codigo: string | null;
  area_nombre: string | null;
  fuente?: string;
};

const FORM_INICIAL = { titulo: "", institucion: "", tipo: "Tercer nivel", area_codigo: "", fecha_registro: "", numero_registro: "" };

export function SenescytPanel({ cedula }: { cedula: string | null }) {
  const router = useRouter();
  const [titulos, setTitulos] = useState<Titulo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function consultar() {
    if (!cedula) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/senescyt?cedula=${cedula}`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setTitulos(j.titulos ?? []);
      setMostrarForm((j.titulos ?? []).length === 0);
    } catch {
      setMsg("No se pudo consultar en este momento. Intenta de nuevo en unos minutos.");
    }
    setLoading(false);
  }

  async function importar() {
    setImportando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/senescyt/importar", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMsg(j.importados > 0 ? `Se agregaron ${j.importados} título(s) a tu educación.` : "Tus títulos ya estaban en tu perfil.");
      router.refresh();
    } catch (e: any) {
      setMsg(e.message || "No se pudo importar.");
    }
    setImportando(false);
  }

  async function agregarTitulo(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      const r = await fetch("/api/senescyt/agregar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo guardar el título");
      setForm(FORM_INICIAL);
      setMostrarForm(false);
      setMsg("Título agregado a tu registro y a tu educación.");
      router.refresh();
      await consultar();
    } catch (e: any) {
      setErrorForm(e.message);
    }
    setGuardando(false);
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="h-5 w-5 text-blue-700" /> Títulos en SENESCYT
        </h2>
        <button className="btn-outline" onClick={consultar} disabled={loading || !cedula}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Consultar con mi cédula
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {cedula
          ? `Buscamos los títulos registrados a la cédula ${cedula}.`
          : "Tu perfil no tiene cédula registrada; complétala para consultar."}
      </p>

      {titulos !== null && (
        <div className="mt-4">
          {titulos.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              No se encontraron títulos para esta cédula en el registro. Puedes agregarlos directamente aquí abajo.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {titulos.map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        <BadgeCheck className="h-4 w-4 shrink-0 text-blue-600" /> {t.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[t.institucion, t.tipo, t.fecha_registro].filter(Boolean).join(" · ")}
                      </p>
                      {t.area_nombre && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-teal-700">
                          <BookOpen className="h-3 w-3 shrink-0" /> {t.area_codigo} · {t.area_nombre}
                        </p>
                      )}
                      {t.numero_registro && (
                        <p className="text-xs text-slate-400">Registro: {t.numero_registro}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className="btn-primary" onClick={importar} disabled={importando}>
                  {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Agregar a mi educación
                </button>
                {!mostrarForm && (
                  <button
                    type="button"
                    onClick={() => setMostrarForm(true)}
                    className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> ¿Falta un título? Agrégalo aquí
                  </button>
                )}
              </div>
            </>
          )}

          {mostrarForm && (
            <form onSubmit={agregarTitulo} className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm font-medium text-slate-700">Agregar título</p>
              <div>
                <label className="label">Título (como consta en el registro)</label>
                <input
                  className="input"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej. INGENIERO EN SISTEMAS"
                  required
                />
              </div>
              <div>
                <label className="label">Institución de educación superior</label>
                <input
                  className="input"
                  value={form.institucion}
                  onChange={(e) => setForm({ ...form, institucion: e.target.value })}
                  placeholder="Ej. Universidad de Cuenca"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option>Tercer nivel</option>
                    <option>Cuarto nivel</option>
                  </select>
                </div>
                <div>
                  <label className="label">Área de conocimiento</label>
                  <select
                    className="input"
                    value={form.area_codigo}
                    onChange={(e) => setForm({ ...form, area_codigo: e.target.value })}
                    required
                  >
                    <option value="" disabled>Selecciona un área…</option>
                    {AREAS_UNESCO.map((a) => (
                      <option key={a.codigo} value={a.codigo}>{a.codigo} · {a.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Fecha de registro (opcional)</label>
                  <input
                    type="date"
                    className="input"
                    value={form.fecha_registro}
                    onChange={(e) => setForm({ ...form, fecha_registro: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Número de registro (opcional)</label>
                  <input
                    className="input"
                    value={form.numero_registro}
                    onChange={(e) => setForm({ ...form, numero_registro: e.target.value })}
                    placeholder="Ej. 1007-2023-2456789"
                  />
                </div>
              </div>
              {errorForm && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{errorForm}</p>}
              <div className="flex gap-2">
                <button className="btn-primary" disabled={guardando}>
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Guardar título
                </button>
                {titulos.length > 0 && (
                  <button type="button" className="btn-outline" onClick={() => setMostrarForm(false)}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}

          {msg && <p className="mt-3 rounded-lg bg-teal-50 p-2 text-sm text-teal-700">{msg}</p>}
        </div>
      )}
    </section>
  );
}
