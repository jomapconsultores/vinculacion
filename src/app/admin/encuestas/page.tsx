import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  PERTINENCIA,
  SATISFACCION_EMPLEADOR,
  type Pregunta,
  type TipoEncuesta,
} from "@/lib/encuestas";
import { GraduationCap, Building2, MessageSquareText, ShieldCheck, BarChart3 } from "lucide-react";

type Respuesta = {
  id: string;
  tipo: TipoEncuesta;
  respuestas: Record<string, number | string> | null;
  created_at: string;
};

type ResumenPregunta = {
  pregunta: Pregunta;
  promedio: number;
  n: number;
};

function promediosLikert(preguntas: Pregunta[], respuestas: Respuesta[]): ResumenPregunta[] {
  return preguntas
    .filter((p) => p.tipo === "likert")
    .map((p) => {
      const valores = respuestas
        .map((r) => r.respuestas?.[p.id])
        .filter((v): v is number => typeof v === "number");
      const n = valores.length;
      const promedio = n > 0 ? valores.reduce((s, v) => s + v, 0) / n : 0;
      return { pregunta: p, promedio, n };
    });
}

function abiertasRecientes(preguntas: Pregunta[], respuestas: Respuesta[], limite = 5) {
  const abiertas = preguntas.filter((p) => p.tipo === "texto");
  const items: { texto: string; fecha: string; pregunta: string }[] = [];
  for (const r of respuestas) {
    for (const p of abiertas) {
      const v = r.respuestas?.[p.id];
      if (typeof v === "string" && v.trim()) {
        items.push({ texto: v.trim(), fecha: r.created_at, pregunta: p.texto });
      }
    }
  }
  return items
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, limite);
}

function colorBarra(promedio: number) {
  if (promedio >= 4) return "bg-emerald-500";
  if (promedio >= 3) return "bg-teal-500";
  if (promedio >= 2) return "bg-amber-500";
  return "bg-rose-500";
}

function SeccionEncuesta({
  titulo,
  descripcion,
  icono,
  preguntas,
  respuestas,
}: {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  preguntas: Pregunta[];
  respuestas: Respuesta[];
}) {
  const resumen = promediosLikert(preguntas, respuestas);
  const abiertas = abiertasRecientes(preguntas, respuestas);
  const totalRespuestas = respuestas.length;

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icono}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
            <p className="text-sm text-slate-500">{descripcion}</p>
          </div>
        </div>
        <span className="badge bg-slate-100 text-slate-600">
          {totalRespuestas} {totalRespuestas === 1 ? "respuesta" : "respuestas"}
        </span>
      </div>

      {totalRespuestas === 0 ? (
        <p className="mt-6 text-sm text-slate-400">Aún no hay respuestas registradas.</p>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {resumen.map((r) => {
              const pct = Math.round((r.promedio / 5) * 100);
              return (
                <div key={r.pregunta.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">{r.pregunta.texto}</span>
                    <span className="shrink-0 text-slate-500">
                      <span className="font-semibold text-slate-800">{r.promedio.toFixed(1)}</span>
                      <span className="text-slate-400"> / 5 · n={r.n}</span>
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${colorBarra(r.promedio)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {abiertas.length > 0 && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MessageSquareText className="h-4 w-4 text-slate-400" />
                Respuestas abiertas recientes
              </h3>
              <ul className="mt-3 space-y-2">
                {abiertas.map((a, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"
                  >
                    <p className="italic">“{a.texto}”</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {a.pregunta} · {new Date(a.fecha).toLocaleDateString("es-EC")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default async function EncuestasResultadosPage() {
  const profile = await requireProfile();
  if (profile.rol !== "admin" && profile.rol !== "autoridad") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("encuestas_respuestas")
    .select("id, tipo, respuestas, created_at")
    .order("created_at", { ascending: false });

  const todas = (data as Respuesta[]) ?? [];
  const pertinencia = todas.filter((r) => r.tipo === "pertinencia");
  const satisfaccion = todas.filter((r) => r.tipo === "satisfaccion_empleador");

  return (
    <div className="space-y-8">
      <header>
        <span className="badge bg-violet-50 text-violet-700">
          <BarChart3 className="h-4 w-4" /> Acreditación
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Resultados de encuestas
        </h1>
        <p className="mt-1 max-w-3xl text-slate-500">
          Promedios por pregunta y respuestas abiertas de las encuestas de pertinencia de la
          formación (graduados) y de satisfacción de empleadores.
        </p>
      </header>

      <SeccionEncuesta
        titulo="Pertinencia de la formación (graduados)"
        descripcion="Percepción de los graduados sobre la pertinencia de su formación para la vida profesional."
        icono={<GraduationCap className="h-5 w-5 text-blue-700" />}
        preguntas={PERTINENCIA}
        respuestas={pertinencia}
      />

      <SeccionEncuesta
        titulo="Satisfacción de empleadores"
        descripcion="Valoración de los empleadores sobre el desempeño de los graduados contratados."
        icono={<Building2 className="h-5 w-5 text-teal-600" />}
        preguntas={SATISFACCION_EMPLEADOR}
        respuestas={satisfaccion}
      />

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
        <p>
          Estos resultados alimentan directamente los indicadores de{" "}
          <strong>pertinencia y satisfacción</strong> exigidos en los procesos de acreditación
          institucional y de carreras. Se calculan en tiempo real sobre las respuestas registradas,
          sin cargas manuales intermedias.
        </p>
      </div>
    </div>
  );
}
