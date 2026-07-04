// Configuración compartida del repositorio de documentos personales
// (subida propia + visor de staff en /admin/personas).

export const DOCUMENTOS_BUCKET = "documentos-personales";

export const DOCUMENTOS_CATEGORIAS = [
  { value: "cedula", label: "Cédula de identidad" },
  { value: "titulo", label: "Título / acta de grado" },
  { value: "certificado", label: "Certificado" },
  { value: "cv", label: "Hoja de vida" },
  { value: "contrato", label: "Contrato / convenio" },
  { value: "otro", label: "Otro" },
] as const;

export type DocumentoCategoria = (typeof DOCUMENTOS_CATEGORIAS)[number]["value"];

export const DOCUMENTOS_TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const DOCUMENTOS_TAMANO_MAX = 15 * 1024 * 1024; // 15MB

export function categoriaLabel(categoria: string): string {
  return DOCUMENTOS_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;
}
