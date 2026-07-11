import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { iniciales } from "@/lib/utils";
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Smartphone,
  Phone,
  MapPin,
  Briefcase,
  BadgeCheck,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ETIQUETA_OCUPACION: Record<string, string> = {
  empleado: "Empleado/a (relación de dependencia)",
  independiente: "Independiente / negocio propio",
  docente: "Docente",
  estudiante: "Estudiante",
  desempleado: "Desempleado/a",
  otro: "Otro",
  sin_datos: "Sin datos",
};

const ETIQUETA_GENERO: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  otro: "Otro",
};

const ETIQUETA_ESTADO: Record<string, { label: string; clase: string }> = {
  importado: { label: "Importado", clase: "bg-slate-100 text-slate-600" },
  pendiente_revision: { label: "Pendiente de revisión", clase: "bg-amber-50 text-amber-700" },
  verificado: { label: "Verificado por el graduado", clase: "bg-teal-50 text-teal-700" },
};

const ETIQUETA_NIVEL: Record<string, string> = {
  PROFESIONAL: "Profesional",
  ESPECIALISTA: "Especialista",
  MAESTRIA: "Maestría",
};

export default async function GraduadoDetalle({ params }: { params: { id: string } }) {
  await requireModulo("alumni");
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("alumni")
    .select(
      "id, cedula, nombres, apellidos, genero, email, celular, telefono_fijo, ciudad, ocupacion, cargo, empresa, ocupacion_categoria, estado_verificacion, datos_actualizados_at, profile_id, alumni_titulos(id, titulo, nivel_formacion, instituto, anio_graduacion, carreras(nombre, facultad))"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!a) notFound();
  const p = a as any;
  const titulos = (p.alumni_titulos ?? []).sort(
    (x: any, y: any) => (y.anio_graduacion ?? 0) - (x.anio_graduacion ?? 0)
  );
  const estado = ETIQUETA_ESTADO[p.estado_verificacion] ?? ETIQUETA_ESTADO.importado;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/alumni/graduados"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado de graduados
      </Link>

      {/* Encabezado */}
      <section className="card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-base font-semibold text-teal-900 ring-1 ring-inset ring-teal-100">
            {p.nombres || p.apellidos ? (
              iniciales(p.nombres, p.apellidos)
            ) : (
              <GraduationCap className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-slate-900">
              {p.nombres || "—"} {p.apellidos || ""}
              <span className={`badge ${estado.clase}`}>{estado.label}</span>
              {p.profile_id && (
                <span className="badge inline-flex items-center gap-1 bg-blue-50 text-blue-700">
                  <UserCheck className="h-3.5 w-3.5" /> Con cuenta
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Cédula {p.cedula}
              {p.genero ? ` · ${ETIQUETA_GENERO[p.genero] ?? p.genero}` : ""}
            </p>
            {p.datos_actualizados_at && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-teal-600">
                <BadgeCheck className="h-3.5 w-3.5" />
                Datos actualizados por el graduado el{" "}
                {new Date(p.datos_actualizados_at).toLocaleDateString("es-EC")}
              </p>
            )}
          </div>
        </div>

        {/* Contacto y situación laboral */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Dato icono={<Mail className="h-4 w-4" />} etiqueta="Correo" valor={p.email} />
          <Dato icono={<Smartphone className="h-4 w-4" />} etiqueta="Celular" valor={p.celular} />
          <Dato icono={<Phone className="h-4 w-4" />} etiqueta="Teléfono fijo" valor={p.telefono_fijo} />
          <Dato icono={<MapPin className="h-4 w-4" />} etiqueta="Ciudad" valor={p.ciudad} />
          <Dato
            icono={<Briefcase className="h-4 w-4" />}
            etiqueta="Ocupación"
            valor={
              [p.ocupacion, p.cargo, p.empresa].filter(Boolean).join(" · ") ||
              (ETIQUETA_OCUPACION[p.ocupacion_categoria] ?? null)
            }
          />
          <Dato
            etiqueta="Situación ocupacional"
            valor={ETIQUETA_OCUPACION[p.ocupacion_categoria] ?? p.ocupacion_categoria}
          />
        </div>
      </section>

      {/* Títulos */}
      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <GraduationCap className="h-5 w-5 text-teal-600" /> Títulos ({titulos.length})
        </h2>
        {titulos.length === 0 ? (
          <p className="text-sm text-slate-400">Sin títulos registrados.</p>
        ) : (
          <div className="space-y-3">
            {titulos.map((t: any) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">{t.titulo}</p>
                  {t.nivel_formacion && (
                    <span className="badge bg-slate-100 text-slate-600">
                      {ETIQUETA_NIVEL[t.nivel_formacion] ?? t.nivel_formacion}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {[
                    t.instituto,
                    t.carreras?.nombre,
                    t.carreras?.facultad,
                    t.anio_graduacion,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {p.profile_id && (
        <Link
          href={`/admin/personas/${p.profile_id}`}
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
        >
          <UserCheck className="h-4 w-4" /> Ver expediente de su cuenta en el sistema
        </Link>
      )}
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  icono,
}: {
  etiqueta: string;
  valor: string | null;
  icono?: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icono} {etiqueta}
      </p>
      <p className="mt-0.5 text-sm text-slate-700">{valor || "—"}</p>
    </div>
  );
}
