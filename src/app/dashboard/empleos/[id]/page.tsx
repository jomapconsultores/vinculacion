import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostularPanel } from "@/components/PostularPanel";
import { ArrowLeft, MapPin, Briefcase, DollarSign, BadgeCheck } from "lucide-react";

export default async function EmpleoDetalle({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: empleo }, { data: post }] = await Promise.all([
    supabase
      .from("empleos")
      .select("*, empresas(nombre, sector, validada, descripcion), empleo_competencias(requerida, competencias(id, nombre, descripcion))")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("postulaciones").select("ia_analisis, estado").eq("empleo_id", params.id).eq("profile_id", profile.id).maybeSingle(),
  ]);

  if (!empleo) notFound();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/empleos" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Volver a empleos
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{(empleo as any).titulo}</h1>
          {(empleo as any).empresas?.validada && <BadgeCheck className="h-5 w-5 text-teal-600" />}
        </div>
        <p className="text-slate-500">{(empleo as any).empresas?.nombre} · {(empleo as any).empresas?.sector}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          {(empleo as any).ciudad && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {(empleo as any).ciudad}</span>}
          {(empleo as any).modalidad && <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {(empleo as any).modalidad}</span>}
          {(empleo as any).salario_min && <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> ${(empleo as any).salario_min}–${(empleo as any).salario_max}</span>}
        </div>

        <div className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Descripción</h2>
          <p className="mt-1 whitespace-pre-line text-slate-700">{(empleo as any).descripcion}</p>
        </div>

        <div className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Competencias requeridas</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(empleo as any).empleo_competencias?.map((ec: any, i: number) => (
              <span key={i} className="badge bg-blue-50 text-blue-700">{ec.competencias?.nombre}</span>
            ))}
          </div>
        </div>
      </div>

      <PostularPanel
        empleoId={Number(params.id)}
        analisisInicial={(post?.ia_analisis as any) ?? null}
        yaEnviada={post?.estado === "enviada" || post?.estado === "en_revision" || post?.estado === "preseleccionado" || post?.estado === "contratado"}
      />
    </div>
  );
}
