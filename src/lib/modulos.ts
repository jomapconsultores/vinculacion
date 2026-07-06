// Módulos otorgables de /admin (permisos_modulo.modulo, ver
// supabase/migrations/0032_permisos_modulo.sql). Única fuente de verdad para
// el tipo: reutilizado por auth.ts (requireModulo), la API de
// autoridades/[id]/modulos y los componentes de UI, para que un typo no
// pueda compilar silenciosamente en ningún consumidor.
export const MODULOS_VALIDOS = [
  "personas",
  "empleabilidad",
  "servicios",
  "practicas",
  "cursos",
  "indicadores",
  "encuestas",
  "psicometria",
] as const;

export type Modulo = (typeof MODULOS_VALIDOS)[number];
