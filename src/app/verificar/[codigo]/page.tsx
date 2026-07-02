import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { BadgeCheck, ShieldX, HeartHandshake, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VerificarPage({ params }: { params: { codigo: string } }) {
  const codigo = params.codigo?.toUpperCase();
  const admin = createAdminClient();
  const { data } = await admin
    .from("competencias_graduado")
    .select("estado, fecha_aval, avalada_por, competencias(nombre, area), profiles(nombres, apellidos)")
    .eq("codigo_verificacion", codigo)
    .eq("estado", "avalada")
    .maybeSingle();

  const d: any = data;
  const valido = !!d;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2 font-semibold text-blue-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          Proyecto Conecta
        </div>

        <div className="card overflow-hidden">
          <div className={`flex items-center gap-3 p-5 ${valido ? "bg-teal-600" : "bg-red-500"} text-white`}>
            {valido ? <BadgeCheck className="h-8 w-8" /> : <ShieldX className="h-8 w-8" />}
            <div>
              <p className="text-lg font-bold">{valido ? "Certificado válido" : "Certificado no válido"}</p>
              <p className="text-sm opacity-90">
                {valido ? "Verificado por la Universidad" : "No encontramos un certificado con este código."}
              </p>
            </div>
          </div>

          {valido && (
            <div className="space-y-4 p-6">
              <Campo etiqueta="Graduado">
                {d.profiles?.nombres} {d.profiles?.apellidos}
              </Campo>
              <Campo etiqueta="Competencia avalada">
                {d.competencias?.nombre}
                {d.competencias?.area ? <span className="text-slate-400"> · {d.competencias.area}</span> : null}
              </Campo>
              <Campo etiqueta="Avalada por">{d.avalada_por ?? "Universidad"}</Campo>
              {d.fecha_aval && <Campo etiqueta="Fecha de aval">{String(d.fecha_aval).slice(0, 10)}</Campo>}
              <Campo etiqueta="Código">{codigo}</Campo>

              <a href={`/api/certificado/${codigo}`} target="_blank" className="btn-outline w-full">
                <Download className="h-4 w-4" /> Ver certificado (PDF)
              </a>
            </div>
          )}

          {!valido && (
            <div className="p-6 text-center text-sm text-slate-500">
              Verifica que el código esté completo y correcto.
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          <Link href="/" className="text-blue-700">Ir a Proyecto Conecta</Link>
        </p>
      </div>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className="mt-0.5 font-medium text-slate-800">{children}</p>
    </div>
  );
}
