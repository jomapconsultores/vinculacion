// Variante CON SESIÓN del asistente de alumni: el usuario ya inició sesión y
// su cédula está en el perfil, así que se salta la verificación (paso 1) y
// los cambios se aplican directo (fuente 'cuenta', estado 'verificado').

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { firmarTokenAlumni } from "@/lib/alumni-token";
import { AsistenteAlumni, type PersonaPrecargada } from "@/components/alumni/AsistenteAlumni";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CuentaAlumniPage() {
  const profile = await requireProfile();
  if (!profile.cedula) redirect("/dashboard");

  const inicio =
    profile.rol === "empleador" ? "/empleador"
    : profile.rol === "admin" || profile.rol === "autoridad" ? "/admin"
    : "/dashboard";

  // Precarga de la ficha de alumni (si existe) con la clave de servicio: el
  // dueño verá aquí sus propios datos completos, no enmascarados.
  const admin = createAdminClient();
  const { data: ficha } = await admin
    .from("alumni")
    .select(
      "nombres, apellidos, genero, email, celular, ciudad, ocupacion, cargo, empresa, alumni_titulos(titulo, nivel_formacion, instituto, anio_graduacion)"
    )
    .eq("cedula", profile.cedula)
    .maybeSingle();

  const persona: PersonaPrecargada = {
    nombres: ficha?.nombres ?? profile.nombres ?? "",
    apellidos: ficha?.apellidos ?? profile.apellidos ?? "",
    genero: ficha?.genero ?? null,
    ciudad: ficha?.ciudad ?? profile.ciudad ?? null,
    ocupacion: ficha?.ocupacion ?? null,
    cargo: ficha?.cargo ?? null,
    empresa: ficha?.empresa ?? null,
    // Con sesión propia se muestran los valores reales como "enmascarados"
    // del placeholder (el dueño puede verlos).
    emailMasked: ficha?.email ?? profile.email ?? null,
    celularMasked: ficha?.celular ?? profile.telefono ?? null,
    titulos: (ficha?.alumni_titulos ?? []).map(
      (t: {
        titulo: string;
        nivel_formacion: string | null;
        instituto: string | null;
        anio_graduacion: number | null;
      }) => ({
        titulo: t.titulo,
        nivel: t.nivel_formacion,
        instituto: t.instituto,
        anio: t.anio_graduacion,
      })
    ),
  };

  const token = firmarTokenAlumni(profile.cedula);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <Link href={inicio} className="btn-ghost text-slate-500">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Mis datos de graduado</h1>
        <p className="mb-6 mt-1 text-slate-500">
          Mantén tu información al día: se aplica de inmediato porque tu cuenta ya está verificada.
        </p>
        <AsistenteAlumni modo="cuenta" tokenInicial={token} personaInicial={persona} />
      </main>
    </div>
  );
}
