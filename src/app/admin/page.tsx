import { createClient } from "@/lib/supabase/server";
import {
  GraduationCap,
  ShieldCheck,
  Briefcase,
  Send,
  BadgeCheck,
  Award,
  HeartHandshake,
  ArrowDown,
  TrendingUp,
} from "lucide-react";

type Indicadores = {
  total_graduados: number;
  graduados_verificados: number;
  empleos_activos: number;
  postulaciones_totales: number;
  postulantes_unicos: number;
  contratados: number;
  competencias_avaladas: number;
  servicios_activos: number;
};

const KPI = ({
  icon: Icon,
  valor,
  etiqueta,
  color,
}: {
  icon: React.ElementType;
  valor: number;
  etiqueta: string;
  color: string;
}) => (
  <div className="card p-5">
    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-3xl font-bold text-slate-900">{valor}</p>
    <p className="mt-1 text-sm text-slate-500">{etiqueta}</p>
  </div>
);

export default async function AdminPanel() {
  const supabase = await createClient();

  const { data: ind } = await supabase
    .from("v_indicadores_globales")
    .select("*")
    .single();

  const indicadores: Indicadores = (ind as Indicadores) ?? {
    total_graduados: 0,
    graduados_verificados: 0,
    empleos_activos: 0,
    postulaciones_totales: 0,
    postulantes_unicos: 0,
    contratados: 0,
    competencias_avaladas: 0,
    servicios_activos: 0,
  };

  // Trazabilidad longitudinal: personas distintas por etapa, agregadas en SQL
  // (v_indicadores_globales, ver 0020_vistas_postulaciones.sql) en vez de
  // descargar toda la tabla de postulaciones para contarlas en JS.
  const postulantes = indicadores.postulantes_unicos;
  const contratadosPersonas = indicadores.contratados;

  const embudo = [
    {
      label: "Graduados registrados",
      desc: "Egresados con identidad en la plataforma",
      valor: indicadores.total_graduados,
      icon: GraduationCap,
      color: "bg-blue-900",
    },
    {
      label: "Postularon a un empleo",
      desc: "Graduados que iniciaron su inserción laboral",
      valor: postulantes,
      icon: Send,
      color: "bg-teal-600",
    },
    {
      label: "Fueron contratados",
      desc: "Graduados insertados en el mercado laboral",
      valor: contratadosPersonas,
      icon: BadgeCheck,
      color: "bg-emerald-600",
    },
  ];

  const maxEmbudo = Math.max(indicadores.total_graduados, 1);
  const tasaInsercion =
    indicadores.total_graduados > 0
      ? Math.round((contratadosPersonas / indicadores.total_graduados) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <header>
        <span className="badge bg-blue-50 text-blue-700">Panel de autoridad</span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Tablero institucional de vinculación
        </h1>
        <p className="mt-1 text-slate-500">
          Indicadores globales y trazabilidad longitudinal del graduado, de la formación
          al empleo. Datos auditables para acreditación.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KPI
          icon={GraduationCap}
          valor={indicadores.total_graduados}
          etiqueta="Graduados registrados"
          color="bg-blue-50 text-blue-700"
        />
        <KPI
          icon={ShieldCheck}
          valor={indicadores.graduados_verificados}
          etiqueta="Verificados por padrón"
          color="bg-indigo-50 text-indigo-700"
        />
        <KPI
          icon={Briefcase}
          valor={indicadores.empleos_activos}
          etiqueta="Empleos activos"
          color="bg-teal-50 text-teal-700"
        />
        <KPI
          icon={Send}
          valor={indicadores.postulaciones_totales}
          etiqueta="Postulaciones totales"
          color="bg-cyan-50 text-cyan-700"
        />
        <KPI
          icon={BadgeCheck}
          valor={indicadores.contratados}
          etiqueta="Contrataciones"
          color="bg-emerald-50 text-emerald-700"
        />
        <KPI
          icon={Award}
          valor={indicadores.competencias_avaladas}
          etiqueta="Competencias avaladas"
          color="bg-violet-50 text-violet-700"
        />
        <KPI
          icon={HeartHandshake}
          valor={indicadores.servicios_activos}
          etiqueta="Servicios activos"
          color="bg-amber-50 text-amber-700"
        />
        <KPI
          icon={TrendingUp}
          valor={tasaInsercion}
          etiqueta="Tasa de inserción (%)"
          color="bg-rose-50 text-rose-700"
        />
      </section>

      {/* Embudo de trazabilidad */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Trazabilidad longitudinal
            </h2>
            <p className="text-sm text-slate-500">
              Del estudiante al graduado y del graduado al empleador: seguimiento del
              recorrido completo en una sola base de datos.
            </p>
          </div>
          <span className="badge bg-emerald-50 text-emerald-700">
            {tasaInsercion}% de inserción laboral
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {embudo.map((etapa, i) => {
            const ancho = Math.max((etapa.valor / maxEmbudo) * 100, 6);
            return (
              <div key={etapa.label}>
                <div
                  className={`relative overflow-hidden rounded-xl ${etapa.color} text-white transition-all`}
                  style={{ width: `${ancho}%`, minWidth: "min(100%, 16rem)" }}
                >
                  <div className="flex items-center gap-3 px-5 py-4">
                    <etapa.icon className="h-6 w-6 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-2xl font-bold leading-none">{etapa.valor}</p>
                      <p className="truncate text-sm text-white/80">{etapa.label}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-1 text-xs text-slate-500">
                  <span>{etapa.desc}</span>
                  {i > 0 && embudo[i - 1].valor > 0 && (
                    <span className="badge bg-slate-100 text-slate-600">
                      {Math.round((etapa.valor / embudo[i - 1].valor) * 100)}% de la etapa
                      anterior
                    </span>
                  )}
                </div>
                {i < embudo.length - 1 && (
                  <div className="my-1 flex justify-start pl-6 text-slate-300">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
