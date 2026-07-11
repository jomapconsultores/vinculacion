"use client";

// Importador del reporte de alumni: previsualiza la depuración y luego
// confirma. El mismo File se envía dos veces (previsualizar/confirmar);
// el servidor re-parsea, así no hay estado intermedio que expirar.

import { useRef, useState } from "react";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

type Advertencia = { cedula: string; campo: string; detalle: string };

type Informe = {
  filasLeidas: number;
  duplicadosExactos: number;
  personas: number;
  titulos: number;
  celularesCorregidos: number;
  fijosDetectados: number;
  emailsInvalidos: number;
  cedulasInvalidas: number;
  advertencias: Advertencia[];
};

type Respuesta = {
  ok?: boolean;
  error?: string;
  modo?: string;
  informe?: Informe;
  nuevos?: number;
  actualizados?: number;
  protegidos?: number;
  titulosNuevos?: number;
  padronActualizado?: number;
};

export function ImportarAlumni() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState<"previsualizar" | "confirmar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Respuesta | null>(null);
  const [resultado, setResultado] = useState<Respuesta | null>(null);
  const [actualizarPadron, setActualizarPadron] = useState(true);

  function elegir(f: File | null) {
    setError(null);
    setPreview(null);
    setResultado(null);
    if (!f) return setArchivo(null);
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      setError("El archivo debe ser un .xlsx (el reporte institucional de alumni).");
      return;
    }
    setArchivo(f);
  }

  async function enviar(modo: "previsualizar" | "confirmar") {
    if (!archivo) return;
    setCargando(modo);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("modo", modo);
      fd.append("actualizarPadron", actualizarPadron ? "1" : "0");
      const res = await fetch("/api/admin/alumni/importar", { method: "POST", body: fd });
      const json: Respuesta = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || `Error ${res.status}`);
        return;
      }
      if (modo === "previsualizar") setPreview(json);
      else {
        setResultado(json);
        setPreview(null);
      }
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setCargando(null);
    }
  }

  const informe = preview?.informe ?? resultado?.informe;

  return (
    <div className="space-y-5">
      {/* Zona de archivo */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          elegir(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-center transition ${
          arrastrando ? "border-blue-400 bg-blue-50" : "border-slate-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => elegir(e.target.files?.[0] ?? null)}
        />
        {archivo ? (
          <>
            <FileSpreadsheet className="h-8 w-8 text-teal-600" />
            <p className="font-medium text-slate-800">{archivo.name}</p>
            <p className="text-sm text-slate-500">
              {(archivo.size / 1024 / 1024).toFixed(1)} MB — haz clic para cambiar
            </p>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-700">
              Arrastra aquí el reporte .xlsx o haz clic para elegirlo
            </p>
            <p className="text-sm text-slate-500">Hoja esperada: “Alumni Report”</p>
          </>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={actualizarPadron}
          onChange={(e) => setActualizarPadron(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Actualizar también el padrón de graduados (autocompleta el registro de cuentas nuevas)
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="btn-primary"
          disabled={!archivo || cargando !== null}
          onClick={() => enviar("previsualizar")}
        >
          {cargando === "previsualizar" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Previsualizar depuración
        </button>
        {preview && (
          <button
            className="btn-accent"
            disabled={cargando !== null}
            onClick={() => enviar("confirmar")}
          >
            {cargando === "confirmar" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar importación
          </button>
        )}
      </div>

      {/* Resultado de confirmación */}
      {resultado && (
        <div className="flex items-start gap-2 rounded-xl bg-teal-50 p-4 text-sm text-teal-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Importación completada.</p>
            <p>
              {resultado.nuevos} personas nuevas, {resultado.actualizados} actualizadas,{" "}
              {resultado.protegidos} protegidas (datos del propio graduado, no se tocaron),{" "}
              {resultado.titulosNuevos} títulos nuevos
              {resultado.padronActualizado
                ? `, ${resultado.padronActualizado} filas sincronizadas al padrón`
                : ""}
              .
            </p>
          </div>
        </div>
      )}

      {/* Informe de depuración */}
      {informe && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icono={<FileSpreadsheet className="h-4 w-4" />} etiqueta="Filas leídas" valor={informe.filasLeidas} />
            <Kpi icono={<Users className="h-4 w-4" />} etiqueta="Personas únicas" valor={informe.personas} />
            <Kpi icono={<GraduationCap className="h-4 w-4" />} etiqueta="Títulos" valor={informe.titulos} />
            <Kpi icono={<ShieldCheck className="h-4 w-4" />} etiqueta="Duplicados descartados" valor={informe.duplicadosExactos} />
          </div>

          {preview && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi etiqueta="Nuevos" valor={preview.nuevos ?? 0} />
              <Kpi etiqueta="Se actualizarán" valor={preview.actualizados ?? 0} />
              <Kpi etiqueta="Protegidos (autoservicio)" valor={preview.protegidos ?? 0} />
            </div>
          )}

          <div className="card p-4 text-sm text-slate-600">
            <p className="mb-2 font-medium text-slate-800">Depuración aplicada</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{informe.celularesCorregidos} celulares corregidos (se restauró el 0 inicial).</li>
              <li>{informe.fijosDetectados} teléfonos convencionales separados del celular.</li>
              <li>{informe.emailsInvalidos} correos inválidos descartados.</li>
              <li>{informe.cedulasInvalidas} cédulas inválidas excluidas.</li>
            </ul>
          </div>

          {informe.advertencias.length > 0 && (
            <details className="card p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">
                Advertencias ({informe.advertencias.length})
              </summary>
              <div className="mt-3 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="py-1 pr-3">Cédula</th>
                      <th className="py-1 pr-3">Campo</th>
                      <th className="py-1">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {informe.advertencias.map((a, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-1 pr-3 font-mono">{a.cedula}</td>
                        <td className="py-1 pr-3">{a.campo}</td>
                        <td className="py-1">{a.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  icono,
}: {
  etiqueta: string;
  valor: number;
  icono?: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icono} {etiqueta}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor.toLocaleString("es-EC")}</p>
    </div>
  );
}
