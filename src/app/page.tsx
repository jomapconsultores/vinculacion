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
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Ingresar</Link>
            <Link href="/register" className="btn-primary">Crear cuenta</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-blue-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <span className="badge bg-white/10 text-teal-200">Vinculación con la sociedad · Acreditación</span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-balance md:text-5xl">
            La plataforma que conecta a tus graduados con el empleo, la formación y el impacto
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-blue-100">
            Una base de datos viva de personas e instituciones que integra seguimiento a graduados,
            empleabilidad asistida por inteligencia artificial y monitoreo de servicios comunitarios,
            con indicadores auditables para acreditación.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-accent px-6 py-3 text-base">
              Empezar ahora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/empleos" className="btn-outline border-white/30 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">
              Ver bolsa de empleo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">Cuatro pilares, una sola base de datos</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-500">
          Arquitectura modular: cada pilar es autónomo, pero comparte el mismo registro de personas e
          instituciones para evitar duplicación de información.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pilares.map((p) => (
            <div key={p.titulo} className="card card-hover p-6">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${p.color}`}>
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900">{p.titulo}</h3>
              <p className="mt-2 text-sm text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Del aula al empleo, con IA</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-slate-500">
            El graduado recorre un camino guiado; la universidad avala cada competencia adquirida.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {flujo.map((s, i) => (
              <div key={s.t} className="relative rounded-xl border border-slate-200 p-5">
                <span className="absolute -top-3 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <s.icon className="mb-3 mt-2 h-6 w-6 text-teal-600" />
                <h3 className="font-semibold text-slate-900">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="card flex flex-col items-center gap-4 bg-gradient-to-r from-teal-600 to-teal-500 p-10 text-center text-white md:flex-row md:text-left">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">¿Eres empleador?</h2>
            <p className="mt-1 text-teal-50">
              Publica ofertas y deja que la IA rankee a los candidatos avalados por la universidad según tu perfil.
            </p>
          </div>
          <Link href="/register?rol=empleador" className="btn bg-white px-6 py-3 text-teal-700 hover:bg-teal-50">
            Registrar empresa
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-400">
          Proyecto Conecta — Demo de vinculación con graduados
        </div>
      </footer>
    </div>
  );
}
