import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { Clock } from "lucide-react";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PendientePage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  // Si ya está aprobado o no es autoridad, mándalo a su panel
  if (profile.rol === "admin" || (profile.rol === "autoridad" && profile.aprobado)) redirect("/admin");
  if (profile.rol === "empleador") redirect("/empleador");
  if (["estudiante", "profesional", "graduado"].includes(profile.rol)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo size="md" />
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
