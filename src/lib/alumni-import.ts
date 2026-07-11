// Depuración del reporte institucional de alumni (Excel "Alumni Report").
// Funciones puras: parsean y normalizan filas crudas del Excel y las agrupan
// en personas (1 por cédula) con sus títulos (1 fila del Excel = 1 título).
// La escritura a base de datos vive en /api/admin/alumni/importar.

import { cedulaValida } from "@/lib/seguridad";

// Columnas tal como vienen en la hoja "Alumni Report".
export type FilaExcel = {
  identificacion: string;
  apellidos: string;
  nombres: string;
  genero: string;
  email: string;
  celular: string;
  nivelFormacion: string;
  ocupacion: string;
  cargo: string;
  titulo: string;
  instituto: string;
  facultad: string;
  carrera: string;
  anioGraduacion: string;
  fechaCreacion: string;
};

export type TituloDepurado = {
  titulo: string;
  titulo_normalizado: string;
  nivel_formacion: "PROFESIONAL" | "ESPECIALISTA" | "MAESTRIA" | null;
  instituto: string | null;
  anio_graduacion: number | null;
  // Facultad/carrera del propio Excel cuando sí vienen (3% de filas): se
  // aprovechan para sembrar titulos_mapeo con origen='excel'.
  facultad_origen: string | null;
  carrera_origen: string | null;
  fecha_creacion_origen: string | null; // YYYY-MM-DD
};

export type PersonaDepurada = {
  cedula: string;
  nombres: string;
  apellidos: string;
  genero: "masculino" | "femenino" | "otro" | null;
  email: string | null;
  celular: string | null;
  telefono_fijo: string | null;
  ocupacion: string | null;
  cargo: string | null;
  ocupacion_categoria: OcupacionCategoria;
  titulos: TituloDepurado[];
};

export type OcupacionCategoria =
  | "empleado"
  | "independiente"
  | "docente"
  | "estudiante"
  | "desempleado"
  | "otro"
  | "sin_datos";

export type Advertencia = { cedula: string; campo: string; detalle: string };

export type InformeDepuracion = {
  filasLeidas: number;
  duplicadosExactos: number;
  personas: number;
  titulos: number;
  celularesCorregidos: number;
  fijosDetectados: number;
  emailsInvalidos: number;
  cedulasInvalidas: number;
  advertencias: Advertencia[];
};

// ------------------------------------------------------------------
// Normalizadores
// ------------------------------------------------------------------

const CONECTORES = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "do"]);

/** "AVILES VALVERDE" -> "Aviles Valverde"; conectores en minúscula. */
export function normalizarNombre(s: string): string {
  const limpio = (s || "").trim().replace(/\s+/g, " ");
  if (!limpio) return "";
  return limpio
    .toLowerCase()
    .split(" ")
    .map((palabra, i) =>
      i > 0 && CONECTORES.has(palabra)
        ? palabra
        : palabra.charAt(0).toUpperCase() + palabra.slice(1)
    )
    .join(" ");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Devuelve el email normalizado o null si está vacío/es inválido. */
export function normalizarEmail(s: string): { email: string | null; invalido: boolean } {
  const limpio = (s || "").trim().toLowerCase();
  if (!limpio) return { email: null, invalido: false };
  if (!EMAIL_RE.test(limpio)) return { email: null, invalido: true };
  return { email: limpio, invalido: false };
}

export type CelularNormalizado = {
  celular: string | null;
  telefono_fijo: string | null;
  corregido: boolean; // se le antepuso el 0 perdido por Excel
  descartado: boolean; // formato irreconocible
};

/**
 * Celulares ecuatorianos: 10 dígitos empezando en 09. En el reporte real
 * aparecen además: celulares sin el 0 inicial (9 dígitos empezando en 9),
 * convencionales con código de área (9 dígitos empezando en 02–08, p. ej.
 * 072867855) o sin él (7 dígitos), celulares truncados (9 dígitos empezando
 * en 09 — les falta un dígito, irrecuperables) y prefijo internacional 593.
 */
export function normalizarCelular(s: string): CelularNormalizado {
  const digitos = (s || "").replace(/\D/g, "");
  if (!digitos) return { celular: null, telefono_fijo: null, corregido: false, descartado: false };
  if (/^09\d{8}$/.test(digitos)) {
    return { celular: digitos, telefono_fijo: null, corregido: false, descartado: false };
  }
  if (/^9\d{8}$/.test(digitos)) {
    return { celular: `0${digitos}`, telefono_fijo: null, corregido: true, descartado: false };
  }
  // Convencional con código de área: 0 + provincia (2-8) + 7 dígitos.
  if (/^0[2-8]\d{7}$/.test(digitos)) {
    return { celular: null, telefono_fijo: digitos, corregido: false, descartado: false };
  }
  // Convencional sin código de área.
  if (/^\d{7}$/.test(digitos)) {
    return { celular: null, telefono_fijo: digitos, corregido: false, descartado: false };
  }
  // Prefijo internacional 593...
  if (/^593\d{9}$/.test(digitos)) {
    return { celular: `0${digitos.slice(3)}`, telefono_fijo: null, corregido: true, descartado: false };
  }
  // Incluye celulares truncados (09 + 7 dígitos): no se puede inventar el
  // dígito faltante, se descarta con advertencia.
  return { celular: null, telefono_fijo: null, corregido: false, descartado: true };
}

/** Quita tildes y valida contra los 3 niveles del reporte. */
export function normalizarNivel(s: string): TituloDepurado["nivel_formacion"] {
  const limpio = (s || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (limpio === "PROFESIONAL" || limpio === "ESPECIALISTA" || limpio === "MAESTRIA") {
    return limpio;
  }
  return null;
}

/** Clave de mapeo: upper + espacios colapsados. */
export function normalizarTitulo(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizarGenero(s: string): PersonaDepurada["genero"] {
  const g = (s || "").trim().toUpperCase();
  if (g === "MASCULINO") return "masculino";
  if (g === "FEMENINO") return "femenino";
  if (!g) return null;
  return "otro";
}

/** Heurística determinista sobre el texto libre de ocupación/cargo. */
export function categorizarOcupacion(ocupacion: string, cargo: string): OcupacionCategoria {
  const texto = `${ocupacion || ""} ${cargo || ""}`.toLowerCase();
  const limpio = texto.trim();
  if (!limpio || /^(n\/?a|ninguna?|no aplica|-+)$/.test(limpio)) return "sin_datos";
  if (/desemplead|sin empleo|sin trabajo|no trabaja/.test(texto)) return "desempleado";
  if (/docente|profesor|maestr[oa]\b|catedr/.test(texto)) return "docente";
  if (/estudiante|estudia\b|cursando/.test(texto)) return "estudiante";
  if (/independiente|freelance|consultor|propi[oa]|autonom|emprend|negocio propio|privad[oa]\b/.test(texto)) {
    return "independiente";
  }
  // Si menciona alguna organización o un cargo, se asume relación de dependencia.
  if (limpio.length >= 3) return "empleado";
  return "otro";
}

/** Normaliza la "Fecha creación" del Excel (Date, serial o dd/mm/yyyy) a YYYY-MM-DD. */
export function normalizarFecha(valor: unknown): string | null {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }
  const s = String(valor ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

// ------------------------------------------------------------------
// Depuración de conjunto
// ------------------------------------------------------------------

/**
 * Convierte las filas crudas del Excel en personas depuradas + informe.
 * Reglas: descarta filas exactamente duplicadas y cédulas inválidas; agrupa
 * por cédula; ante conflictos dentro de la misma persona gana la fila con
 * "Fecha creación" más reciente.
 */
export function depurarFilas(filas: FilaExcel[]): {
  personas: PersonaDepurada[];
  informe: InformeDepuracion;
} {
  const advertencias: Advertencia[] = [];
  let duplicadosExactos = 0;
  let celularesCorregidos = 0;
  let fijosDetectados = 0;
  let emailsInvalidos = 0;
  const cedulasInvalidas = new Set<string>();

  // 1. Filas exactamente duplicadas (misma persona + título + año + nivel).
  const vistas = new Set<string>();
  const unicas: FilaExcel[] = [];
  for (const f of filas) {
    const clave = [
      (f.identificacion || "").trim(),
      normalizarTitulo(f.titulo),
      (f.anioGraduacion || "").toString().trim(),
      normalizarNivel(f.nivelFormacion) ?? "",
    ].join("|");
    if (vistas.has(clave)) {
      duplicadosExactos++;
      continue;
    }
    vistas.add(clave);
    unicas.push(f);
  }

  // 2. Validación de cédula y agrupación por persona.
  const porCedula = new Map<string, FilaExcel[]>();
  for (const f of unicas) {
    const cedula = (f.identificacion || "").replace(/\D/g, "");
    if (!cedulaValida(cedula)) {
      if (!cedulasInvalidas.has(cedula)) {
        cedulasInvalidas.add(cedula);
        advertencias.push({
          cedula: cedula || "(vacía)",
          campo: "cedula",
          detalle: "Cédula inválida (no pasa el dígito verificador); filas excluidas.",
        });
      }
      continue;
    }
    const lista = porCedula.get(cedula) ?? [];
    lista.push(f);
    porCedula.set(cedula, lista);
  }

  // 3. Persona depurada por cédula.
  const personas: PersonaDepurada[] = [];
  let titulos = 0;

  for (const [cedula, lista] of porCedula) {
    // La fila más reciente manda en los datos de contacto/ocupación.
    const ordenadas = [...lista].sort((a, b) => {
      const fa = normalizarFecha(a.fechaCreacion) ?? "";
      const fb = normalizarFecha(b.fechaCreacion) ?? "";
      return fb.localeCompare(fa);
    });
    const principal = ordenadas[0];

    const { email, invalido } = normalizarEmail(principal.email);
    if (invalido) {
      emailsInvalidos++;
      advertencias.push({
        cedula,
        campo: "email",
        detalle: `Correo inválido descartado: "${(principal.email || "").trim()}"`,
      });
    }

    const cel = normalizarCelular(principal.celular);
    if (cel.corregido) celularesCorregidos++;
    if (cel.telefono_fijo) fijosDetectados++;
    if (cel.descartado) {
      advertencias.push({
        cedula,
        campo: "celular",
        detalle: `Teléfono con formato irreconocible descartado: "${(principal.celular || "").trim()}"`,
      });
    }

    // Conflictos de contacto entre filas de la misma persona (informativo).
    const emailsDistintos = new Set(
      lista.map((f) => (f.email || "").trim().toLowerCase()).filter(Boolean)
    );
    if (emailsDistintos.size > 1) {
      advertencias.push({
        cedula,
        campo: "email",
        detalle: `La persona tiene ${emailsDistintos.size} correos distintos entre filas; se usó el de la fila más reciente.`,
      });
    }

    const ocupacion = (principal.ocupacion || "").trim() || null;
    const cargo = (principal.cargo || "").trim() || null;

    const titulosPersona: TituloDepurado[] = [];
    const clavesTitulo = new Set<string>();
    for (const f of ordenadas) {
      const tituloNorm = normalizarTitulo(f.titulo);
      if (!tituloNorm) continue;
      const anio = parseInt(String(f.anioGraduacion).trim(), 10);
      const anioValido = Number.isFinite(anio) && anio >= 1950 && anio <= 2035 ? anio : null;
      const claveT = `${tituloNorm}|${anioValido ?? ""}`;
      if (clavesTitulo.has(claveT)) continue;
      clavesTitulo.add(claveT);
      titulosPersona.push({
        titulo: tituloNorm,
        titulo_normalizado: tituloNorm,
        nivel_formacion: normalizarNivel(f.nivelFormacion),
        instituto: normalizarTitulo(f.instituto) || "UNIVERSIDAD DE CUENCA",
        anio_graduacion: anioValido,
        facultad_origen: (f.facultad || "").trim() || null,
        carrera_origen: (f.carrera || "").trim() || null,
        fecha_creacion_origen: normalizarFecha(f.fechaCreacion),
      });
    }
    titulos += titulosPersona.length;

    personas.push({
      cedula,
      nombres: normalizarNombre(principal.nombres),
      apellidos: normalizarNombre(principal.apellidos),
      genero: normalizarGenero(principal.genero),
      email,
      celular: cel.celular,
      telefono_fijo: cel.telefono_fijo,
      ocupacion,
      cargo,
      ocupacion_categoria: categorizarOcupacion(principal.ocupacion, principal.cargo),
      titulos: titulosPersona,
    });
  }

  return {
    personas,
    informe: {
      filasLeidas: filas.length,
      duplicadosExactos,
      personas: personas.length,
      titulos,
      celularesCorregidos,
      fijosDetectados,
      emailsInvalidos,
      cedulasInvalidas: cedulasInvalidas.size,
      advertencias,
    },
  };
}

// ------------------------------------------------------------------
// Lectura del Excel (mapea encabezados de la hoja a FilaExcel)
// ------------------------------------------------------------------

/** Mapea una fila cruda de sheet_to_json (encabezados del reporte) a FilaExcel. */
export function mapearFilaExcel(r: Record<string, unknown>): FilaExcel {
  const v = (k: string) => String(r[k] ?? "").trim();
  return {
    identificacion: v("# Identificación"),
    apellidos: v("Apellidos"),
    nombres: v("Nombres"),
    genero: v("Género"),
    email: v("Correo Electrónico Personal"),
    celular: v("Celular"),
    nivelFormacion: v("Nivel Formación"),
    ocupacion: v("Ocupación"),
    cargo: v("Cargo"),
    titulo: v("Título Obtenido"),
    instituto: v("Instituto"),
    facultad: v("Facultad"),
    carrera: v("Carrera"),
    anioGraduacion: v("Año Graduación"),
    fechaCreacion: r["Fecha creación"] instanceof Date ? (r["Fecha creación"] as Date).toISOString() : v("Fecha creación"),
  };
}
