"use client";

import { useState } from "react";
import { ITEMS, ESCALA, SECCIONES, type Seccion, type ResultadoPsicometria } from "@/lib/psicometria";
import { InformePsicometrico } from "@/components/InformePsicometrico";
import { Brain, ShieldCheck, Loader2, AlertCircle, History } from "lucide-react";

type Respuestas = Record<string, number>;

export type ResultadoGuardado = ResultadoPsicometria & {
  id: number;
  created_at: string;
};

const SECCIONES_ORDEN: Seccion[] = ["personalidad", "bienestar", "ansiedad"];

// La autenticación ya la garantiza dashboard/layout.tsx (requireProfile())
// antes de que esta página se renderice, y el historial llega resuelto
// desde el server component padre: no hace falta un tercer chequeo de
// identidad ni un round-trip aparte al montar el componente.
export default function PsicometriaForm({ historialInicial }: { historialInicial: ResultadoGuardado[] }) {
  const [aceptado, setAceptado] = useState(false);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultadoActual, setResultadoActual] = useState<ResultadoGuardado | null>(null);
  const [historial, setHistorial] = useState<ResultadoGuardado[]>(historialInicial);

  const completas = ITEMS.every((it) => respuestas[it.id] != null);

  function setValor(id: string, valor: number) {
    setRespuestas((prev) => ({ ...prev, [id]: valor }));
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/psicometria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error ?? "No se pudo registrar la prueba");
      setResultadoActual(json.resultado);
      setHistorial((prev) => [json.resultado, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setResultadoActual(null);
    setRespuestas({});
    setAceptado(false);
  }

  if (resultadoActual) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <span className="badge bg-indigo-50 text-indigo-700">
            <Brain className="h-4 w-4" /> Perfil Psicolaboral
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Tu informe</h1>
          <p className="mt-1 text-slate-500">
            Resultado registrado el{" "}
            {new Date(resultadoActual.created_at).toLocaleDateString("es-EC", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        </header>
        <InformePsicometrico
          puntuaciones={resultadoActual.puntuaciones}
          interpretacion={resultadoActual.interpretacion}
          alerta={resultadoActual.alerta}
        />
        <button className="btn-outline" onClick={reiniciar}>
          Volver a rendir la prueba
        </button>
      </div>
    );
  }

  if (!aceptado) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <span className="badge bg-indigo-50 text-indigo-700">
            <Brain className="h-4 w-4" /> Evaluación voluntaria
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Perfil Psicolaboral</h1>
          <p className="mt-1 text-slate-500">
            Un autoreporte de {ITEMS.length} preguntas (10-12 min) sobre rasgos de personalidad
            orientados al trabajo y bienestar psicosocial, pensado para tu autoconocimiento y
            desarrollo profesional.
          </p>
        </header>

        <div className="card space-y-4 p-6 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <p>
              Es <strong>totalmente voluntaria</strong>: puedes hacerla cuando quieras y repetirla más
              adelante si lo deseas. No afecta tu postulación a empleos ni es visible para empleadores
              ni para otros graduados.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p>
              Tu resultado <strong>sí es visible para las autoridades y el administrador</strong> de la
              plataforma, con el fin de ofrecerte acompañamiento institucional (bienestar
              universitario) cuando el resultado sugiera que puede ser útil.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p>
              Es una herramienta de <strong>autoconocimiento y orientación</strong>, no un diagnóstico
              clínico. Si atraviesas una crisis o necesitas apoyo inmediato, acude directamente al
              servicio de bienestar/psicología de la institución.
            </p>
          </div>
        </div>

        <button className="btn-primary" onClick={() => setAceptado(true)}>
          Entiendo, quiero comenzar
        </button>

        {historial.length > 0 && (
          <div className="card p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <History className="h-4 w-4" /> Intentos anteriores
            </p>
            <ul className="space-y-1 text-sm text-slate-500">
              {historial.map((h) => (
                <li key={h.id} className="flex items-center justify-between">
                  <span>{new Date(h.created_at).toLocaleDateString("es-EC")}</span>
                  <button className="text-blue-800 hover:underline" onClick={() => setResultadoActual(h)}>
                    Ver informe
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <span className="badge bg-indigo-50 text-indigo-700">
          <Brain className="h-4 w-4" /> Perfil Psicolaboral
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Responde con sinceridad</h1>
        <p className="mt-1 text-slate-500">
          No hay respuestas correctas o incorrectas. Elige la opción que más se acerque a cómo te has
          sentido o comportado últimamente.
        </p>
      </header>

      {SECCIONES_ORDEN.map((seccion) => {
        const items = ITEMS.filter((it) => it.seccion === seccion);
        const { titulo, descripcion } = SECCIONES[seccion];
        return (
          <section key={seccion} className="card space-y-6 p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
              <p className="text-sm text-slate-500">{descripcion}</p>
            </div>
            {items.map((it, i) => (
              <div key={it.id}>
                <p className="label mb-2">
                  {i + 1}. {it.texto}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {ESCALA.map((op) => {
                    const activo = respuestas[it.id] === op.valor;
                    return (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => setValor(it.id, op.valor)}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
                          activo
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-lg font-bold">{op.valor}</span>
                        <span className="text-[10px] leading-tight">{op.etiqueta}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={enviar} disabled={enviando || !completas}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Ver mi informe
        </button>
        {!completas && (
          <span className="text-sm text-slate-400">Responde todas las preguntas para continuar.</span>
        )}
      </div>
    </div>
  );
}
