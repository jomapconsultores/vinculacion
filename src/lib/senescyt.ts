// Consulta de títulos SENESCYT por cédula.
//
// La consulta pública oficial (consulta-titulos-web) exige captcha, por lo que
// no es automatizable sin convenio. Este servicio consulta el registro espejo
// local (tabla titulos_senescyt), que combina datos de convenio y títulos
// declarados por el propio usuario dentro del sistema.

import { createAdminClient } from "@/lib/supabase/server";

// Deduplicación de títulos/cursos por título+institución (normalizado), usada
// por /api/senescyt/live/importar para no insertar el mismo registro dos veces.
export function norm(v?: string | null): string {
  return (v || "").trim().toLowerCase();
}

export function claveTituloInstitucion(titulo?: string | null, institucion?: string | null): string {
  return `${norm(titulo)}|${norm(institucion)}`;
}

// Infiere el nivel académico a partir del nombre del título (usado al
// importar desde la consulta en vivo, donde SENESCYT no separa esta info).
export function nivelPorTitulo(titulo: string): "Cuarto nivel" | "Tercer nivel" {
  return /magi|master|maestr|doctor|phd|especial/i.test(titulo) ? "Cuarto nivel" : "Tercer nivel";
}

export type TituloSenescyt = {
  titulo: string;
  institucion: string | null;
  tipo: string | null;
  fecha_registro: string | null;
  numero_registro: string | null;
  area_codigo: string | null;
  area_nombre: string | null;
  fuente: string;
};

export async function consultarSenescyt(cedula: string): Promise<TituloSenescyt[]> {
  const limpia = (cedula || "").replace(/\D/g, "");
  if (limpia.length !== 10) return [];

  // 1) Registro espejo local (demo / caché de convenio / declarados por el usuario)
  const admin = createAdminClient();
  const { data } = await admin
    .from("titulos_senescyt")
    .select("titulo, institucion, tipo, fecha_registro, numero_registro, area_codigo, area_nombre, fuente")
    .eq("cedula", limpia)
    .order("fecha_registro", { ascending: true });

  // 2) Punto de extensión: aquí se conectaría el web service oficial
  //    (requiere convenio interinstitucional; la consulta pública usa captcha).

  return (data as TituloSenescyt[]) ?? [];
}
