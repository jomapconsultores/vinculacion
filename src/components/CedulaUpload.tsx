"use client";

import { useRef, useState } from "react";
import { IdCard, Upload, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export function CedulaUpload() {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<{ nombres: string; apellidos: string; coincide: boolean; cedula_leida: string; actualizado: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function procesar(file: File) {
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append("cedula", file);
      const r = await fetch("/api/perfil/cedula", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo procesar la cédula");
      setRes(j);
      // Solo recargamos si el perfil realmente se actualizó (cédula verificada).
      if (j.actualizado) setTimeout(() => window.location.reload(), 2500);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (f) procesar(f);
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <IdCard className="h-5 w-5 text-blue-700" /> Verificar identidad con tu cédula
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Sube o arrastra una foto (o PDF) de tu cédula de ciudadanía. Leeremos y verificaremos tus
        <b> nombres y apellidos</b> para completar tu perfil automáticamente.
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
          drag ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-500">Leyendo tu cédula…</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Arrastra tu cédula aquí o haz clic para subir</p>
            <p className="text-xs text-slate-400">Imagen (JPG/PNG) o PDF · anverso de la cédula</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      {res && (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
          <p className="flex items-center gap-2 font-medium text-teal-800">
            <CheckCircle2 className="h-5 w-5" /> Datos leídos de tu cédula
          </p>
          <p className="mt-1 text-sm text-teal-900">
            <b>{res.nombres} {res.apellidos}</b>
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs">
            {res.coincide ? (
              <span className="inline-flex items-center gap-1 text-teal-700">
                <ShieldCheck className="h-3.5 w-3.5" /> La cédula coincide con la de tu cuenta.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {res.cedula_leida
                  ? `El número de cédula (${res.cedula_leida}) no coincide con el de tu cuenta.`
                  : "No pudimos leer con certeza el número de cédula en la imagen."}
              </span>
            )}
          </p>
          {res.actualizado ? (
            <p className="mt-2 text-xs text-slate-500">Actualizando tu perfil…</p>
          ) : (
            <p className="mt-2 text-xs text-amber-700">
              Tu perfil <b>no se modificó</b>. Sube una foto nítida del anverso de tu propia cédula, o si
              el número registrado en tu cuenta es incorrecto, contacta a soporte.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
