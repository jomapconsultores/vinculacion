"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CVAnalisis, Capacitacion } from "@/lib/cv-types";
import {
  Upload, FileText, Award, GraduationCap, Sparkles, Loader2, FileDown,
  Briefcase, BadgeCheck, Lightbulb, Image as ImageIcon, Compass, X, UserCheck, ArrowRight,
  CalendarDays, Layers, AlertTriangle,
} from "lucide-react";

type PerfilInfo = { experiencia: number; educacion: number; habilidades: number };

// Ordena capacitaciones por año, de más reciente a más antiguo (sin año al final).
function ordenarPorFecha(items: Capacitacion[]): Capacitacion[] {
  return [...items].sort((a, b) => (b.anio ?? -1) - (a.anio ?? -1));
}

// Agrupa por categoría (grupos parecidos) y ordena cada grupo por fecha.
function agruparPorTipo(items: Capacitacion[]): { categoria: string; items: Capacitacion[] }[] {
  const mapa = new Map<string, Capacitacion[]>();
  for (const c of items) {
    const cat = (c.categoria && c.categoria.trim()) || "Otros";
    if (!mapa.has(cat)) mapa.set(cat, []);
    mapa.get(cat)!.push(c);
  }
  return Array.from(mapa.entries())
    .map(([categoria, its]) => ({ categoria, items: ordenarPorFecha(its) }))
    .sort((a, b) => {
      if (a.categoria === "Otros") return 1;
      if (b.categoria === "Otros") return -1;
      return a.categoria.localeCompare(b.categoria, "es");
    });
}

export default function AnalizarPage() {
  const [cv, setCv] = useState<File | null>(null);
  const [certs, setCerts] = useState<File[]>([]);
  const [foto, setFoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState<null | "word" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<CVAnalisis | null>(null);
  const [perfilInfo, setPerfilInfo] = useState<PerfilInfo | null>(null);
  const [truncado, setTruncado] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const cvRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  // Agrega certificados (PDF o imágenes) evitando duplicados por nombre+tamaño.
  function agregarCerts(files: FileList | File[] | null) {
    const nuevos = Array.from(files ?? []).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/") || /\.pdf$/i.test(f.name)
    );
    if (!nuevos.length) return;
    setCerts((prev) => {
      const clave = (f: File) => `${f.name}|${f.size}`;
      const vistos = new Set(prev.map(clave));
      return [...prev, ...nuevos.filter((f) => !vistos.has(clave(f)))];
    });
  }

  async function analizar(e: React.FormEvent) {
    e.preventDefault();
    if (!cv) return setError("Selecciona tu hoja de vida.");
    setError(null);
    setLoading(true);
    setAnalisis(null);
    try {
      const fd = new FormData();
      fd.append("cv", cv);
      certs.forEach((c) => fd.append("certificados", c));
      if (foto) fd.append("foto", foto);
      const r = await fetch("/api/cv/analizar", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error al analizar");
      setAnalisis(j.analisis);
      setPerfilInfo(j.perfil_actualizado ?? null);
      setTruncado(!!j.truncado);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function descargar(formato: "word" | "pdf") {
    if (!analisis) return;
    setDescargando(formato);
    try {
      const r = await fetch("/api/cv/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formato, cv: analisis }),
      });
      if (!r.ok) throw new Error("No se pudo generar el archivo");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = formato === "word" ? "hoja-de-vida.docx" : "hoja-de-vida.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    }
    setDescargando(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analizador de Hoja de Vida con IA</h1>
        <p className="mt-1 text-slate-500">
          Sube tu CV (PDF, Word o Excel) y tus certificados. La IA lee los documentos, estandariza tu
          hoja de vida, detecta tus capacitaciones y determina tu perfil profesional según las áreas UNESCO.
        </p>
      </div>

      {/* Formulario de subida */}
      <form onSubmit={analizar} className="card space-y-5 p-6">
        <div className="grid gap-5 md:grid-cols-3">
          {/* CV */}
          <div className="md:col-span-2">
            <label className="label">Hoja de vida (PDF, Word o Excel) *</label>
            <div
              onClick={() => cvRef.current?.click()}
              className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-4 hover:border-blue-400"
            >
              <Upload className="h-6 w-6 text-slate-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {cv ? cv.name : "Haz clic para seleccionar tu CV"}
                </p>
                <p className="text-xs text-slate-400">PDF, DOCX, XLSX</p>
              </div>
            </div>
            <input
              ref={cvRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.doc,image/*"
              className="hidden"
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Foto */}
          <div>
            <label className="label">Foto (opcional)</label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-4 hover:border-blue-400">
              <ImageIcon className="h-6 w-6 text-slate-400" />
              <span className="truncate text-sm text-slate-600">{foto ? foto.name : "Subir foto"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        {/* Certificados */}
        <div>
          <label className="label">Certificados (opcional, varios PDF/imágenes)</label>
          <div
            onClick={() => certRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={(e) => { e.preventDefault(); setArrastrando(false); }}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); agregarCerts(e.dataTransfer.files); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-5 text-center transition ${
              arrastrando ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400"
            }`}
          >
            <Award className="h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">
              Arrastra aquí tus certificados o haz clic para seleccionarlos
            </p>
            <p className="text-xs text-slate-400">Puedes soltar varios PDF o imágenes a la vez</p>
          </div>
          <input
            ref={certRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            className="hidden"
            onChange={(e) => { agregarCerts(e.target.files); e.target.value = ""; }}
          />
          {certs.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs text-slate-500">{certs.length} certificado(s) listo(s)</p>
                <button type="button" onClick={() => setCerts([])} className="text-xs text-slate-400 hover:text-red-500">
                  Quitar todos
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {certs.map((c, i) => (
                  <span key={`${c.name}-${c.size}-${i}`} className="badge bg-slate-100 text-slate-600">
                    {c.name}
                    <button type="button" onClick={() => setCerts(certs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <button className="btn-primary" disabled={loading || !cv}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Leyendo y analizando documentos…" : "Analizar con IA"}
        </button>
        {loading && (
          <p className="text-xs text-slate-400">
            Esto puede tardar hasta un minuto: la IA está leyendo (OCR) tu CV y certificados.
          </p>
        )}
      </form>

      {analisis && perfilInfo && (perfilInfo.experiencia + perfilInfo.educacion + perfilInfo.habilidades > 0) && (
        <div className="card flex flex-col items-start gap-3 border-teal-300 bg-teal-50 p-5 sm:flex-row sm:items-center">
          <UserCheck className="h-6 w-6 shrink-0 text-teal-600" />
          <div className="flex-1">
            <p className="font-medium text-teal-900">Tu perfil se actualizó automáticamente con el documento</p>
            <p className="text-sm text-teal-700">
              Se agregaron{" "}
              {[
                perfilInfo.experiencia ? `${perfilInfo.experiencia} experiencia(s)` : null,
                perfilInfo.educacion ? `${perfilInfo.educacion} formación(es)` : null,
                perfilInfo.habilidades ? `${perfilInfo.habilidades} habilidad(es)` : null,
              ].filter(Boolean).join(", ")}. Tu identidad verificada no se modifica.
            </p>
          </div>
          <Link href="/dashboard/perfil" className="btn-accent shrink-0">
            Ver mi perfil <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {analisis && truncado && (
        <div className="card flex items-start gap-3 border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Tu hoja de vida o certificados eran muy extensos: la IA solo analizó una parte del texto.
            Si notas información faltante, resume el documento y vuelve a intentarlo.
          </p>
        </div>
      )}

      {analisis && <Resultado analisis={analisis} onDescargar={descargar} descargando={descargando} />}
    </div>
  );
}

function Seccion({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">{icon} {titulo}</h2>
      {children}
    </section>
  );
}

function CapCard({ c }: { c: Capacitacion }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{c.nombre}</p>
        <p className="text-xs text-slate-500">
          {[c.institucion, c.horas ? `${c.horas} h` : null, c.anio].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {c.categoria && <span className="badge bg-teal-50 text-teal-700">{c.categoria}</span>}
        {c.fuente && <span className="badge bg-slate-100 text-slate-500">{c.fuente}</span>}
      </div>
    </div>
  );
}

function CapacitacionesSeccion({ capacitaciones }: { capacitaciones: Capacitacion[] }) {
  const [modo, setModo] = useState<"fecha" | "tipo">("fecha");

  const boton = (valor: "fecha" | "tipo", icono: React.ReactNode, texto: string) => (
    <button
      type="button"
      onClick={() => setModo(valor)}
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
        modo === valor ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
      }`}
    >
      {icono} {texto}
    </button>
  );

  return (
    <Seccion icon={<GraduationCap className="h-5 w-5 text-teal-600" />} titulo="Capacitaciones detectadas">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Clasificar:</span>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          {boton("fecha", <CalendarDays className="h-3.5 w-3.5" />, "Por fecha")}
          {boton("tipo", <Layers className="h-3.5 w-3.5" />, "Por tipo")}
        </div>
      </div>

      {modo === "fecha" ? (
        <div className="space-y-2">
          {ordenarPorFecha(capacitaciones).map((c, i) => <CapCard key={i} c={c} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {agruparPorTipo(capacitaciones).map((g) => (
            <div key={g.categoria}>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Layers className="h-3.5 w-3.5" /> {g.categoria}
                <span className="text-slate-300">({g.items.length})</span>
              </h3>
              <div className="space-y-2">
                {g.items.map((c, i) => <CapCard key={i} c={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Seccion>
  );
}

function Resultado({
  analisis,
  onDescargar,
  descargando,
}: {
  analisis: CVAnalisis;
  onDescargar: (f: "word" | "pdf") => void;
  descargando: null | "word" | "pdf";
}) {
  const a = analisis;
  return (
    <div className="space-y-5">
      {/* Encabezado + descargas */}
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        {a.foto_url ? (
          <Image src={a.foto_url} alt="Foto" width={72} height={72} className="h-18 w-18 rounded-full object-cover" unoptimized />
        ) : null}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">{a.datos?.nombre || "Tu hoja de vida"}</h2>
          <p className="text-sm text-slate-500">
            {[a.datos?.email, a.datos?.telefono, a.datos?.ciudad].filter(Boolean).join(" · ")}
          </p>
          {a.nivel_profesional && <span className="badge mt-1 bg-blue-50 text-blue-700">Nivel: {a.nivel_profesional}</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => onDescargar("word")} disabled={descargando !== null}>
            {descargando === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Word
          </button>
          <button className="btn-primary" onClick={() => onDescargar("pdf")} disabled={descargando !== null}>
            {descargando === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
          </button>
        </div>
      </div>

      {/* Perfil UNESCO */}
      {a.perfil_unesco?.area_principal && (
        <div className="card bg-gradient-to-r from-blue-950 to-blue-900 p-6 text-white">
          <h2 className="flex items-center gap-2 font-semibold text-teal-200">
            <Compass className="h-5 w-5" /> Perfil profesional — Áreas UNESCO
          </h2>
          <p className="mt-3 text-2xl font-bold">
            {a.perfil_unesco.area_principal.codigo} · {a.perfil_unesco.area_principal.nombre}
          </p>
          <p className="mt-1 text-sm text-blue-100">{a.perfil_unesco.area_principal.justificacion}</p>
          {a.perfil_unesco.areas_secundarias?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.perfil_unesco.areas_secundarias.map((s, i) => (
                <span key={i} className="badge bg-white/10 text-teal-100">{s.codigo} · {s.nombre}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resumen */}
      {a.resumen && (
        <Seccion icon={<FileText className="h-5 w-5 text-blue-700" />} titulo="Perfil profesional">
          <p className="text-sm leading-relaxed text-slate-700">{a.resumen}</p>
        </Seccion>
      )}

      {/* Capacitaciones (clasificables por fecha o por tipo) */}
      {a.capacitaciones?.length > 0 && <CapacitacionesSeccion capacitaciones={a.capacitaciones} />}

      {/* Certificaciones */}
      {a.certificaciones_detectadas?.length > 0 && (
        <Seccion icon={<BadgeCheck className="h-5 w-5 text-violet-600" />} titulo="Certificaciones (de tus certificados)">
          <div className="flex flex-wrap gap-2">
            {a.certificaciones_detectadas.map((c, i) => (
              <span key={i} className="badge bg-violet-50 text-violet-700">
                {c.nombre}{c.emisor ? ` — ${c.emisor}` : ""}
              </span>
            ))}
          </div>
        </Seccion>
      )}

      {/* Experiencia */}
      {a.experiencia?.length > 0 && (
        <Seccion icon={<Briefcase className="h-5 w-5 text-teal-600" />} titulo="Experiencia">
          <div className="space-y-4">
            {a.experiencia.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <p className="font-medium text-slate-800">{e.cargo}</p>
                  <span className="text-xs text-slate-400">{e.periodo}</span>
                </div>
                <p className="text-sm text-slate-500">{e.empresa}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                  {e.logros?.map((l, j) => <li key={j}>{l}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {/* Educación */}
      {a.educacion?.length > 0 && (
        <Seccion icon={<GraduationCap className="h-5 w-5 text-blue-700" />} titulo="Educación">
          <div className="space-y-2">
            {a.educacion.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between">
                <div><p className="font-medium text-slate-800">{e.titulo}</p><p className="text-sm text-slate-500">{e.institucion}</p></div>
                <span className="text-xs text-slate-400">{e.periodo}</span>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {/* Habilidades */}
      {a.habilidades?.length > 0 && (
        <Seccion icon={<Sparkles className="h-5 w-5 text-violet-600" />} titulo="Habilidades">
          <div className="flex flex-wrap gap-2">
            {a.habilidades.map((h, i) => <span key={i} className="badge bg-slate-100 text-slate-600">{h}</span>)}
          </div>
        </Seccion>
      )}

      {/* Recomendaciones */}
      {a.recomendaciones?.length > 0 && (
        <div className="card border-teal-200 bg-teal-50/50 p-6">
          <h2 className="flex items-center gap-2 font-semibold text-teal-800"><Lightbulb className="h-5 w-5" /> Recomendaciones para tu CV</h2>
          <ul className="mt-3 space-y-2 text-sm text-teal-900">
            {a.recomendaciones.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
