// Estructura canónica del análisis de hoja de vida (compartida por API y exportadores).

export type PerfilUnesco = {
  area_principal: { codigo: string; nombre: string; justificacion: string };
  areas_secundarias: { codigo: string; nombre: string }[];
};

export type Capacitacion = {
  nombre: string;
  institucion?: string | null;
  horas?: number | null;
  anio?: number | null;
  fuente?: string | null; // "hoja de vida" | "certificado" | ...
};

export type Certificacion = {
  nombre: string;
  emisor?: string | null;
  fecha?: string | null;
};

export type ExperienciaItem = { cargo: string; empresa: string; periodo: string; logros: string[] };
export type EducacionItem = { titulo: string; institucion: string; periodo: string };

export type CVAnalisis = {
  datos: {
    nombre?: string;
    email?: string;
    telefono?: string;
    ciudad?: string;
    linkedin?: string;
  };
  resumen: string;
  experiencia: ExperienciaItem[];
  educacion: EducacionItem[];
  habilidades: string[];
  capacitaciones: Capacitacion[];
  certificaciones_detectadas: Certificacion[];
  perfil_unesco: PerfilUnesco;
  nivel_profesional?: string;
  recomendaciones: string[];
  foto_url?: string | null;
};

// Áreas amplias UNESCO / ISCED-F 2013 (campos de educación y formación)
export const AREAS_UNESCO: { codigo: string; nombre: string }[] = [
  { codigo: "00", nombre: "Programas y certificaciones genéricos" },
  { codigo: "01", nombre: "Educación" },
  { codigo: "02", nombre: "Artes y humanidades" },
  { codigo: "03", nombre: "Ciencias sociales, periodismo e información" },
  { codigo: "04", nombre: "Administración de empresas y derecho" },
  { codigo: "05", nombre: "Ciencias naturales, matemáticas y estadística" },
  { codigo: "06", nombre: "Tecnologías de la información y la comunicación (TIC)" },
  { codigo: "07", nombre: "Ingeniería, industria y construcción" },
  { codigo: "08", nombre: "Agricultura, silvicultura, pesca y veterinaria" },
  { codigo: "09", nombre: "Salud y bienestar" },
  { codigo: "10", nombre: "Servicios" },
];
