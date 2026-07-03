// Instrumento "Perfil Psicolaboral" — evaluación psicométrica voluntaria.
// Contenido original (no reproduce instrumentos protegidos) elaborado con criterio de
// psicología clínica y laboral: rasgos de personalidad orientados al trabajo (estilo
// Big Five), bienestar/riesgo psicosocial laboral y un screening general de ansiedad-estrés.
// Es una herramienta de autoconocimiento y orientación, NO un diagnóstico clínico.

export type Seccion = "personalidad" | "bienestar" | "ansiedad";

export type Dimension =
  | "apertura"
  | "responsabilidad"
  | "extraversion"
  | "amabilidad"
  | "estabilidad_emocional"
  | "agotamiento_emocional"
  | "cinismo"
  | "eficacia_profesional"
  | "ansiedad_estres";

export type Banda = "bajo" | "medio" | "alto";

export type ItemPsicometrico = {
  id: string;
  texto: string;
  dimension: Dimension;
  seccion: Seccion;
  reverso: boolean; // si true, el puntaje del ítem se invierte (6 - valor) antes de promediar
};

export const ESCALA: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "Totalmente en desacuerdo" },
  { valor: 2, etiqueta: "En desacuerdo" },
  { valor: 3, etiqueta: "Neutral" },
  { valor: 4, etiqueta: "De acuerdo" },
  { valor: 5, etiqueta: "Totalmente de acuerdo" },
];

export const ITEMS: ItemPsicometrico[] = [
  // ---- Sección A: personalidad orientada al trabajo ----
  { id: "pl_apertura_1", seccion: "personalidad", dimension: "apertura", reverso: false, texto: "Disfruto aprender temas o herramientas nuevas aunque todavía no las domine." },
  { id: "pl_apertura_2", seccion: "personalidad", dimension: "apertura", reverso: false, texto: "Me entusiasma proponer formas distintas de resolver un problema en el trabajo o los estudios." },
  { id: "pl_apertura_3", seccion: "personalidad", dimension: "apertura", reverso: false, texto: "Me adapto con facilidad cuando cambian los planes o las prioridades de un proyecto." },
  { id: "pl_apertura_4", seccion: "personalidad", dimension: "apertura", reverso: true, texto: "Prefiero seguir siempre el mismo procedimiento y evito los cambios." },

  { id: "pl_resp_1", seccion: "personalidad", dimension: "responsabilidad", reverso: false, texto: "Organizo mis tareas y cumplo los plazos que me propongo." },
  { id: "pl_resp_2", seccion: "personalidad", dimension: "responsabilidad", reverso: false, texto: "Reviso mi trabajo antes de entregarlo para asegurarme de que esté bien hecho." },
  { id: "pl_resp_3", seccion: "personalidad", dimension: "responsabilidad", reverso: true, texto: "Suelo dejar las tareas importantes para el último momento." },
  { id: "pl_resp_4", seccion: "personalidad", dimension: "responsabilidad", reverso: false, texto: "Cumplo los compromisos que adquiero, aunque surjan imprevistos." },

  { id: "pl_extra_1", seccion: "personalidad", dimension: "extraversion", reverso: false, texto: "Me resulta fácil iniciar una conversación con personas que no conozco." },
  { id: "pl_extra_2", seccion: "personalidad", dimension: "extraversion", reverso: false, texto: "Tomo la iniciativa para proponer ideas en reuniones o espacios de equipo." },
  { id: "pl_extra_3", seccion: "personalidad", dimension: "extraversion", reverso: true, texto: "Prefiero mantenerme al margen antes que participar activamente en un grupo." },
  { id: "pl_extra_4", seccion: "personalidad", dimension: "extraversion", reverso: false, texto: "Me siento con energía después de trabajar junto a otras personas." },

  { id: "pl_amab_1", seccion: "personalidad", dimension: "amabilidad", reverso: false, texto: "Tomo en cuenta el punto de vista de mis compañeros aunque no coincida con el mío." },
  { id: "pl_amab_2", seccion: "personalidad", dimension: "amabilidad", reverso: false, texto: "Colaboro con otras personas sin esperar algo a cambio." },
  { id: "pl_amab_3", seccion: "personalidad", dimension: "amabilidad", reverso: true, texto: "Cuando hay un desacuerdo, me cuesta ceder aunque la otra persona tenga razón." },
  { id: "pl_amab_4", seccion: "personalidad", dimension: "amabilidad", reverso: false, texto: "Busco soluciones que beneficien al equipo, no solo a mí." },

  { id: "pl_estab_1", seccion: "personalidad", dimension: "estabilidad_emocional", reverso: false, texto: "Mantengo la calma cuando surge un imprevisto o una crítica en el trabajo." },
  { id: "pl_estab_2", seccion: "personalidad", dimension: "estabilidad_emocional", reverso: true, texto: "Un comentario negativo puede arruinarme el resto del día." },
  { id: "pl_estab_3", seccion: "personalidad", dimension: "estabilidad_emocional", reverso: false, texto: "Puedo seguir concentrado/a en mis tareas aunque tenga algo de presión encima." },
  { id: "pl_estab_4", seccion: "personalidad", dimension: "estabilidad_emocional", reverso: false, texto: "Me recupero con relativa rapidez después de un tropiezo o un error." },

  // ---- Sección B: bienestar y riesgo psicosocial laboral ----
  { id: "pl_agot_1", seccion: "bienestar", dimension: "agotamiento_emocional", reverso: false, texto: "Termino la jornada de trabajo o estudio sintiéndome emocionalmente agotado/a." },
  { id: "pl_agot_2", seccion: "bienestar", dimension: "agotamiento_emocional", reverso: false, texto: "Me cuesta reunir energía para empezar el día laboral o académico." },
  { id: "pl_agot_3", seccion: "bienestar", dimension: "agotamiento_emocional", reverso: false, texto: "Siento que estoy \"quemado/a\" por las exigencias de mi trabajo o mis estudios." },

  { id: "pl_cinismo_1", seccion: "bienestar", dimension: "cinismo", reverso: false, texto: "He perdido el interés o el entusiasmo que antes tenía por mi trabajo o carrera." },
  { id: "pl_cinismo_2", seccion: "bienestar", dimension: "cinismo", reverso: false, texto: "Me he vuelto más distante o indiferente hacia las personas con las que trabajo o estudio." },
  { id: "pl_cinismo_3", seccion: "bienestar", dimension: "cinismo", reverso: false, texto: "Dudo del valor o la utilidad de lo que hago día a día." },

  { id: "pl_efic_1", seccion: "bienestar", dimension: "eficacia_profesional", reverso: false, texto: "Siento que estoy logrando cosas valiosas en mi trabajo o formación." },
  { id: "pl_efic_2", seccion: "bienestar", dimension: "eficacia_profesional", reverso: false, texto: "Confío en mi capacidad para resolver los problemas que se me presentan." },
  { id: "pl_efic_3", seccion: "bienestar", dimension: "eficacia_profesional", reverso: false, texto: "Las personas cercanas reconocen que hago bien mi trabajo." },

  // ---- Sección C: ansiedad y manejo del estrés ----
  { id: "pl_ans_1", seccion: "ansiedad", dimension: "ansiedad_estres", reverso: false, texto: "Me cuesta relajarme incluso en mis momentos de descanso." },
  { id: "pl_ans_2", seccion: "ansiedad", dimension: "ansiedad_estres", reverso: false, texto: "Siento tensión física (dolor de cabeza, tensión muscular, problemas para dormir) relacionada con el trabajo o los estudios." },
  { id: "pl_ans_3", seccion: "ansiedad", dimension: "ansiedad_estres", reverso: false, texto: "Me preocupo de forma excesiva por cosas que podrían salir mal." },
  { id: "pl_ans_4", seccion: "ansiedad", dimension: "ansiedad_estres", reverso: false, texto: "Siento que las exigencias de mi día a día superan mi capacidad para manejarlas." },
];

export const SECCIONES: Record<Seccion, { titulo: string; descripcion: string }> = {
  personalidad: {
    titulo: "Rasgos de personalidad orientados al trabajo",
    descripcion: "Cómo tiendes a pensar, relacionarte y actuar en contextos laborales o académicos.",
  },
  bienestar: {
    titulo: "Bienestar y riesgo psicosocial laboral",
    descripcion: "Cómo te has sentido en relación con tu trabajo o tus estudios en las últimas semanas.",
  },
  ansiedad: {
    titulo: "Ansiedad y manejo del estrés",
    descripcion: "Señales generales de tensión o preocupación en tu día a día.",
  },
};

// Dimensiones donde un puntaje ALTO se interpreta como señal de riesgo (no como rasgo positivo).
const DIMENSIONES_RIESGO_ALTO: Dimension[] = ["agotamiento_emocional", "cinismo", "ansiedad_estres"];
// Dimensiones donde un puntaje BAJO se interpreta como señal de riesgo.
const DIMENSIONES_RIESGO_BAJO: Dimension[] = ["eficacia_profesional"];

const TEXTOS: Record<Dimension, { label: string; bajo: string; medio: string; alto: string }> = {
  apertura: {
    label: "Apertura a la experiencia",
    bajo: "Prefieres marcos de trabajo estables y procedimientos conocidos; los cambios bruscos o la ambigüedad pueden resultarte incómodos. Puede ser una fortaleza en roles que requieren consistencia y apego a protocolos.",
    medio: "Combinas apertura a nuevas ideas con cierta preferencia por la estructura; te adaptas a los cambios cuando tienen un propósito claro.",
    alto: "Muestras curiosidad e iniciativa frente a lo nuevo y te adaptas con facilidad a cambios de contexto, herramientas o enfoques; esto favorece roles con innovación o resolución de problemas no rutinarios.",
  },
  responsabilidad: {
    label: "Responsabilidad y organización",
    bajo: "Puede costarte sostener la organización y el cumplimiento de plazos bajo presión; te conviene apoyarte en herramientas de planificación y recordatorios externos.",
    medio: "Cumples tus compromisos en general, aunque en momentos de carga alta la organización puede resentirse.",
    alto: "Te caracteriza la disciplina, la organización y el cumplimiento constante de tus compromisos, un rasgo muy valorado en la mayoría de entornos laborales.",
  },
  extraversion: {
    label: "Extraversión y orientación social",
    bajo: "Prefieres el trabajo autónomo o en grupos pequeños; la interacción social intensa puede resultarte desgastante. Sueles rendir bien en tareas que requieren concentración individual.",
    medio: "Te adaptas tanto a espacios de trabajo colaborativo como a tareas individuales, según lo que se requiera.",
    alto: "Muestras energía e iniciativa en la interacción social; te resulta natural comunicarte, tomar la palabra y trabajar en equipo.",
  },
  amabilidad: {
    label: "Amabilidad y cooperación",
    bajo: "Tiendes a priorizar tu propio criterio por sobre el consenso; esto puede ayudarte a sostener posiciones firmes, aunque conviene cuidar la escucha activa en el trabajo en equipo.",
    medio: "Equilibras tus propios intereses con la cooperación; colaboras cuando la situación lo amerita.",
    alto: "Muestras disposición a cooperar, escuchar y ceder por el bienestar del equipo; es una fortaleza para roles que requieren trabajo colaborativo o atención a personas.",
  },
  estabilidad_emocional: {
    label: "Estabilidad emocional",
    bajo: "Los imprevistos, la crítica o la presión pueden afectarte con intensidad y por más tiempo del que quisieras. Trabajar estrategias de autorregulación (pausas activas, respiración, apoyo profesional) puede ayudarte a sostener el desempeño bajo presión.",
    medio: "Mantienes la calma en la mayoría de las situaciones, aunque episodios de alta presión pueden afectar tu concentración o tu ánimo temporalmente.",
    alto: "Mantienes la calma y la concentración incluso bajo presión o crítica, y te recuperas con rapidez de los contratiempos; es una fortaleza importante para el manejo del estrés laboral.",
  },
  agotamiento_emocional: {
    label: "Agotamiento emocional",
    bajo: "No reportas señales relevantes de agotamiento emocional en este momento.",
    medio: "Presentas algunas señales de desgaste emocional; conviene prestar atención a tus tiempos de descanso y a tu carga actual de trabajo o estudio.",
    alto: "Reportas un nivel elevado de agotamiento emocional. Esto suele asociarse a sobrecarga sostenida; te recomendamos buscar apoyo del área de bienestar/psicología y revisar tu carga actual.",
  },
  cinismo: {
    label: "Cinismo / desconexión",
    bajo: "Mantienes una conexión positiva con tu trabajo o tus estudios, sin señales relevantes de desmotivación.",
    medio: "Muestras algunas señales de distancia o desmotivación; vale la pena revisar qué aspectos de tu entorno laboral o académico han cambiado últimamente.",
    alto: "Reportas un nivel elevado de distanciamiento o desmotivación hacia tu trabajo o tus estudios. Es recomendable conversarlo con el área de bienestar/psicología, ya que sostenido en el tiempo puede afectar tu desempeño y tu bienestar.",
  },
  eficacia_profesional: {
    label: "Eficacia profesional percibida",
    bajo: "Percibes poco logro o eficacia en tu trabajo o tus estudios actuales. Esto puede afectar tu motivación y tu bienestar; conversar con el área de bienestar/psicología o con un mentor puede ayudarte a identificar causas y opciones.",
    medio: "Tu percepción de logro y capacidad es moderada; reforzar el reconocimiento de tus propios avances puede ayudarte a sostener la motivación.",
    alto: "Percibes que tu trabajo es valioso y confías en tu capacidad para resolver los desafíos que se te presentan; es un recurso protector importante frente al estrés.",
  },
  ansiedad_estres: {
    label: "Ansiedad y manejo del estrés",
    bajo: "No reportas señales relevantes de ansiedad o tensión asociadas a tu día a día laboral o académico.",
    medio: "Reportas algunas señales de tensión o preocupación; incorporar pausas, actividad física y técnicas de manejo del estrés puede ayudarte a sostener tu bienestar.",
    alto: "Reportas un nivel elevado de ansiedad y tensión relacionada con tu día a día. Te recomendamos buscar apoyo del área de bienestar/psicología para contar con acompañamiento profesional.",
  },
};

export type PuntuacionDimension = { promedio: number; banda: Banda };

export type ResultadoPsicometria = {
  puntuaciones: Record<Dimension, PuntuacionDimension>;
  interpretacion: Record<Dimension, string> & { resumen: string };
  alerta: boolean;
};

export function bandaDe(promedio: number): Banda {
  if (promedio < 2.5) return "bajo";
  if (promedio < 3.75) return "medio";
  return "alto";
}

/** Valida que vengan respuestas 1..5 para todos los ítems del instrumento. */
export function respuestasCompletas(respuestas: unknown): respuestas is Record<string, number> {
  if (!respuestas || typeof respuestas !== "object") return false;
  const r = respuestas as Record<string, unknown>;
  return ITEMS.every((it) => {
    const v = r[it.id];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
  });
}

function esRiesgo(dimension: Dimension, banda: Banda): boolean {
  if (DIMENSIONES_RIESGO_ALTO.includes(dimension)) return banda === "alto";
  if (DIMENSIONES_RIESGO_BAJO.includes(dimension)) return banda === "bajo";
  return false;
}

/** Calcula puntuaciones, interpretación y alerta a partir de respuestas crudas 1..5. */
export function calcularResultado(respuestas: Record<string, number>): ResultadoPsicometria {
  const porDimension = new Map<Dimension, number[]>();
  for (const item of ITEMS) {
    const crudo = respuestas[item.id];
    const valor = item.reverso ? 6 - crudo : crudo;
    const lista = porDimension.get(item.dimension) ?? [];
    lista.push(valor);
    porDimension.set(item.dimension, lista);
  }

  const puntuaciones = {} as Record<Dimension, PuntuacionDimension>;
  const interpretacion = {} as Record<Dimension, string>;
  let dimensionesEnRiesgo = 0;

  porDimension.forEach((valores, dimension) => {
    const promedio = Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 100) / 100;
    const banda = bandaDe(promedio);
    puntuaciones[dimension] = { promedio, banda };
    interpretacion[dimension] = TEXTOS[dimension][banda];
    if (esRiesgo(dimension, banda)) dimensionesEnRiesgo++;
  });

  const alerta = dimensionesEnRiesgo >= 2;
  const resumen = alerta
    ? "Los resultados muestran varias señales de riesgo psicosocial (agotamiento, desconexión, ansiedad o baja eficacia percibida). Te recomendamos conversar con el área de bienestar/psicología de la institución: contar con acompañamiento profesional puede ayudarte a manejar mejor esta etapa."
    : "No se identificaron señales de riesgo psicosocial relevantes en este momento. Este perfil es una foto de autoconocimiento orientada a tu desarrollo laboral, no un diagnóstico clínico.";

  return { puntuaciones, interpretacion: { ...interpretacion, resumen }, alerta };
}

export function etiquetaDimension(dimension: Dimension): string {
  return TEXTOS[dimension].label;
}
