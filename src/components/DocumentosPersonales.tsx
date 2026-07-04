"use client";

import { useEffect, useRef, useState } from "react";
import { FolderLock, Upload, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { DOCUMENTOS_CATEGORIAS, type DocumentoCategoria } from "@/lib/documentos";
import { DocumentoItem, type Documento } from "@/components/DocumentoItem";

export function DocumentosPersonales() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [categoria, setCategoria] = useState<DocumentoCategoria>("otro");
  const [error, setError] = useState<string | null>(null);
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

  async function subir(file: File) {
    setSubiendo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("categoria", categoria);
      const r = await fetch("/api/documentos", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo subir el archivo.");
      // Usa el documento recién creado que ya devuelve el POST, en vez de
      // volver a pedir la lista completa.
      if (j.documento) setDocs((prev) => [j.documento as Documento, ...prev]);
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as DocumentoCategoria)}
          className="input sm:w-56"
        >
          {DOCUMENTOS_CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="btn-primary sm:w-auto"
        >
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Subir documento
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subir(f);
          }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG o WEBP · máximo 15MB.</p>

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no has subido ningún documento.</p>
        ) : (
          docs.map((d) => (
            <DocumentoItem key={d.id} doc={d} onDescargar={descargar} onEliminar={eliminar} />
          ))
        )}
      </div>
    </section>
  );
}
