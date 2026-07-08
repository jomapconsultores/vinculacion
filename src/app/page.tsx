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

      {/* Flujo: pasos numerados, compactos. */}
      <section className="border-y border-slate-200/70 bg-white py-14">
        <div className="mx-auto max-w-5xl px-5">
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
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-5 text-center text-sm text-slate-400">
          <Logo size="sm" />
        </div>
      </footer>
    </div>
  );
}
