"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Loader2, Newspaper, CheckCircle2, AlertCircle, Upload, AlertTriangle } from "lucide-react";

type Publicacion = {
  id?: number;
  titulo: string;
  revista?: string;
  tipo?: string;
  fecha?: string;
  coautores?: string;
  enlace?: string;
  fuente?: string;
};
type Estado = "idle" | "guardando" | "guardado" | "error";

const TIPOS = [
  { value: "articulo", label: "Artículo científico" },
  { value: "ponencia", label: "Ponencia / congreso" },
  { value: "libro", label: "Libro" },
  { value: "capitulo_libro", label: "Capítulo de libro" },
  { value: "otro", label: "Otro" },
];

const ACCEPT_DOC =
  ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.xls,.csv,application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

function ordenarPorFecha(items: Publicacion[]): Publicacion[] {
  return [...items].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

async function api(body: any): Promise<any> {
  const r = await fetch("/api/perfil", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "No se pudo guardar");
  return r.json();
}

export function PublicacionesEditor({ publicaciones }: { publicaciones: Publicacion[] }) {
  const [items, setItems] = useState<Publicacion[]>(publicaciones);
  const [estado, setEstado] = useState<Estado>("idle");
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function guardar(fn: () => Promise<void>) {
    setEstado("guardando");
    try {
      await fn();
      setEstado("guardado");
      setTimeout(() => setEstado((e) => (e === "guardado" ? "idle" : e)), 2000);
    } catch {
      setEstado("error");
    }
  }

  async function add() {
    await guardar(async () => {
      const j = await api({ accion: "crear", tabla: "publicaciones_persona", datos: { titulo: "", tipo: "articulo", fuente: "manual" } });
      if (j.fila) setItems((prev) => [...prev, j.fila as Publicacion]);
    });
  }
  function save(p: Publicacion) {
    if (!p.id) return;
    guardar(() => api({ accion: "actualizar", tabla: "publicaciones_persona", id: p.id, datos: p }));
  }
  async function del(id?: number) {
    if (!id) return;
    await guardar(() => api({ accion: "eliminar", tabla: "publicaciones_persona", id }));
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  async function subirDocumento(archivo: File) {
    setSubiendoDoc(true);
    setErrorDoc(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const r = await fetch("/api/perfil/publicaciones/analizar", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrorDoc(j.error || "No se pudo analizar el documento.");
        return;
      }
      if (j.fila) setItems((prev) => ordenarPorFecha([j.fila as Publicacion, ...prev]));
    } catch {
      setErrorDoc("No se pudo analizar el documento.");
    } finally {
      setSubiendoDoc(false);
    }
  }

  function onDrop(ev: React.DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    setArrastrando(false);
    const archivo = ev.dataTransfer.files?.[0];
    if (archivo) void subirDocumento(archivo);
  }

  function onSeleccionar(ev: React.ChangeEvent<HTMLInputElement>) {
    const archivo = ev.target.files?.[0];
    if (archivo) void subirDocumento(archivo);
    ev.target.value = "";
  }

  return (
    <section className="card p-6">
      {estado !== "idle" && (
        <div className="fixed bottom-4 right-4 z-30">
          <span className={`badge shadow-sm ${estado === "error" ? "bg-red-50 text-red-600" : estado === "guardando" ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-700"}`}>
            {estado === "guardando" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {estado === "guardado" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {estado === "error" && <AlertCircle className="h-3.5 w-3.5" />}
            {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : "No se pudo guardar"}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Newspaper className="h-5 w-5 text-blue-700" /> Publicaciones
        </h2>
        <button className="btn-outline" onClick={add}><Plus className="h-4 w-4" /> Agregar</button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Artículos científicos, ponencias, libros y capítulos de libro publicados.
      </p>

      <div
        className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center text-sm transition ${
          arrastrando ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400"
        }`}
        onDragOver={(ev) => { ev.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT_DOC}
          onChange={onSeleccionar}
        />
        <button
          type="button"
          className="flex w-full flex-col items-center justify-center gap-2 text-slate-500"
          onClick={() => inputRef.current?.click()}
          disabled={subiendoDoc}
        >
          {subiendoDoc ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-slate-400" />}
          {subiendoDoc
            ? "Analizando documento…"
            : "Arrastra un artículo, ponencia o libro para agregarlo automáticamente"}
        </button>
        {errorDoc && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" /> {errorDoc}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {items.length === 0 && <p className="text-sm text-slate-400">Aún no tienes publicaciones registradas.</p>}
        {items.map((p, i) => (
          <div key={p.id ?? i} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Título</label>
              <input className="input" value={p.titulo} onChange={(ev) => { const a = [...items]; a[i] = { ...p, titulo: ev.target.value }; setItems(a); }} onBlur={() => save(items[i])} placeholder="Ej. Determinantes de la empleabilidad en graduados universitarios" />
            </div>
            <div>
              <label className="label">Revista / editorial</label>
              <input className="input" value={p.revista ?? ""} onChange={(ev) => { const a = [...items]; a[i] = { ...p, revista: ev.target.value }; setItems(a); }} onBlur={() => save(items[i])} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={p.tipo ?? "articulo"} onChange={(ev) => { const a = [...items]; a[i] = { ...p, tipo: ev.target.value }; setItems(a); save(a[i]); }}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={p.fecha?.slice(0, 10) ?? ""} onChange={(ev) => { const a = [...items]; a[i] = { ...p, fecha: ev.target.value || undefined }; setItems(a); }} onBlur={() => save(items[i])} />
            </div>
            <div>
              <label className="label">Coautores</label>
              <input className="input" value={p.coautores ?? ""} onChange={(ev) => { const a = [...items]; a[i] = { ...p, coautores: ev.target.value }; setItems(a); }} onBlur={() => save(items[i])} placeholder="Separados por coma" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Enlace / DOI</label>
              <input className="input" value={p.enlace ?? ""} onChange={(ev) => { const a = [...items]; a[i] = { ...p, enlace: ev.target.value }; setItems(a); }} onBlur={() => save(items[i])} placeholder="https://doi.org/..." />
            </div>
            <button className="btn-ghost text-red-500 sm:col-span-2 justify-self-start" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /> Eliminar</button>
          </div>
        ))}
      </div>
    </section>
  );
}
