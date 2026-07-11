import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { MapeoTitulos } from "@/components/alumni/MapeoTitulos";
import { Network, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MapeoPage() {
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
          <Network className="h-6 w-6 text-blue-700" /> Mapeo de títulos a carreras
        </h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          El reporte institucional no trae facultad ni carrera en la mayoría de filas: aquí se asigna
          a cada título su carrera y facultad. “Generar con IA” propone asignaciones (quedan como no
          revisadas); puedes corregirlas fila a fila y al final “Aplicar” traslada las revisadas a
          los títulos de los graduados, habilitando los reportes por facultad y carrera.
        </p>
      </div>

      <MapeoTitulos />
    </div>
  );
}
