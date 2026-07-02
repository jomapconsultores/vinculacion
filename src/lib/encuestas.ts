// Definiciones compartidas de las encuestas del módulo.
// Alimentan los formularios de respuesta (graduados y empleadores) y el
// tablero de resultados agregados para autoridades / acreditación.

export type TipoEncuesta = "pertinencia" | "satisfaccion_empleador";
export type TipoPregunta = "likert" | "texto";

export type Pregunta = {
  id: string;
  texto: string;
  tipo: TipoPregunta;
};

// Escala Likert 1-5 usada por todas las preguntas tipo "likert".
export const ESCALA_LIKERT: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "Muy en desacuerdo" },
  { valor: 2, etiqueta: "En desacuerdo" },
  { valor: 3, etiqueta: "Neutral" },
  { valor: 4, etiqueta: "De acuerdo" },
  { valor: 5, etiqueta: "Muy de acuerdo" },
];

// Encuesta de PERTINENCIA de la formación — la responden los graduados.
export const PERTINENCIA: Pregunta[] = [
  { id: "pert_insercion", texto: "La formación recibida fue pertinente para tu inserción laboral", tipo: "likert" },
  { id: "pert_competencias", texto: "Las competencias adquiridas responden a las necesidades del mercado", tipo: "likert" },
  { id: "pert_recomendar", texto: "Recomendarías tu carrera a otras personas", tipo: "likert" },
  { id: "pert_primer_empleo", texto: "La universidad te preparó para el primer empleo", tipo: "likert" },
  { id: "pert_practicas", texto: "Las prácticas preprofesionales fueron útiles para tu desempeño", tipo: "likert" },
  { id: "pert_satisfaccion", texto: "Satisfacción general con la formación recibida", tipo: "likert" },
  { id: "pert_sugerencias", texto: "Sugerencias para mejorar la formación", tipo: "texto" },
];

// Encuesta de SATISFACCIÓN — la responden los empleadores sobre los graduados.
export const SATISFACCION_EMPLEADOR: Pregunta[] = [
  { id: "emp_desempeno", texto: "Desempeño general de los graduados contratados", tipo: "likert" },
  { id: "emp_tecnicas", texto: "Dominio de competencias técnicas propias de la carrera", tipo: "likert" },
  { id: "emp_blandas", texto: "Competencias blandas (comunicación, trabajo en equipo, actitud)", tipo: "likert" },
  { id: "emp_adaptacion", texto: "Capacidad de adaptación al puesto de trabajo", tipo: "likert" },
  { id: "emp_recontratar", texto: "Volverías a contratar egresados de esta universidad", tipo: "likert" },
  { id: "emp_valoracion", texto: "Valoración general de los graduados como profesionales", tipo: "likert" },
  { id: "emp_comentarios", texto: "Comentarios y observaciones", tipo: "texto" },
];

export const ENCUESTAS: Record<TipoEncuesta, { titulo: string; preguntas: Pregunta[] }> = {
  pertinencia: { titulo: "Pertinencia de la formación", preguntas: PERTINENCIA },
  satisfaccion_empleador: { titulo: "Satisfacción de empleadores", preguntas: SATISFACCION_EMPLEADOR },
};

export const TIPOS_VALIDOS: TipoEncuesta[] = ["pertinencia", "satisfaccion_empleador"];

// Estructura del cuerpo enviado a POST /api/encuesta.
export type RespuestasEncuesta = Record<string, number | string>;
