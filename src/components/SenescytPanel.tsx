"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Search, Loader2, Download, ExternalLink, BadgeCheck } from "lucide-react";

type Titulo = {
  titulo: string;
  institucion: string | null;
  tipo: string | null;
  fecha_registro: string | null;
  numero_registro: string | null;
};

export function SenescytPanel({ cedula }: { cedula: string | null }) {
  const router = useRouter();
  const [titulos, setTitulos] = useState<Titulo[] | null>(null);
  const [oficial, setOficial] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function consultar() {
    if (!cedula) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/senescyt?cedula=${cedula}`);
      const j = await r.json();
      setTitulos(j.titulos ?? []);
      setOficial(j.verificacion_oficial ?? null);
    } catch {
      setMsg("No se pudo consultar. Intenta de nuevo.");
    }
    setLoading(false);
  }

  async function importar() {
    setImportando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/senescyt/importar", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMsg(j.importados > 0 ? `Se agregaron ${j.importados} título(s) a tu educación.` : "Tus títulos ya estaban en tu perfil.");
      router.refresh();
    } catch (e: any) {
      setMsg(e.message || "No se pudo importar.");
    }
    setImportando(false);
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="h-5 w-5 text-blue-700" /> Títulos en SENESCYT
        </h2>
        <button className="btn-outline" onClick={consultar} disabled={loading || !cedula}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Consultar con mi cédula
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {cedula
          ? `Buscamos los títulos registrados a la cédula ${cedula}.`
          : "Tu perfil no tiene cédula registrada; complétala para consultar."}
      </p>

      {titulos !== null && (
        <div className="mt-4">
          {titulos.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              No se encontraron títulos para esta cédula en el registro.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {titulos.map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        <BadgeCheck className="h-4 w-4 shrink-0 text-blue-600" /> {t.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[t.institucion, t.tipo, t.fecha_registro].filter(Boolean).join(" · ")}
                      </p>
                      {t.numero_registro && (
                        <p className="text-xs text-slate-400">Registro: {t.numero_registro}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className="btn-primary" onClick={importar} disabled={importando}>
                  {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Agregar a mi educación
                </button>
                {oficial && (
                  <a href={oficial} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
                    Verificar en el sitio oficial <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </>
          )}
          {msg && <p className="mt-3 rounded-lg bg-teal-50 p-2 text-sm text-teal-700">{msg}</p>}
        </div>
      )}
    </section>
  );
}
