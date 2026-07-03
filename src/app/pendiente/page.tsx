import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { HeartHandshake, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PendientePage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  // Si ya está aprobado o no es autoridad, mándalo a su panel
  if (profile.rol === "admin" || (profile.rol === "autoridad" && profile.aprobado)) redirect("/admin");
  if (profile.rol === "empleador") redirect("/empleador");
  if (["estudiante", "profesional", "graduado"].includes(profile.rol)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2 font-semibold text-blue-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          Proyecto Conecta
        </div>
        <Clock className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Cuenta pendiente de aprobación</h1>
        <p className="mt-2 text-slate-500">
          Tu cuenta de <b>Autoridad</b> fue creada y tu correo verificado. Un administrador debe
          autorizar tu acceso. Te avisaremos cuando esté habilitada.
        </p>
        <form action="/auth/signout" method="post">
          <button className="btn-outline mt-6">Salir</button>
        </form>
      </div>
    </div>
  );
}
