"use client";

import { useEffect, useRef, useState } from "react";
import { FolderLock, Upload, Loader2, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { DOCUMENTOS_CATEGORIAS, categoriaLabel, sugerirCategoria, type DocumentoCategoria } from "@/lib/documentos";
import type { Documento } from "@/components/DocumentoItem";
import { DocumentosPorCategoria } from "@/components/DocumentosPorCategoria";

export function DocumentosPersonales() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [drag, setDrag] = useState(false);
  // Archivo recién soltado/seleccionado, en espera de confirmar la carpeta
  // sugerida (o corregirla) antes de subirlo de verdad.
  const [pendiente, setPendiente] = useState<{ file: File; categoria: DocumentoCategoria; editadoManualmente: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    setCargando(true);
    try {
      const r = await fetch("/api/documentos");
      const j = await r.json();
      if (r.ok) setDocs(j.documentos ?? []);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setPendiente({ file, categoria: sugerirCategoria(file.name), editadoManualmente: false });
  }

  async function confirmarSubida() {
    if (!pendiente) return;
    setSubiendo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", pendiente.file);
      fd.append("categoria", pendiente.categoria);
      fd.append("categoria_manual", pendiente.editadoManualmente ? "1" : "0");
      const r = await fetch("/api/documentos", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo subir el archivo.");
      if (j.documento) setDocs((prev) => [j.documento as Documento, ...prev]);
      setPendiente(null);
      if (j.clasificado_por_ia && j.documento) {
        setAviso(`La IA la clasificó en «${categoriaLabel(j.documento.categoria)}»`);
        setTimeout(() => setAviso(null), 4000);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function descargar(doc: Documento) {
    const r = await fetch(`/api/documentos/${doc.id}`);
    const j = await r.json();
    if (r.ok && j.url) window.open(j.url, "_blank");
  }

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre_original}"? Esta acción no se puede deshacer.`)) return;
    const r = await fetch(`/api/documentos/${doc.id}`, { method: "DELETE" });
    if (r.ok) setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <FolderLock className="h-5 w-5 text-blue-700" /> Mis documentos
      </h2>
      <p className="mt-1 flex items-start gap-2 text-sm text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        Este repositorio es privado: solo tú, las autoridades y el administrador pueden verlo. Ningún
        otro funcionario, empleador o postulante tiene acceso a tus archivos.
      </p>

      {pendiente ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-blue-900">
            <Sparkles className="h-4 w-4" /> Carpeta sugerida para "{pendiente.file.name}"
          </p>
          <p className="mt-1 text-xs text-blue-700">
            Lo detectamos según el nombre del archivo. Puedes cambiar la carpeta antes de guardar.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={pendiente.categoria}
              onChange={(e) =>
                setPendiente({ ...pendiente, categoria: e.target.value as DocumentoCategoria, editadoManualmente: true })
              }
              className="input sm:w-72"
            >
              {DOCUMENTOS_CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={confirmarSubida} disabled={subiendo} className="btn-primary">
                {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {subiendo ? "Analizando y guardando…" : "Guardar en esta carpeta"}
              </button>
              <button
                type="button"
                onClick={() => setPendiente(null)}
                disabled={subiendo}
                className="btn-ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
            drag ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400"
          }`}
        >
          <Upload className="h-6 w-6 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">Arrastra un documento aquí o haz clic para subir</p>
          <p className="text-xs text-slate-400">
            PDF, Word, Excel, JPG, PNG o WEBP · máximo 15MB · la IA sugiere la carpeta y la fecha automáticamente
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.docx,.xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}
      {aviso && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-teal-50 p-2 text-sm text-teal-700">
          <Sparkles className="h-4 w-4" /> {aviso}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no has subido ningún documento.</p>
        ) : (
          <DocumentosPorCategoria documentos={docs} onDescargar={descargar} onEliminar={eliminar} />
        )}
      </div>
    </section>
  );
}
