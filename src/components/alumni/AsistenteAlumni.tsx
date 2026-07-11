"use client";

// Asistente de actualización de datos para graduados (mobile-first).
// Pasos: 1 verificación (cédula + año) → 2 datos personales → 3 situación
// laboral → 4 títulos → 5 resumen y envío. En los pasos 2–4 el usuario puede
// dictar por voz (transcripción IA) o arrastrar/tomar foto de un documento
// (extracción IA); todo lo sugerido se confirma antes de enviarse.
//
// modo="cuenta": la página server ya verificó la sesión y entrega token +
// datos precargados, así que el paso 1 se omite.

import { useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mic,
  FileUp,
  Plus,
  Trash2,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { GrabadorVoz } from "@/components/alumni/GrabadorVoz";

type TituloForm = {
  titulo: string;
  nivel: string | null;
  instituto: string | null;
  anio: number | null;
  nuevo?: boolean;
};

export type PersonaPrecargada = {
  nombres: string;
  apellidos: string;
  genero: string | null;
  ciudad: string | null;
  ocupacion: string | null;
  cargo: string | null;
  empresa: string | null;
  emailMasked: string | null;
  celularMasked: string | null;
  titulos: TituloForm[];
};

type Sugerencia = { campo: string; etiqueta: string; valor: string };

const NIVELES = [
  { value: "PROFESIONAL", label: "Profesional (pregrado)" },
  { value: "ESPECIALISTA", label: "Especialista" },
  { value: "MAESTRIA", label: "Maestría" },
];

export function AsistenteAlumni({
  modo,
  tokenInicial,
  personaInicial,
}: {
  modo: "publico" | "cuenta";
  tokenInicial?: string;
  personaInicial?: PersonaPrecargada;
}) {
  const [paso, setPaso] = useState(modo === "cuenta" ? 2 : 1);
  const [token, setToken] = useState(tokenInicial ?? "");
  const [persona, setPersona] = useState<PersonaPrecargada | null>(personaInicial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState<null | { aplicado: boolean }>(null);

  // Paso 1
  const [cedula, setCedula] = useState("");
  const [anio, setAnio] = useState("");

  // Campos editables (2 y 3)
  const [genero, setGenero] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");

  // Paso 4
  const [titulos, setTitulos] = useState<TituloForm[]>([]);

  // Trazabilidad del origen de cada campo (manual | voz | documento)
  const [origenCampos, setOrigenCampos] = useState<Record<string, string>>({});

  // Sugerencias de voz/documento pendientes de confirmar
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [titulosSugeridos, setTitulosSugeridos] = useState<TituloForm[]>([]);
  const [transcripcion, setTranscripcion] = useState<string | null>(null);
  const [analizandoDoc, setAnalizandoDoc] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const totalPasos = 5;
  const pasoVisible = modo === "cuenta" ? paso - 1 : paso;
  const totalVisible = modo === "cuenta" ? totalPasos - 1 : totalPasos;

  function precargar(p: PersonaPrecargada) {
    setPersona(p);
    setGenero(p.genero ?? "");
    setCiudad(p.ciudad ?? "");
    setOcupacion(p.ocupacion ?? "");
    setCargo(p.cargo ?? "");
    setEmpresa(p.empresa ?? "");
    setTitulos(p.titulos.map((t) => ({ ...t })));
  }

  // Precarga en modo cuenta (una sola vez, en el primer render con datos).
  useMemo(() => {
    if (personaInicial && !persona) precargar(personaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verificar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/alumni/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula, anio }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || `Error ${res.status}`);
        return;
      }
      setToken(json.token);
      precargar(json.persona);
      setPaso(2);
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setCargando(false);
    }
  }

  function marcarOrigen(campos: string[], origen: string) {
    setOrigenCampos((prev) => {
      const nuevo = { ...prev };
      for (const c of campos) nuevo[c] = origen;
      return nuevo;
    });
  }

  function aplicarSugerencia(s: Sugerencia, origen: string) {
    if (s.campo === "genero") setGenero(s.valor);
    if (s.campo === "email") setEmail(s.valor);
    if (s.campo === "celular") setCelular(s.valor);
    if (s.campo === "ciudad") setCiudad(s.valor);
    if (s.campo === "ocupacion") setOcupacion(s.valor);
    if (s.campo === "cargo") setCargo(s.valor);
    if (s.campo === "empresa") setEmpresa(s.valor);
    marcarOrigen([s.campo], origen);
    setSugerencias((prev) => prev.filter((x) => x !== s));
  }

  function sugerenciasDesde(campos: Record<string, string | null>): Sugerencia[] {
    const etiquetas: Record<string, string> = {
      genero: "Género",
      email: "Correo",
      celular: "Celular",
      ciudad: "Ciudad",
      ocupacion: "Ocupación",
      cargo: "Cargo",
      empresa: "Empresa",
    };
    return Object.entries(campos)
      .filter(([campo, v]) => etiquetas[campo] && v && String(v).trim() !== "")
      .map(([campo, v]) => ({ campo, etiqueta: etiquetas[campo], valor: String(v) }));
  }

  async function procesarAudio(audio: File) {
    setError(null);
    setTranscripcion(null);
    const fd = new FormData();
    fd.append("token", token);
    fd.append("audio", audio);
    const res = await fetch("/api/alumni/voz", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || json.error) {
      setError(json.error || `Error ${res.status}`);
      return;
    }
    setTranscripcion(json.transcripcion);
    const s = json.sugerencias ?? {};
    setSugerencias(sugerenciasDesde(s));
    if (Array.isArray(s.titulos) && s.titulos.length > 0) {
      setTitulosSugeridos(s.titulos.map((t: TituloForm) => ({ ...t, nuevo: true })));
    }
  }

  async function procesarDocumento(archivo: File) {
    setError(null);
    setAnalizandoDoc(true);
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("archivo", archivo);
      const res = await fetch("/api/alumni/documento", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || `Error ${res.status}`);
        return;
      }
      const s = json.sugerencias ?? {};
      if (s.titulo?.titulo) {
        setTitulosSugeridos((prev) => [...prev, { ...s.titulo, nuevo: true }]);
      }
      if (s.experiencia) {
        setSugerencias((prev) => [
          ...prev,
          ...sugerenciasDesde({
            empresa: s.experiencia.empresa,
            cargo: s.experiencia.cargo,
            ocupacion: s.experiencia.ocupacion,
          }),
        ]);
      }
      if (!s.titulo?.titulo && !s.experiencia) {
        setError(
          "El documento se leyó pero no se encontraron datos de títulos ni de trabajo. Puedes llenar los campos manualmente."
        );
      }
    } finally {
      setAnalizandoDoc(false);
    }
  }

  function aceptarTituloSugerido(t: TituloForm) {
    setTitulos((prev) => [...prev, { ...t }]);
    setTitulosSugeridos((prev) => prev.filter((x) => x !== t));
    marcarOrigen(["titulos"], "documento");
  }

  async function enviar() {
    setCargando(true);
    setError(null);
    try {
      const nuevos = titulos.filter((t) => t.nuevo && t.titulo.trim().length >= 3);
      const res = await fetch("/api/alumni/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          datos: {
            genero: genero || null,
            email: email || null,
            celular: celular || null,
            ciudad: ciudad || null,
            ocupacion: ocupacion || null,
            cargo: cargo || null,
            empresa: empresa || null,
          },
          titulos: nuevos.map((t) => ({
            titulo: t.titulo,
            nivel: t.nivel || null,
            instituto: t.instituto || null,
            anio: t.anio ?? null,
          })),
          origen_campos: origenCampos,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || `Error ${res.status}`);
        return;
      }
      setEnviado({ aplicado: !!json.aplicado });
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setCargando(false);
    }
  }

  // ------------------------------------------------------------------
  if (enviado) {
    return (
      <div className="card space-y-3 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
        <h2 className="text-xl font-bold text-slate-900">¡Gracias!</h2>
        <p className="text-slate-600">
          {enviado.aplicado
            ? "Tus datos quedaron actualizados."
            : "Recibimos tus datos. Serán revisados por la universidad antes de publicarse."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalVisible }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < pasoVisible ? "bg-blue-700" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-slate-500">
        Paso {pasoVisible} de {totalVisible}
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Paso 1: verificación */}
      {paso === 1 && (
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Verifica tu identidad</h2>
          <div>
            <label className="label">Cédula</label>
            <input
              className="input text-lg"
              inputMode="numeric"
              maxLength={10}
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
              placeholder="0102030405"
            />
          </div>
          <div>
            <label className="label">Año en que obtuviste uno de tus títulos</label>
            <input
              className="input text-lg"
              inputMode="numeric"
              maxLength={4}
              value={anio}
              onChange={(e) => setAnio(e.target.value.replace(/\D/g, ""))}
              placeholder="2020"
            />
          </div>
          <button
            className="btn-primary w-full py-3 text-base"
            disabled={cedula.length !== 10 || anio.length !== 4 || cargando}
            onClick={verificar}
          >
            {cargando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
            Continuar
          </button>
        </div>
      )}

      {/* Sugerencias pendientes (voz / documento) */}
      {paso >= 2 && (sugerencias.length > 0 || transcripcion) && (
        <div className="card space-y-2 border-violet-200 bg-violet-50/50 p-4">
          {transcripcion && (
            <p className="text-sm text-slate-600">
              <Sparkles className="mr-1 inline h-4 w-4 text-violet-500" />
              Se entendió: <span className="italic">“{transcripcion}”</span>
            </p>
          )}
          {sugerencias.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium text-slate-700">{s.etiqueta}:</span>{" "}
                <span className="text-slate-600">{s.valor}</span>
              </span>
              <button
                className="btn-accent px-3 py-1 text-xs"
                onClick={() => aplicarSugerencia(s, transcripcion ? "voz" : "documento")}
              >
                Usar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Paso 2: datos personales */}
      {paso === 2 && persona && (
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Hola, {persona.nombres.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-slate-500">
            Revisa y actualiza tus datos. Puedes escribir o usar el dictado por voz.
          </p>

          <details className="rounded-xl bg-slate-50 p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-violet-700">
              <Mic className="h-4 w-4" /> Dictar mis datos por voz
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">
                Ejemplo: “Mi correo es juan punto pérez arroba gmail punto com, mi celular es cero
                noventa y nueve…, vivo en Cuenca y trabajo como contador en la empresa X”.
              </p>
              <GrabadorVoz onAudio={procesarAudio} />
            </div>
          </details>

          <div>
            <label className="label">Género</label>
            <select className="input" value={genero} onChange={(e) => setGenero(e.target.value)}>
              <option value="">(sin especificar)</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={persona.emailMasked ?? "tucorreo@ejemplo.com"}
            />
            {persona.emailMasked && !email && (
              <p className="mt-1 text-xs text-slate-400">
                Ya tenemos {persona.emailMasked}; escribe solo si cambió.
              </p>
            )}
          </div>
          <div>
            <label className="label">Celular</label>
            <input
              className="input"
              inputMode="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder={persona.celularMasked ?? "09xxxxxxxx"}
            />
            {persona.celularMasked && !celular && (
              <p className="mt-1 text-xs text-slate-400">
                Ya tenemos {persona.celularMasked}; escribe solo si cambió.
              </p>
            )}
          </div>
          <div>
            <label className="label">Ciudad de residencia</label>
            <input className="input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Cuenca" />
          </div>
        </div>
      )}

      {/* Paso 3: situación laboral */}
      {paso === 3 && (
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">¿A qué te dedicas hoy?</h2>
          <ZonaDocumento
            texto="Arrastra o toma foto de un certificado laboral y llenamos esto por ti"
            analizando={analizandoDoc}
            arrastrando={arrastrando}
            setArrastrando={setArrastrando}
            onArchivo={procesarDocumento}
          />
          <div>
            <label className="label">Ocupación</label>
            <input
              className="input"
              value={ocupacion}
              onChange={(e) => setOcupacion(e.target.value)}
              placeholder="Ej.: médico en hospital público, negocio propio…"
            />
          </div>
          <div>
            <label className="label">Cargo</label>
            <input className="input" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej.: analista contable" />
          </div>
          <div>
            <label className="label">Empresa o institución</label>
            <input className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ej.: Hospital Vicente Corral" />
          </div>
        </div>
      )}

      {/* Paso 4: títulos */}
      {paso === 4 && (
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Tus títulos</h2>
          <ZonaDocumento
            texto="Arrastra o toma foto de un título/diploma y lo añadimos por ti"
            analizando={analizandoDoc}
            arrastrando={arrastrando}
            setArrastrando={setArrastrando}
            onArchivo={procesarDocumento}
          />

          {titulosSugeridos.map((t, i) => (
            <div
              key={`sug-${i}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm"
            >
              <span>
                <GraduationCap className="mr-1 inline h-4 w-4 text-teal-600" />
                {t.titulo}
                {t.instituto ? ` — ${t.instituto}` : ""}
                {t.anio ? ` (${t.anio})` : ""}
              </span>
              <button className="btn-accent px-3 py-1 text-xs" onClick={() => aceptarTituloSugerido(t)}>
                Añadir
              </button>
            </div>
          ))}

          <ul className="space-y-2">
            {titulos.map((t, i) => (
              <li key={i} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{t.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {[t.nivel, t.instituto, t.anio].filter(Boolean).join(" · ") || "—"}
                    {t.nuevo && <span className="ml-1 text-teal-600">(nuevo)</span>}
                  </p>
                </div>
                {t.nuevo && (
                  <button
                    className="btn-ghost p-1"
                    onClick={() => setTitulos((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Quitar"
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <NuevoTitulo onAgregar={(t) => setTitulos((prev) => [...prev, { ...t, nuevo: true }])} />
        </div>
      )}

      {/* Paso 5: resumen */}
      {paso === 5 && (
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Revisa antes de enviar</h2>
          <dl className="space-y-1.5 text-sm">
            {[
              ["Género", genero],
              ["Correo", email || (persona?.emailMasked ? `${persona.emailMasked} (sin cambios)` : "")],
              ["Celular", celular || (persona?.celularMasked ? `${persona.celularMasked} (sin cambios)` : "")],
              ["Ciudad", ciudad],
              ["Ocupación", ocupacion],
              ["Cargo", cargo],
              ["Empresa", empresa],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Títulos nuevos</dt>
              <dd className="text-right font-medium text-slate-800">
                {titulos.filter((t) => t.nuevo).length}
              </dd>
            </div>
          </dl>
          {modo === "publico" && (
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Por seguridad, lo que envíes será revisado por la universidad antes de aplicarse.
            </p>
          )}
          <button className="btn-accent w-full py-3 text-base" disabled={cargando} onClick={enviar}>
            {cargando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Enviar mis datos
          </button>
        </div>
      )}

      {/* Navegación */}
      {paso >= 2 && paso <= totalPasos && (
        <div className="flex justify-between">
          <button
            className="btn-ghost"
            onClick={() => setPaso((p) => Math.max(modo === "cuenta" ? 2 : 1, p - 1))}
            disabled={paso === (modo === "cuenta" ? 2 : 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Atrás
          </button>
          {paso < totalPasos && (
            <button className="btn-primary" onClick={() => setPaso((p) => p + 1)}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------

function ZonaDocumento({
  texto,
  analizando,
  arrastrando,
  setArrastrando,
  onArchivo,
}: {
  texto: string;
  analizando: boolean;
  arrastrando: boolean;
  setArrastrando: (v: boolean) => void;
  onArchivo: (f: File) => void;
}) {
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onArchivo(f);
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 text-sm transition ${
        arrastrando ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50"
      }`}
    >
      <input
        type="file"
        className="hidden"
        accept="image/*,.pdf,.docx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(f);
          e.target.value = "";
        }}
      />
      {analizando ? (
        <>
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-blue-600" />
          <span className="text-slate-600">Leyendo el documento…</span>
        </>
      ) : (
        <>
          <FileUp className="h-6 w-6 shrink-0 text-blue-600" />
          <span className="text-slate-600">{texto}</span>
        </>
      )}
    </label>
  );
}

function NuevoTitulo({ onAgregar }: { onAgregar: (t: Omit<TituloForm, "nuevo">) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [nivel, setNivel] = useState("");
  const [instituto, setInstituto] = useState("");
  const [anio, setAnio] = useState("");

  if (!abierto) {
    return (
      <button className="btn-outline w-full" onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" /> Añadir un título manualmente
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <div>
        <label className="label">Título</label>
        <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Magíster en Salud Pública" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nivel</label>
          <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">(elige)</option>
            {NIVELES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Año</label>
          <input
            className="input"
            inputMode="numeric"
            maxLength={4}
            value={anio}
            onChange={(e) => setAnio(e.target.value.replace(/\D/g, ""))}
            placeholder="2023"
          />
        </div>
      </div>
      <div>
        <label className="label">Institución</label>
        <input className="input" value={instituto} onChange={(e) => setInstituto(e.target.value)} placeholder="Universidad de Cuenca" />
      </div>
      <div className="flex gap-2">
        <button
          className="btn-accent flex-1"
          disabled={titulo.trim().length < 3}
          onClick={() => {
            onAgregar({
              titulo: titulo.trim(),
              nivel: nivel || null,
              instituto: instituto.trim() || null,
              anio: anio ? parseInt(anio, 10) : null,
            });
            setTitulo("");
            setNivel("");
            setInstituto("");
            setAnio("");
            setAbierto(false);
          }}
        >
          Añadir
        </button>
        <button className="btn-ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
