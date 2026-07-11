import Link from "next/link";
import { requireModulo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { iniciales } from "@/lib/utils";
import {
  GraduationCap,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  X,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

type Filtros = {
  genero?: string;
  facultad?: string;
  carrera?: string;
  anio?: string;
  nivel?: string;
  ocupacion?: string;
  instituto?: string;
  q?: string;
  pagina?: string;
};

type FilaGraduado = {
  id: number;
  cedula: string;
  nombres: string | null;
  apellidos: string | null;
  genero: string | null;
  email: string | null;
  celular: string | null;
  ciudad: string | null;
  ocupacion: string | null;
  ocupacion_categoria: string;
  estado_verificacion: string;
  con_cuenta: boolean;
  titulo_reciente: string | null;
  n_titulos: number;
  total_count: number;
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
const ETIQUETA_OCUPACION: Record<string, string> = {
  empleado: "Empleado/a",
  independiente: "Independiente",
  docente: "Docente",
  estudiante: "Estudiante",
  desempleado: "Desempleado/a",
  otro: "Otro",
  sin_datos: "Sin datos",
};

// Describe el filtro activo para el chip del encabezado.
function chipFiltro(f: Filtros): { campo: string; valor: string } | null {
  if (f.genero) return { campo: "Género", valor: ETIQUETA_GENERO[f.genero] ?? f.genero };
  if (f.facultad) return { campo: "Facultad", valor: f.facultad };
  if (f.carrera) return { campo: "Carrera", valor: f.carrera };
  if (f.anio) return { campo: "Año de graduación", valor: f.anio };
  if (f.nivel) return { campo: "Nivel", valor: ETIQUETA_NIVEL[f.nivel] ?? f.nivel };
  if (f.ocupacion) return { campo: "Ocupación", valor: ETIQUETA_OCUPACION[f.ocupacion] ?? f.ocupacion };
  if (f.instituto) return { campo: "Institución", valor: f.instituto };
  return null;
}

function qs(base: Filtros, cambios: Partial<Filtros>): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...base, ...cambios })) {
    if (v) merged[k] = v;
  }
  return "?" + new URLSearchParams(merged).toString();
}

export default async function GraduadosPage({ searchParams }: { searchParams: Filtros }) {
  await requireModulo("alumni");
  const supabase = await createClient();

  const pagina = Math.max(1, parseInt(searchParams.pagina || "1", 10) || 1);
  const q = (searchParams.q || "").trim();

  const { data, error } = await supabase.rpc("alumni_filtrados", {
    p_genero: searchParams.genero || null,
    p_facultad: searchParams.facultad || null,
    p_carrera: searchParams.carrera || null,
    p_anio: searchParams.anio ? parseInt(searchParams.anio, 10) : null,
    p_nivel: searchParams.nivel || null,
    p_ocupacion: searchParams.ocupacion || null,
    p_instituto: searchParams.instituto || null,
    p_q: q || null,
    p_limit: POR_PAGINA,
    p_offset: (pagina - 1) * POR_PAGINA,
  });

  const filas = (data ?? []) as FilaGraduado[];
  const total = filas[0]?.total_count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const chip = chipFiltro(searchParams);

  // Búsqueda: los inputs ocultos preservan el filtro activo al buscar.
  const filtrosOcultos: [string, string | undefined][] = [
    ["genero", searchParams.genero],
    ["facultad", searchParams.facultad],
    ["carrera", searchParams.carrera],
    ["anio", searchParams.anio],
    ["nivel", searchParams.nivel],
    ["ocupacion", searchParams.ocupacion],
    ["instituto", searchParams.instituto],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/alumni"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al panel de Alumni
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <GraduationCap className="h-6 w-6 text-blue-700" /> Graduados
        </h1>
      </div>

      {/* Chip de filtro activo */}
      {chip && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge inline-flex items-center gap-1.5 bg-blue-50 text-blue-700">
            {chip.campo}: <strong>{chip.valor}</strong>
            <Link href="/admin/alumni/graduados" aria-label="Quitar filtro">
              <X className="h-3.5 w-3.5" />
            </Link>
          </span>
        </div>
      )}

      <form className="card flex items-center gap-2 p-3">
        {filtrosOcultos.map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null
        )}
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, apellido, cédula o correo…"
          className="input flex-1 border-none focus:ring-0"
        />
        <button className="btn-primary">Buscar</button>
      </form>

      <p className="text-sm text-slate-500">
        {error
          ? "No se pudo cargar el listado."
          : `${total.toLocaleString("es-EC")} graduado${total === 1 ? "" : "s"}${
              q ? ` que coinciden con “${q}”` : ""
            } — página ${pagina} de ${totalPaginas}`}
      </p>

      <div className="space-y-2">
        {filas.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Sin resultados.</div>
        ) : (
          filas.map((g) => (
            <Link
              key={g.id}
              href={`/admin/alumni/${g.id}`}
              className="card card-hover flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-900 ring-1 ring-inset ring-teal-100">
                  {g.nombres || g.apellidos ? (
                    iniciales(g.nombres, g.apellidos)
                  ) : (
                    <GraduationCap className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium text-slate-800">
                    {g.nombres || "—"} {g.apellidos || ""}
                    {g.con_cuenta && (
                      <span className="badge inline-flex shrink-0 items-center gap-1 bg-blue-50 text-blue-700">
                        <UserCheck className="h-3 w-3" /> Cuenta
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {g.cedula}
                    {g.email ? ` · ${g.email}` : ""}
                    {g.titulo_reciente ? ` · ${g.titulo_reciente}` : ""}
                    {g.n_titulos > 1 ? ` · ${g.n_titulos} títulos` : ""}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          ))
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          {pagina > 1 ? (
            <Link href={qs(searchParams, { pagina: String(pagina - 1) })} className="btn-outline">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : (
            <span />
          )}
          {pagina < totalPaginas && (
            <Link href={qs(searchParams, { pagina: String(pagina + 1) })} className="btn-outline">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
