import Link from "next/link";
import {
  GraduationCap,
  Briefcase,
  HeartHandshake,
  BarChart3,
  ShieldCheck,
  FileText,
  Sparkles,
  ArrowRight,
  Check,
  BadgeCheck,
  IdCard,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const pilares = [
  {
    icon: GraduationCap,
    titulo: "Alumni — Seguimiento a Graduados",
    desc: "Registro único e identidad verificada del egresado, trayectoria profesional viva y comunidad de exalumnos.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Briefcase,
    titulo: "Inserción Laboral",
    desc: "Bolsa de empleo con empresas validadas, postulaciones con match de competencias por IA y ferias de empleo.",
    color: "bg-teal-50 text-teal-700",
  },
  {
    icon: HeartHandshake,
    titulo: "Servicios Comunitarios",
    desc: "Monitoreo académico–financiero de los 16 servicios: horas docentes vs. atención real y prácticas preprofesionales.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: BarChart3,
    titulo: "Trazabilidad e Indicadores",
    desc: "Consolidación de indicadores de acreditación, tableros para autoridades y trazabilidad del estudiante al empleador.",
    color: "bg-violet-50 text-violet-700",
  },
];

const flujo = [
  { icon: ShieldCheck, t: "Registro verificado", d: "Confirmas tu correo y con tu cédula el sistema autollena nombre, carrera y título desde el padrón institucional." },
  { icon: FileText, t: "CV inteligente", d: "La IA redacta y mejora tu hoja de vida a partir de tu experiencia real." },
  { icon: Sparkles, t: "Match de competencias", d: "Al postular, la IA evalúa si cumples el perfil y sugiere cursos de educación continua para cerrar brechas." },
  { icon: GraduationCap, t: "Competencia avalada", d: "Al aprobar el curso, la universidad avala tu competencia y quedas habilitado para el empleo." },
];

// Todo lo que incluye el sistema, por tipo de usuario.
const audiencias = [
  {
    icon: GraduationCap,
    color: "bg-blue-50 text-blue-700",
    titulo: "Graduados y estudiantes",
    resumen: "Del perfil verificado al empleo, con IA de acompañante.",
    items: [
      "Registro con identidad verificada (cédula, padrón y SENESCYT)",
      "Perfil profesional: experiencia, formación, publicaciones y documentos",
      "CV inteligente: la IA lo redacta, mejora y analiza",
      "Bolsa de empleo con match de competencias por IA",
      "Competencias avaladas por la universidad",
      "Educación continua para cerrar brechas detectadas",
      "Prácticas preprofesionales (estudiantes)",
      "Encuesta de pertinencia y evaluación psicométrica",
    ],
  },
  {
    icon: Briefcase,
    color: "bg-teal-50 text-teal-700",
    titulo: "Empleadores",
    resumen: "Publica y deja que la IA ordene el talento avalado.",
    items: [
      "Registro y validación de la empresa por la universidad",
      "Publicación y gestión de ofertas de empleo",
      "Ranking de candidatos por IA según tu perfil",
      "Seguimiento de postulaciones por estado",
      "Retroalimentación a los candidatos",
      "Encuesta a empleadores para medir pertinencia",
    ],
  },
  {
    icon: BarChart3,
    color: "bg-violet-50 text-violet-700",
    titulo: "Autoridades y administración",
    resumen: "Evidencia auditable para acreditación, en un tablero.",
    items: [
      "Tablero institucional con trazabilidad longitudinal",
      "Empleabilidad por carrera y brechas de competencias",
      "Monitoreo académico–financiero de servicios comunitarios",
      "Revisión y aval de cursos y competencias",
      "Encuestas de pertinencia y evaluación psicométrica",
      "Expedientes de personas y documentos",
      "Gestión de usuarios, roles y permisos por módulo",
      "Informe PDF listo para acreditación",
    ],
  },
];

const identidad = [
  { icon: IdCard, t: "Cédula validada", d: "Verificación del dígito de la cédula ecuatoriana (módulo 10): filtra números inventados o mal leídos." },
  { icon: ShieldCheck, t: "Padrón institucional", d: "Autollenado de nombre, carrera y año de graduación desde el registro oficial de la universidad." },
  { icon: BadgeCheck, t: "Títulos SENESCYT", d: "Contraste con los títulos registrados en SENESCYT para respaldar la identidad del graduado." },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Logo />
          <nav className="flex items-center gap-1.5">
            <Link href="/login" className="btn-ghost">Ingresar</Link>
            <Link href="/register" className="btn-primary">Crear cuenta</Link>
          </nav>
        </div>
      </header>

      {/* Hero: contenido, no monumental. Gradiente azul con un leve resplandor. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 to-blue-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ backgroundImage: "radial-gradient(36rem 22rem at 78% -10%, rgba(96,165,250,0.22), transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-5xl px-5 py-16 md:py-20">
          <span className="badge bg-white/10 text-blue-100 ring-1 ring-inset ring-white/15">
            Vinculación con la sociedad · Acreditación
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight text-balance md:text-[2.6rem]">
            Conectamos a tus graduados con el empleo, la formación y el impacto
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-blue-100/90">
            Una base de datos viva de personas e instituciones que integra seguimiento a graduados,
            empleabilidad asistida por IA y monitoreo de servicios comunitarios, con indicadores
            auditables para acreditación.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link href="/register" className="btn-accent px-5">
              Empezar ahora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/empleos" className="btn-outline border-white/25 bg-white/10 px-5 text-white hover:bg-white/20 hover:border-white/40">
              Ver bolsa de empleo
            </Link>
          </div>
        </div>
      </section>

      {/* Pilares: tarjetas medianas y elegantes. */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Cuatro pilares, una sola base de datos</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Arquitectura modular: cada pilar es autónomo, pero comparte el mismo registro de personas
            e instituciones para evitar duplicación de información.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pilares.map((p) => (
            <div key={p.titulo} className="card card-hover p-5">
              <div className={`mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${p.color}`}>
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-900">{p.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Todo lo que incluye el sistema, por tipo de usuario. */}
      <section className="border-y border-slate-200/70 bg-white py-14">
        <div className="mx-auto max-w-5xl px-5">
          <div className="max-w-2xl">
            <span className="badge bg-blue-50 text-blue-700">Todo en una plataforma</span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Qué incluye el sistema</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Un mismo registro sirve a tres públicos. Cada uno ve solo lo suyo, con permisos por
              módulo y trazabilidad de punta a punta.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {audiencias.map((a) => (
              <div key={a.titulo} className="card flex flex-col p-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${a.color}`}>
                  <a.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3.5 text-base font-semibold text-slate-900">{a.titulo}</h3>
                <p className="mt-1 text-sm text-slate-500">{a.resumen}</p>
                <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                  {a.items.map((it) => (
                    <li key={it} className="flex gap-2.5 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                      <span className="leading-snug">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flujo IA: pasos numerados, compactos. */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Del aula al empleo, con IA</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            El graduado recorre un camino guiado; la universidad avala cada competencia adquirida.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flujo.map((s, i) => (
            <div key={s.t} className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <span className="absolute -top-3 left-5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-900 text-[11px] font-bold text-white ring-2 ring-white">
                {i + 1}
              </span>
              <s.icon className="mb-2.5 mt-1.5 h-5 w-5 text-teal-600" />
              <h3 className="text-[15px] font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Identidad verificada: confianza. */}
      <section className="border-t border-slate-200/70 bg-white py-14">
        <div className="mx-auto max-w-5xl px-5">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900">Identidad verificada, datos confiables</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Cada persona entra con una identidad comprobada en tres capas, para que los indicadores
              de acreditación se apoyen en datos reales.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {identidad.map((v) => (
              <div key={v.t} className="card card-hover p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-black/5">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900">{v.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA empleador: mediano. */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="card flex flex-col items-start gap-4 bg-gradient-to-r from-teal-600 to-teal-500 p-7 text-white sm:flex-row sm:items-center sm:justify-between md:p-8">
          <div>
            <h2 className="text-xl font-bold">¿Eres empleador?</h2>
            <p className="mt-1 max-w-lg text-sm text-teal-50">
              Publica ofertas y deja que la IA rankee a los candidatos avalados por la universidad según tu perfil.
            </p>
          </div>
          <Link href="/register?rol=empleador" className="btn shrink-0 bg-white text-teal-700 shadow-sm hover:bg-teal-50">
            Registrar empresa
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-7">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-5">
          <Logo size="sm" />
        </div>
      </footer>
    </div>
  );
}
