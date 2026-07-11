import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  GraduationCap,
  Users,
  Mail,
  Smartphone,
  ShieldCheck,
  FileUp,
  Network,
  Inbox,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  ListFilter,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Totales = {
  personas: number;
  con_email: number;
  con_celular: number;
  verificados: number;
  pendientes_revision: number;
  con_cuenta: number;
  titulos: number;
  titulos_con_carrera: number;
};

const ETIQUETA_OCUPACION: Record<string, string> = {
  empleado: "Empleado/a",
  independiente: "Independiente",
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
  "sin datos": "Sin datos",
};

const ETIQUETA_NIVEL: Record<string, string> = {
  PROFESIONAL: "Profesional",
  ESPECIALISTA: "Especialista",
  MAESTRIA: "Maestría",
  "SIN DATOS": "Sin nivel",
};

// Construye el enlace al listado filtrado de graduados.
function href(filtro: Record<string, string | number>): string {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(filtro)) params[k] = String(v);
  return `/admin/alumni/graduados?${new URLSearchParams(params).toString()}`;
}

export default async function AlumniPage() {
  await requireModulo("alumni");
  const supabase = await createClient();

  const [totRes, facRes, anioRes, genRes, nivRes, ocuRes, extRes, pendRes] = await Promise.all([
    supabase.from("v_alumni_totales").select("*").maybeSingle(),
    supabase.from("v_alumni_por_facultad").select("*"),
    supabase.from("v_alumni_por_anio").select("*"),
    supabase.from("v_alumni_por_genero").select("*"),
    supabase.from("v_alumni_por_nivel").select("*"),
    supabase.from("v_alumni_ocupacion").select("*"),
    supabase.from("v_alumni_institutos_externos").select("*").limit(10),
    supabase
      .from("alumni_actualizaciones")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),
  ]);

  const tot: Totales = (totRes.data as Totales) ?? {
    personas: 0,
    con_email: 0,
    con_celular: 0,
    verificados: 0,
    pendientes_revision: 0,
    con_cuenta: 0,
    titulos: 0,
    titulos_con_carrera: 0,
  };
  const porFacultad = facRes.data ?? [];
  const porAnio = anioRes.data ?? [];
  const porGenero = genRes.data ?? [];
  const porNivel = nivRes.data ?? [];
  const ocupacion = ocuRes.data ?? [];
  const externos = extRes.data ?? [];
  const pendientes = pendRes.count ?? 0;

  const sinDatos = tot.personas === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <GraduationCap className="h-6 w-6 text-blue-700" /> Alumni
          </h1>
          <p className="mt-1 max-w-3xl text-slate-500">
            Registro depurado de graduados. Haz clic en cualquier grupo (una facultad, un año, un
            género, un nivel…) para ver el listado de esos graduados y abrir su ficha.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href="/api/admin/alumni/reporte?formato=excel" className="btn-outline">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </a>
          <a href="/api/admin/alumni/reporte?formato=docx" className="btn-outline">
            <FileText className="h-4 w-4" /> Word
          </a>
          <a href="/api/admin/alumni/reporte?formato=pdf" className="btn-primary">
            <Download className="h-4 w-4" /> PDF
          </a>
        </div>
      </header>

      {/* Accesos a gestión */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/alumni/importar" className="card card-hover flex items-center gap-3 p-4">
          <FileUp className="h-6 w-6 shrink-0 text-blue-700" />
          <div>
            <p className="font-semibold text-slate-800">Importar reporte</p>
            <p className="text-sm text-slate-500">Sube el .xlsx institucional (con depuración)</p>
          </div>
        </Link>
        <Link href="/admin/alumni/mapeo" className="card card-hover flex items-center gap-3 p-4">
          <Network className="h-6 w-6 shrink-0 text-blue-700" />
          <div>
            <p className="font-semibold text-slate-800">Mapeo de títulos</p>
            <p className="text-sm text-slate-500">
              {tot.titulos > 0
                ? `${tot.titulos_con_carrera} de ${tot.titulos} títulos con carrera`
                : "Asignar carrera y facultad a cada título"}
            </p>
          </div>
        </Link>
        <Link href="/admin/alumni/actualizaciones" className="card card-hover flex items-center gap-3 p-4">
          <Inbox className="h-6 w-6 shrink-0 text-blue-700" />
          <div>
            <p className="font-semibold text-slate-800">Actualizaciones</p>
            <p className="text-sm text-slate-500">
              {pendientes > 0 ? (
                <span className="font-medium text-amber-600">{pendientes} pendientes de revisión</span>
              ) : (
                "Sin envíos pendientes"
              )}
            </p>
          </div>
        </Link>
      </div>

      {sinDatos ? (
        <div className="card p-10 text-center text-slate-400">
          Aún no hay graduados registrados. Empieza importando el reporte institucional.
        </div>
      ) : (
        <>
          {/* Acceso al listado completo */}
          <Link
            href="/admin/alumni/graduados"
            className="btn-outline inline-flex w-full justify-center sm:w-auto"
          >
            <ListFilter className="h-4 w-4" /> Ver listado completo de graduados
          </Link>

          {/* KPIs (clicables cuando corresponde a un filtro) */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiLink
              href="/admin/alumni/graduados"
              icono={<Users className="h-4 w-4" />}
              etiqueta="Graduados"
              valor={tot.personas}
            />
            <Kpi icono={<GraduationCap className="h-4 w-4" />} etiqueta="Títulos" valor={tot.titulos} />
            <Kpi
              icono={<Mail className="h-4 w-4" />}
              etiqueta="Con correo"
              valor={tot.con_email}
              pct={pct(tot.con_email, tot.personas)}
            />
            <Kpi
              icono={<Smartphone className="h-4 w-4" />}
              etiqueta="Con celular"
              valor={tot.con_celular}
              pct={pct(tot.con_celular, tot.personas)}
            />
            <Kpi
              icono={<ShieldCheck className="h-4 w-4" />}
              etiqueta="Verificados por el graduado"
              valor={tot.verificados}
              pct={pct(tot.verificados, tot.personas)}
            />
            <Kpi etiqueta="Con cuenta en el sistema" valor={tot.con_cuenta} pct={pct(tot.con_cuenta, tot.personas)} />
            <Kpi etiqueta="Títulos con carrera" valor={tot.titulos_con_carrera} pct={pct(tot.titulos_con_carrera, tot.titulos)} />
            <KpiLink
              href="/admin/alumni/actualizaciones"
              etiqueta="Pendientes de revisión"
              valor={tot.pendientes_revision}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Barras
              titulo="Graduados por facultad"
              filas={porFacultad.map((f: any) => ({
                etiqueta: f.facultad,
                n: Number(f.graduados),
                href: href({ facultad: f.facultad }),
              }))}
              color="bg-blue-600"
            />
            <Barras
              titulo="Situación ocupacional"
              filas={ocupacion.map((f: any) => ({
                etiqueta: ETIQUETA_OCUPACION[f.ocupacion_categoria] ?? f.ocupacion_categoria,
                n: Number(f.personas),
                href: href({ ocupacion: f.ocupacion_categoria }),
              }))}
              color="bg-teal-600"
            />
            <Barras
              titulo="Por género"
              filas={porGenero.map((f: any) => ({
                etiqueta: ETIQUETA_GENERO[f.genero] ?? f.genero,
                n: Number(f.personas),
                href: href({ genero: f.genero }),
              }))}
              color="bg-violet-600"
            />
            <Barras
              titulo="Títulos por nivel de formación"
              filas={porNivel.map((f: any) => ({
                etiqueta: ETIQUETA_NIVEL[f.nivel] ?? f.nivel,
                n: Number(f.titulos),
                href: href({ nivel: f.nivel }),
              }))}
              color="bg-amber-500"
            />
          </div>

          {/* Por año */}
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-800">Títulos por año de graduación</h2>
            <div className="flex items-end gap-1 overflow-x-auto pb-2">
              {(() => {
                const max = Math.max(1, ...porAnio.map((f: any) => Number(f.titulos)));
                return porAnio.map((f: any) => (
                  <Link
                    key={f.anio_graduacion}
                    href={href({ anio: f.anio_graduacion })}
                    className="flex min-w-[2rem] flex-col items-center gap-1 rounded p-1 hover:bg-slate-50"
                  >
                    <span className="text-[10px] text-slate-500">{f.titulos}</span>
                    <div
                      className="w-6 rounded-t bg-blue-600 transition group-hover:bg-blue-700"
                      style={{ height: `${Math.max(4, (Number(f.titulos) / max) * 120)}px` }}
                    />
                    <span className="text-[10px] text-slate-400">{f.anio_graduacion}</span>
                  </Link>
                ));
              })()}
            </div>
          </div>

          {/* Posgrados externos */}
          {externos.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-slate-800">
                Posgrados en otras instituciones (top 10)
              </h2>
              <div className="divide-y divide-slate-100">
                {externos.map((f: any) => (
                  <Link
                    key={f.instituto}
                    href={href({ instituto: f.instituto })}
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="min-w-0 truncate text-slate-700">{f.instituto}</span>
                    <span className="flex shrink-0 items-center gap-3 text-slate-500">
                      <span>{f.graduados} grad.</span>
                      <span>{f.titulos} tít.</span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function pct(n: number, total: number): number | undefined {
  return total > 0 ? Math.round((n / total) * 100) : undefined;
}

function Kpi({
  etiqueta,
  valor,
  pct,
  icono,
}: {
  etiqueta: string;
  valor: number;
  pct?: number;
  icono?: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icono} {etiqueta}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {valor.toLocaleString("es-EC")}
        {pct !== undefined && <span className="ml-2 text-sm font-medium text-slate-400">{pct}%</span>}
      </p>
    </div>
  );
}

function KpiLink({
  href,
  etiqueta,
  valor,
  icono,
}: {
  href: string;
  etiqueta: string;
  valor: number;
  icono?: React.ReactNode;
}) {
  return (
    <Link href={href} className="card card-hover p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icono} {etiqueta}
      </p>
      <p className="mt-1 flex items-center gap-1 text-2xl font-bold text-slate-900">
        {valor.toLocaleString("es-EC")}
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </p>
    </Link>
  );
}

function Barras({
  titulo,
  filas,
  color,
}: {
  titulo: string;
  filas: { etiqueta: string; n: number; href?: string }[];
  color: string;
}) {
  const max = Math.max(1, ...filas.map((f) => f.n));
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold text-slate-800">{titulo}</h2>
      <div className="space-y-1">
        {filas.map((f) => {
          const contenido = (
            <>
              <div className="mb-0.5 flex items-center justify-between text-sm">
                <span className="text-slate-600 group-hover:text-slate-900">{f.etiqueta}</span>
                <span className="font-medium text-slate-800">{f.n.toLocaleString("es-EC")}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${Math.max(2, (f.n / max) * 100)}%` }}
                />
              </div>
            </>
          );
          return f.href ? (
            <Link
              key={f.etiqueta}
              href={f.href}
              className="group block rounded-lg p-1.5 transition hover:bg-slate-50"
            >
              {contenido}
            </Link>
          ) : (
            <div key={f.etiqueta} className="p-1.5">
              {contenido}
            </div>
          );
        })}
        {filas.length === 0 && <p className="text-sm text-slate-400">Sin datos.</p>}
      </div>
    </div>
  );
}
