"use client";

import { FileText, Download, Trash2 } from "lucide-react";
import { categoriaLabel } from "@/lib/documentos";

export type Documento = {
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

// Fila de un documento, compartida por el repositorio del propio usuario
// (con botón de eliminar) y el visor de solo lectura de admin/autoridad
// (sin él): antes cada vista duplicaba esta misma tarjeta casi al carácter.
export function DocumentoItem({
  doc,
  onDescargar,
  onEliminar,
}: {
  doc: Documento;
  onDescargar: (doc: Documento) => void;
  onEliminar?: (doc: Documento) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="h-5 w-5 shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{doc.nombre_original}</p>
          <p className="text-xs text-slate-400">
            {categoriaLabel(doc.categoria)} · {tamanoLegible(doc.tamano_bytes)} ·{" "}
            {new Date(doc.created_at).toLocaleDateString("es-EC")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onDescargar(doc)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Descargar"
        >
          <Download className="h-4 w-4" />
        </button>
        {onEliminar && (
          <button
            type="button"
            onClick={() => onEliminar(doc)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
