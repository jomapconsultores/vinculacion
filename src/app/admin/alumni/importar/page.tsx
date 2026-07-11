import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { ImportarAlumni } from "@/components/alumni/ImportarAlumni";
import { FileUp, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportarAlumniPage() {
  await requireModulo("alumni");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/alumni"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Alumni
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <FileUp className="h-6 w-6 text-blue-700" /> Importar reporte de alumni
        </h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Sube el reporte institucional (.xlsx). El sistema depura los datos antes de guardarlos:
          normaliza nombres, correos y celulares, descarta duplicados y valida cada cédula. Primero
          verás una previsualización con el detalle de la depuración; nada se guarda hasta que
          confirmes. Re-importar el mismo reporte es seguro: no duplica registros ni pisa los datos
          que los propios graduados ya actualizaron.
        </p>
      </div>

      <ImportarAlumni />
    </div>
  );
}
