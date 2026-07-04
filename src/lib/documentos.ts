// Configuración compartida del repositorio de documentos personales
// (subida propia + visor de staff en /admin/personas).

export const DOCUMENTOS_BUCKET = "documentos-personales";

export const DOCUMENTOS_CATEGORIAS = [
  { value: "cedula", label: "Cédula de identidad" },
  { value: "titulo", label: "Título / acta de grado" },
  { value: "certificado", label: "Certificado" },
  { value: "cv", label: "Hoja de vida" },
  { value: "curso", label: "Curso" },
  { value: "seminario", label: "Seminario / taller / congreso" },
  { value: "articulo_cientifico", label: "Artículo científico" },
  { value: "experiencia_profesional", label: "Experiencia laboral profesional" },
  { value: "experiencia_academica", label: "Experiencia laboral académica" },
  { value: "experiencia_administrativa", label: "Experiencia laboral administrativa-académica" },
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

// Palabras clave por categoría (sin tildes, minúsculas) para sugerir dónde
// guardar un archivo recién arrastrado, a partir de su nombre. Es solo una
// sugerencia editable, no una clasificación forzada: el orden importa, la
// primera coincidencia gana.
const PALABRAS_CLAVE: [DocumentoCategoria, string[]][] = [
  ["cedula", ["cedula", "ci_", "dni", "identidad"]],
  ["titulo", ["titulo", "acta de grado", "acta_grado", "actadegrado", "tercer nivel", "cuarto nivel"]],
  ["cv", ["hoja de vida", "hoja_de_vida", "curriculum", "cv_", "cv."]],
  ["seminario", ["seminario", "taller", "congreso", "conferencia", "workshop", "webinar"]],
  ["articulo_cientifico", ["articulo", "paper", "publicacion", "revista", "journal", "ponencia"]],
  ["experiencia_administrativa", ["administrativ", "coordinacion", "coordinador", "jefatura", "decanato", "direccion"]],
  ["experiencia_academica", ["docencia", "catedra", "catedratico", "profesor", "academic", "docente"]],
  ["experiencia_profesional", ["experiencia", "laboral", "certificado_trabajo", "empleo"]],
  ["curso", ["curso", "capacitacion", "course", "diplomado"]],
  ["certificado", ["certificado", "certificate", "diploma"]],
  ["contrato", ["contrato", "convenio"]],
];

function sinTildes(s: string): string {
  return s
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n");
}

export function sugerirCategoria(nombreArchivo: string): DocumentoCategoria {
  const n = sinTildes(nombreArchivo.toLowerCase());
  for (const [categoria, palabras] of PALABRAS_CLAVE) {
    if (palabras.some((p) => n.includes(p))) return categoria;
  }
  return "otro";
}
