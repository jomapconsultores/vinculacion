// Página PÚBLICA de actualización de datos para graduados (alumni).
// Pensada para difundirse por correo/WhatsApp y llenarse desde el celular:
// el graduado se verifica con su cédula + año de graduación y actualiza sus
// datos escribiendo, dictando por voz o subiendo documentos.

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AsistenteAlumni } from "@/components/alumni/AsistenteAlumni";

export const metadata = {
  title: "Actualiza tus datos de graduado — Vinculación U. de Cuenca",
  description:
    "Actualiza tus datos de contacto, situación laboral y títulos como graduado de la Universidad de Cuenca.",
};

export default function ActualizaDatosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-3">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/login" className="text-sm text-blue-700 hover:underline">
            Ya tengo cuenta
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Actualiza tus datos de graduado</h1>
        <p className="mb-6 mt-1 text-slate-500">
          Nos toma menos de 2 minutos: puedes escribir, <strong>dictar por voz</strong> o subir una
          foto de tus documentos y nosotros llenamos los campos.
        </p>
        <AsistenteAlumni modo="publico" />
      </main>
    </div>
  );
}
