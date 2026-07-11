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
  "alumni",
] as const;

export type Modulo = (typeof MODULOS_VALIDOS)[number];

// Etiquetas legibles por módulo. Vive aquí (módulo plano, no "use client")
// para que también lo pueda consumir código de servidor —route handlers de
// reportes— sin cruzar la frontera de un componente cliente.
export const MODULOS_DISPONIBLES: { value: Modulo; label: string }[] = [
  { value: "personas", label: "Personas" },
  { value: "empleabilidad", label: "Empleabilidad" },
  { value: "servicios", label: "Servicios" },
  { value: "practicas", label: "Prácticas" },
  { value: "cursos", label: "Revisión de cursos" },
  { value: "indicadores", label: "Indicadores" },
  { value: "encuestas", label: "Encuestas" },
  { value: "psicometria", label: "Psicometría" },
  { value: "alumni", label: "Alumni" },
];
