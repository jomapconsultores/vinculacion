// Helpers de lectura para Alumni que sortean el tope de filas de PostgREST
// (db-max-rows = 1000): pagina en bloques de 1000 hasta agotar el conjunto.
// Se usan tanto en las páginas del panel como en el endpoint de reportes.
import type { SupabaseClient } from "@supabase/supabase-js";

const PAGINA = 1000;

// Parámetros del RPC alumni_filtrados (sin limit/offset).
export type FiltrosGraduados = {
  p_genero?: string | null;
  p_facultad?: string | null;
  p_carrera?: string | null;
  p_anio?: number | null;
  p_nivel?: string | null;
  p_ocupacion?: string | null;
  p_instituto?: string | null;
  p_q?: string | null;
  p_con_email?: boolean | null;
  p_con_celular?: boolean | null;
  p_verificado?: boolean | null;
  p_pendiente?: boolean | null;
  p_con_cuenta?: boolean | null;
};

// Trae TODOS los graduados que cumplen el filtro (paginando el RPC).
export async function traerGraduadosFiltrados(
  supabase: SupabaseClient,
  f: FiltrosGraduados
): Promise<{ rows: any[]; error: string | null }> {
  const rows: any[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase.rpc("alumni_filtrados", {
      ...f,
      p_limit: PAGINA,
      p_offset: desde,
    });
    if (error) return { rows, error: error.message };
    const lote = (data ?? []) as any[];
    rows.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return { rows, error: null };
}

// Trae filas mínimas de títulos (nivel + facultad) para el gráfico comparativo,
// aplicando los mismos filtros del listado de títulos.
export async function traerTitulosParaComparativo(
  supabase: SupabaseClient,
  conCarrera: boolean,
  q: string
): Promise<any[]> {
  const rows: any[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    let query = supabase
      .from("alumni_titulos")
      .select("nivel_formacion, carrera_id, carreras(facultad), alumni!inner(id)")
      .range(desde, desde + PAGINA - 1);
    if (conCarrera) query = query.not("carrera_id", "is", null);
    if (q) {
      query = query.or(
        `nombres.ilike.%${q}%,apellidos.ilike.%${q}%,cedula.ilike.%${q}%`,
        { referencedTable: "alumni" }
      );
    }
    const { data, error } = await query;
    if (error) break;
    const lote = (data ?? []) as any[];
    rows.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return rows;
}
