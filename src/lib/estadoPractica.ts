// Estado y avance de una práctica preprofesional: compartido entre el panel
// de admin (todas las prácticas) y el dashboard del graduado (las propias),
// que antes calculaban esto cada uno por su lado y llegaban a resultados
// distintos para el mismo dato (cumplimiento sin capar en uno, capado en el
// otro; 'reprobada' sin estilo propio en uno de los dos).

const ESTILO_POR_ESTADO: Record<string, string> = {
  en_curso: "bg-blue-50 text-blue-700",
  finalizada: "bg-emerald-50 text-emerald-700",
  aprobada: "bg-emerald-50 text-emerald-700",
  suspendida: "bg-rose-50 text-rose-700",
  reprobada: "bg-rose-50 text-rose-700",
};

export function estiloEstadoPractica(estado?: string | null): string {
  return ESTILO_POR_ESTADO[(estado ?? "").toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

export function etiquetaEstadoPractica(estado?: string | null): string {
  return (estado ?? "sin estado").replace(/_/g, " ");
}

// Capado a 100%: mostrar más de 100% no aporta información útil y rompe
// barras de progreso que asumen un rango 0-100.
export function porcentajeCumplimiento(horasCumplidas: number, horasPlanificadas: number): number {
  if (!horasPlanificadas || horasPlanificadas <= 0) return 0;
  return Math.min(100, Math.round((horasCumplidas / horasPlanificadas) * 100));
}
