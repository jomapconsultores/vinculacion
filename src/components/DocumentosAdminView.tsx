"use client";

import { FolderLock } from "lucide-react";
import type { Documento } from "@/components/DocumentoItem";
import { DocumentosPorCategoria } from "@/components/DocumentosPorCategoria";

// Visor de solo lectura para admin/autoridad: ve y descarga los documentos
// de una persona, pero no puede subir en su nombre. Los documentos ya vienen
// resueltos desde el server component padre (misma sesión ya autorizada),
// en vez de repetir la autenticación/autorización en un round-trip aparte.
export function DocumentosAdminView({ documentos: docs }: { documentos: Documento[] }) {
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
        {docs.length === 0 ? (
          <p className="text-sm text-slate-400">Esta persona no ha subido documentos.</p>
        ) : (
          <DocumentosPorCategoria documentos={docs} onDescargar={descargar} />
        )}
      </div>
    </section>
  );
}
