import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { BadgeCheck, ShieldX, Download } from "lucide-react";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function VerificarPage({ params }: { params: { codigo: string } }) {
  const codigo = params.codigo?.toUpperCase();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("competencias_graduado")
    .select("estado, fecha_aval, avalada_por, competencias(nombre, area), profiles(nombres, apellidos)")
    .eq("codigo_verificacion", codigo)
    .eq("estado", "avalada")
    .maybeSingle();

  const d: any = data;
  const valido = !!d;
  // Distinguir "no existe" (código inválido) de un fallo de verificación (error de BD),
  // para no marcar como falso un certificado que sí podría ser válido.
  const fallo = !d && !!error;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>

        <div className="card overflow-hidden">
          <div className={`flex items-center gap-3 p-5 ${valido ? "bg-teal-600" : fallo ? "bg-amber-500" : "bg-red-500"} text-white`}>
            {valido ? <BadgeCheck className="h-8 w-8" /> : <ShieldX className="h-8 w-8" />}
            <div>
              <p className="text-lg font-bold">
                {valido ? "Certificado válido" : fallo ? "No se pudo verificar" : "Certificado no válido"}
              </p>
              <p className="text-sm opacity-90">
                {valido
                  ? "Verificado por la Universidad"
                  : fallo
                  ? "Hubo un problema al consultar. Vuelve a intentarlo en unos minutos."
                  : "No encontramos un certificado con este código."}
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
