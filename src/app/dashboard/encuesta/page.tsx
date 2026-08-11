"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PERTINENCIA,
  ESCALA_LIKERT,
  type RespuestasEncuesta,
} from "@/lib/encuestas";
import { useBorrador } from "@/hooks/useBorrador";
import AvisoBorrador from "@/components/AvisoBorrador";
import { ClipboardList, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function EncuestaPertinenciaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Las respuestas se guardan en el dispositivo mientras se responden. Antes
  // vivían solo en memoria y el envío es todo-o-nada: bastaba una recarga, un
  // corte de internet o el cierre de sesión por inactividad para perder una
  // encuesta entera a medio contestar.
  //
  // La clave lleva el id del usuario, así que en un equipo compartido nadie ve
  // lo que empezó a escribir otro. Hasta conocerlo, la clave es null y no se
  // guarda nada.
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const claveBorrador = usuarioId ? `borrador:encuesta:pertinencia:${usuarioId}` : null;
  const [respuestas, setRespuestas, borrador] = useBorrador<RespuestasEncuesta>(
    claveBorrador,
    {},
  );

  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yaRespondio, setYaRespondio] = useState(false);

  // Verifica sesión y si ya respondió antes (informativo, permite reenviar).
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUsuarioId(user.id);
      const { data } = await supabase
        .from("encuestas_respuestas")
        .select("id")
        .eq("profile_id", user.id)
        .eq("tipo", "pertinencia")
        .limit(1);
      setYaRespondio((data?.length ?? 0) > 0);
    })();
  }, [supabase, router]);

  const likert = PERTINENCIA.filter((p) => p.tipo === "likert");
  const abiertas = PERTINENCIA.filter((p) => p.tipo === "texto");
  const completas = likert.every((p) => respuestas[p.id] != null);

  function setValor(id: string, valor: number | string) {
    setRespuestas((prev) => ({ ...prev, [id]: valor }));
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/encuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "pertinencia", respuestas }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo registrar la encuesta");
      // Ya está a salvo en el servidor: se retira el borrador para que
      // «Responder de nuevo» empiece en blanco y no reviva lo ya enviado.
      borrador.descartar();
      setOk(true);
      setYaRespondio(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error");
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-teal-600" />
          <h1 className="text-xl font-bold text-slate-900">
            ¡Gracias! Tu respuesta fue registrada
          </h1>
          <p className="text-slate-500">
            Tu opinión sobre la pertinencia de tu formación alimenta los procesos de mejora
            continua y acreditación de la universidad.
          </p>
          <button
            className="btn-outline mt-2"
            onClick={() => {
              setOk(false);
              setRespuestas({});
            }}
          >
            Responder de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <span className="badge bg-blue-50 text-blue-900">
          <ClipboardList className="h-4 w-4" /> Encuesta a graduados
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Pertinencia de la formación
        </h1>
        <p className="mt-1 text-slate-500">
          Cuéntanos qué tan pertinente fue tu formación para tu vida profesional. Tus respuestas
          son confidenciales y se usan de forma agregada.
        </p>
      </header>

      {yaRespondio && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Ya registraste una respuesta anteriormente. Puedes enviar una nueva si lo deseas.</p>
        </div>
      )}

      <AvisoBorrador estado={borrador} onDescartar={() => setRespuestas({})} />

      <section className="card space-y-6 p-6">
        {likert.map((p, i) => (
          <div key={p.id}>
            <p className="label mb-2">
              {i + 1}. {p.texto}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {ESCALA_LIKERT.map((op) => {
                const activo = respuestas[p.id] === op.valor;
                return (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setValor(p.id, op.valor)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
                      activo
                        ? "border-teal-600 bg-teal-50 text-teal-700"
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

        {abiertas.map((p) => (
          <div key={p.id}>
            <label className="label mb-2 block" htmlFor={p.id}>
              {p.texto}
            </label>
            <textarea
              id={p.id}
              className="input min-h-[90px]"
              value={(respuestas[p.id] as string) ?? ""}
              onChange={(e) => setValor(p.id, e.target.value)}
              placeholder="Escribe aquí (opcional)"
            />
          </div>
        ))}
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={enviar} disabled={enviando || !completas}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
          Enviar respuestas
        </button>
        {!completas && (
          <span className="text-sm text-slate-400">
            Responde todas las preguntas de escala para continuar.
          </span>
        )}
      </div>
    </div>
  );
}
