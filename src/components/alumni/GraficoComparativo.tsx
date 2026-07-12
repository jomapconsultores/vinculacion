// Gráfico de barras horizontales para comparar la composición del conjunto
// que se está viendo (p. ej. los graduados filtrados por género u ocupación).
// Server component puro; recibe filas ya agregadas.
export function GraficoComparativo({
  titulo,
  filas,
  color = "bg-blue-600",
}: {
  titulo: string;
  filas: { etiqueta: string; n: number }[];
  color?: string;
}) {
  const total = filas.reduce((s, f) => s + f.n, 0);
  const max = Math.max(1, ...filas.map((f) => f.n));
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold text-slate-800">{titulo}</h2>
      <div className="space-y-2">
        {filas.map((f) => (
          <div key={f.etiqueta}>
            <div className="mb-0.5 flex items-center justify-between text-sm">
              <span className="min-w-0 truncate pr-2 text-slate-600">{f.etiqueta}</span>
              <span className="shrink-0 font-medium text-slate-800">
                {f.n.toLocaleString("es-EC")}
                {total > 0 && (
                  <span className="ml-1 font-normal text-slate-400">
                    ({Math.round((f.n / total) * 100)}%)
                  </span>
                )}
              </span>
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

// Agrupa filas por una clave y devuelve [{etiqueta, n}] ordenado desc por n.
export function agrupar<T>(
  filas: T[],
  clave: (f: T) => string
): { etiqueta: string; n: number }[] {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    const k = clave(f);
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([etiqueta, n]) => ({ etiqueta, n }))
    .sort((a, b) => b.n - a.n);
}
