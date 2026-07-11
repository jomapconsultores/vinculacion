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
            Registro depurado de graduados: importación del reporte institucional, actualización de
            datos por los propios graduados y estadísticas por facultad, carrera, año, género,
            nivel y situación ocupacional.
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
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icono={<Users className="h-4 w-4" />} etiqueta="Graduados" valor={tot.personas} />
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
            <Kpi etiqueta="Pendientes de revisión" valor={tot.pendientes_revision} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Barras
              titulo="Graduados por facultad"
              filas={porFacultad.map((f: any) => ({ etiqueta: f.facultad, n: Number(f.graduados) }))}
              color="bg-blue-600"
            />
            <Barras
              titulo="Situación ocupacional"
              filas={ocupacion.map((f: any) => ({
                etiqueta: ETIQUETA_OCUPACION[f.ocupacion_categoria] ?? f.ocupacion_categoria,
                n: Number(f.personas),
              }))}
              color="bg-teal-600"
            />
            <Barras
              titulo="Por género"
              filas={porGenero.map((f: any) => ({
                etiqueta: ETIQUETA_GENERO[f.genero] ?? f.genero,
                n: Number(f.personas),
              }))}
              color="bg-violet-600"
            />
            <Barras
              titulo="Títulos por nivel de formación"
              filas={porNivel.map((f: any) => ({ etiqueta: f.nivel, n: Number(f.titulos) }))}
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
                  <div key={f.anio_graduacion} className="flex min-w-[2rem] flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{f.titulos}</span>
                    <div
                      className="w-6 rounded-t bg-blue-600"
                      style={{ height: `${Math.max(4, (Number(f.titulos) / max) * 120)}px` }}
                    />
                    <span className="text-[10px] text-slate-400">{f.anio_graduacion}</span>
                  </div>
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
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-1.5">Institución</th>
                    <th className="py-1.5 text-right">Graduados</th>
                    <th className="py-1.5 text-right">Títulos</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {externos.map((f: any) => (
                    <tr key={f.instituto} className="border-t border-slate-100">
                      <td className="py-1.5">{f.instituto}</td>
                      <td className="py-1.5 text-right">{f.graduados}</td>
                      <td className="py-1.5 text-right">{f.titulos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

function Barras({
  titulo,
  filas,
  color,
}: {
  titulo: string;
  filas: { etiqueta: string; n: number }[];
  color: string;
}) {
  const max = Math.max(1, ...filas.map((f) => f.n));
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold text-slate-800">{titulo}</h2>
      <div className="space-y-2.5">
        {filas.map((f) => (
          <div key={f.etiqueta}>
            <div className="mb-0.5 flex items-center justify-between text-sm">
              <span className="text-slate-600">{f.etiqueta}</span>
              <span className="font-medium text-slate-800">{f.n.toLocaleString("es-EC")}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${color}`}
                style={{ width: `${Math.max(2, (f.n / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {filas.length === 0 && <p className="text-sm text-slate-400">Sin datos.</p>}
      </div>
    </div>
  );
}
