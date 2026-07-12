import { FileSpreadsheet, FileText, FileType2, Download } from "lucide-react";

// Par de botones compactos (Excel + PDF) para descargar UNA sección del panel
// de Alumni. `params` es la query (sin '?') que identifica la sección y/o los
// filtros, p. ej. "seccion=facultad" o "seccion=graduados&facultad=Ingeniería".
// El endpoint /api/admin/alumni/reporte añade &formato=excel|pdf.
export function ExportSeccion({
  params,
  etiqueta,
  className = "",
}: {
  params: string;
  etiqueta?: string;
  className?: string;
}) {
  const base = `/api/admin/alumni/reporte?${params}`;
  const suf = etiqueta ? ` — ${etiqueta}` : "";
  return (
    <div className={`flex shrink-0 items-center gap-1 ${className}`}>
      <a
        href={`${base}&formato=excel`}
        title={`Descargar Excel${suf}`}
        aria-label={`Descargar Excel${suf}`}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel
      </a>
      <a
        href={`${base}&formato=pdf`}
        title={`Descargar PDF${suf}`}
        aria-label={`Descargar PDF${suf}`}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <FileText className="h-3.5 w-3.5 text-rose-600" /> PDF
      </a>
      <a
        href={`${base}&formato=docx`}
        title={`Descargar Word${suf}`}
        aria-label={`Descargar Word${suf}`}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <FileType2 className="h-3.5 w-3.5 text-blue-600" /> Word
      </a>
    </div>
  );
}

// Control por FILA (una subdivisión: una facultad, un año, una institución…).
// Un disclosure nativo <details> (sin JS) que despliega los tres formatos.
// `params` identifica la subdivisión, p. ej. "seccion=graduados&facultad=Educación".
export function ExportFila({ params, etiqueta }: { params: string; etiqueta?: string }) {
  const base = `/api/admin/alumni/reporte?${params}`;
  const suf = etiqueta ? ` — ${etiqueta}` : "";
  const item =
    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";
  return (
    <details className="group relative shrink-0">
      <summary
        title={`Exportar${suf}`}
        aria-label={`Exportar${suf}`}
        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 group-open:bg-slate-100 group-open:text-slate-700 [&::-webkit-details-marker]:hidden"
      >
        <Download className="h-3.5 w-3.5" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
        <a href={`${base}&formato=excel`} className={item}>
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel
        </a>
        <a href={`${base}&formato=pdf`} className={item}>
          <FileText className="h-3.5 w-3.5 text-rose-600" /> PDF
        </a>
        <a href={`${base}&formato=docx`} className={item}>
          <FileType2 className="h-3.5 w-3.5 text-blue-600" /> Word
        </a>
      </div>
    </details>
  );
}
