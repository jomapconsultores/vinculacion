"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Loader2, BookOpen, CheckCircle2, AlertCircle, Upload, AlertTriangle } from "lucide-react";

type Curso = { id?: number; nombre: string; institucion?: string; fecha?: string; area_nombre?: string; fuente?: string };
type Estado = "idle" | "guardando" | "guardado" | "error";

const ACCEPT_DOC =
  ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.xls,.csv,application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

function ordenarPorFecha(items: Curso[]): Curso[] {
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

export function CursosEditor({ cursos }: { cursos: Curso[] }) {
  const [items, setItems] = useState<Curso[]>(cursos);
  const [estado, setEstado] = useState<Estado>("idle");
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function guardar(fn: () => Promise<void>) {
    setEstado("guardando");
    try { await fn(); setEstado("guardado"); setTimeout(() => setEstado((e) => (e === "guardado" ? "idle" : e)), 2000); }
    catch { setEstado("error"); }
  }

  async function add() {
    await guardar(async () => {
      const j = await api({ accion: "crear", tabla: "cursos_persona", datos: { nombre: "", fuente: "manual" } });
      if (j.fila) setItems((prev) => [...prev, j.fila as Curso]);
    });
  }
  function save(c: Curso) {
    if (!c.id) return;
    guardar(() => api({ accion: "actualizar", tabla: "cursos_persona", id: c.id, datos: c }));
  }
  async function del(id?: number) {
    if (!id) return;
    await guardar(() => api({ accion: "eliminar", tabla: "cursos_persona", id }));
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  async function subirDocumento(archivo: File) {
    setSubiendoDoc(true);
    setErrorDoc(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const r = await fetch("/api/perfil/cursos/analizar", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrorDoc(j.error || "No se pudo analizar el documento.");
        return;
      }
      if (j.fila) setItems((prev) => ordenarPorFecha([j.fila as Curso, ...prev]));
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
          <BookOpen className="h-5 w-5 text-blue-700" /> Cursos y capacitaciones
        </h2>
        <button className="btn-outline" onClick={add}><Plus className="h-4 w-4" /> Agregar</button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Cursos y capacitaciones (se llenan al consultar SENESCYT o los agregas manualmente).
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
            : "Arrastra un certificado de curso, seminario o taller para agregarlo automáticamente"}
        </button>
        {errorDoc && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" /> {errorDoc}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {items.length === 0 && <p className="text-sm text-slate-400">Aún no tienes cursos registrados.</p>}
        {items.map((c, i) => (
          <div key={c.id ?? i} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nombre del curso</label>
              <input className="input" value={c.nombre} onChange={(ev) => { const a = [...items]; a[i] = { ...c, nombre: ev.target.value }; setItems(a); }} onBlur={() => save(items[i])} placeholder="Ej. Curso de actualización tributaria" />
            </div>
            <div>
              <label className="label">Institución</label>
              <input className="input" value={c.institucion ?? ""} onChange={(ev) => { const a = [...items]; a[i] = { ...c, institucion: ev.target.value }; setItems(a); }} onBlur={() => save(items[i])} />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={c.fecha?.slice(0, 10) ?? ""} onChange={(ev) => { const a = [...items]; a[i] = { ...c, fecha: ev.target.value || undefined }; setItems(a); }} onBlur={() => save(items[i])} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Área</label>
              <input className="input" value={c.area_nombre ?? ""} onChange={(ev) => { const a = [...items]; a[i] = { ...c, area_nombre: ev.target.value }; setItems(a); }} onBlur={() => save(items[i])} />
            </div>
            <button className="btn-ghost text-red-500 sm:col-span-2 justify-self-start" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /> Eliminar</button>
          </div>
        ))}
      </div>
    </section>
  );
}
