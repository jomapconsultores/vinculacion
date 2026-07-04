"use client";

import { useEffect, useState } from "react";
import { FileText, Download, FolderLock } from "lucide-react";
import { categoriaLabel } from "@/lib/documentos";

type Documento = {
  id: number;
  categoria: string;
  nombre_original: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  created_at: string;
};

function tamanoLegible(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Visor de solo lectura para admin/autoridad: ve y descarga los documentos
// de una persona, pero no puede subir en su nombre.
export function DocumentosAdminView({ profileId }: { profileId: string }) {
  const [docs, setDocs] = useState<Documento[] | null>(null);

  useEffect(() => {
    let activo = true;
    fetch(`/api/admin/personas/${profileId}/documentos`)
      .then((r) => r.json())
      .then((j) => {
        if (activo) setDocs(j.documentos ?? []);
      });
    return () => {
      activo = false;
    };
  }, [profileId]);

  async function descargar(doc: Documento) {
    const r = await fetch(`/api/documentos/${doc.id}`);
    const j = await r.json();
    if (r.ok && j.url) window.open(j.url, "_blank");
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <FolderLock className="h-5 w-5 text-blue-700" /> Documentos
      </h2>
      <p className="mt-1 text-sm text-slate-500">Repositorio privado de la persona.</p>

      <div className="mt-4 space-y-2">
        {docs === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-slate-400">Esta persona no ha subido documentos.</p>
        ) : (
          docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{d.nombre_original}</p>
                  <p className="text-xs text-slate-400">
                    {categoriaLabel(d.categoria)} · {tamanoLegible(d.tamano_bytes)} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("es-EC")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => descargar(d)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Descargar"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
