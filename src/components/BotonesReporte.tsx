import { Download, FileSpreadsheet } from "lucide-react";

// Botones de descarga de reporte en Excel y PDF. `base` es la ruta del endpoint
// de reporte de la pantalla (ej. "/api/admin/personas-reporte"); el formato se
// pasa por query (?formato=excel | ?formato=pdf).
export function BotonesReporte({ base, className = "" }: { base: string; className?: string }) {
  return (
    <div className={`flex shrink-0 flex-wrap gap-2 ${className}`}>
      <a href={`${base}?formato=excel`} className="btn-outline">
        <FileSpreadsheet className="h-4 w-4" /> Excel
      </a>
      <a href={`${base}?formato=pdf`} className="btn-primary">
        <Download className="h-4 w-4" /> PDF
      </a>
    </div>
  );
}
