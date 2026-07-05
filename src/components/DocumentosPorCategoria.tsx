"use client";

import { FolderOpen } from "lucide-react";
import { DOCUMENTOS_CATEGORIAS } from "@/lib/documentos";
import { DocumentoItem, type Documento } from "@/components/DocumentoItem";

// Agrupa los documentos por categoría en secciones desplegables (un
// "apartado" por carpeta: cursos, seminarios, experiencia laboral, etc.),
// en vez de una lista plana. La comparte el repositorio propio y el visor
// de admin/autoridad.
export function DocumentosPorCategoria({
  documentos,
  onDescargar,
  onEliminar,
}: {
  documentos: Documento[];
  onDescargar: (doc: Documento) => void;
  onEliminar?: (doc: Documento) => void;
}) {
  // Dentro de cada carpeta, los documentos más recientes (según la fecha que
  // extrajo la IA) van primero; los que no tienen fecha extraída se ordenan
  // al final, usando created_at como criterio de respaldo.
  function compararDocs(a: Documento, b: Documento) {
    if (a.fecha_documento && b.fecha_documento) {
      return a.fecha_documento < b.fecha_documento ? 1 : a.fecha_documento > b.fecha_documento ? -1 : 0;
    }
    if (a.fecha_documento && !b.fecha_documento) return -1;
    if (!a.fecha_documento && b.fecha_documento) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }

  const grupos = DOCUMENTOS_CATEGORIAS.map((c) => ({
    ...c,
    docs: documentos.filter((d) => d.categoria === c.value).sort(compararDocs),
  })).filter((g) => g.docs.length > 0);

  if (grupos.length === 0) return null;

  return (
    <div className="space-y-2">
      {grupos.map((g) => (
        <details key={g.value} open className="group rounded-lg border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-700" /> {g.label}
            </span>
            <span className="badge bg-slate-100 text-slate-500">{g.docs.length}</span>
          </summary>
          <div className="space-y-2 border-t border-slate-100 p-3">
            {g.docs.map((d) => (
              <DocumentoItem key={d.id} doc={d} onDescargar={onDescargar} onEliminar={onEliminar} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
