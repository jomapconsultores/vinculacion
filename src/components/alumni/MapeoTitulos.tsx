"use client";

// Tabla editable del mapeo título -> carrera -> facultad.
// "Generar con IA" llama repetidamente al endpoint hasta agotar pendientes
// (cada llamada procesa hasta 150 títulos).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, CheckCheck, Send, AlertTriangle, Search } from "lucide-react";

type Mapeo = {
  id: number;
  titulo_normalizado: string;
  carrera_nombre: string | null;
  facultad: string | null;
  carrera_id: number | null;
  origen: string;
  confianza: number | null;
  revisado: boolean;
} | null;

type Fila = {
  titulo: string;
  graduados: number;
  nivel_formacion: string | null;
  instituto: string | null;
  mapeo: Mapeo;
};

export function MapeoTitulos() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [progresoIA, setProgresoIA] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/alumni/mapeo");
      const json = await res.json();
      if (!res.ok || json.error) setError(json.error || `Error ${res.status}`);
      else setFilas(json.filas ?? []);
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function generarIA() {
    setGenerando(true);
    setError(null);
    setMensaje(null);
    try {
      let total = 0;
      // Repite hasta agotar pendientes (máx. 20 vueltas de seguridad).
      for (let i = 0; i < 20; i++) {
        setProgresoIA(`Procesando… ${total} títulos mapeados`);
        const res = await fetch("/api/admin/alumni/mapeo/generar", { method: "POST" });
        const json = await res.json();
        if (!res.ok || json.error) {
          setError(json.error || `Error ${res.status}`);
          break;
        }
        total += json.procesados ?? 0;
        if (!json.restantes || json.procesados === 0) break;
      }
      setMensaje(`IA completada: ${total} títulos con propuesta de carrera.`);
      await cargar();
    } finally {
      setGenerando(false);
      setProgresoIA(null);
    }
  }

  async function aplicar(marcarTodos: boolean) {
    setAplicando(true);
    setError(null);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/alumni/mapeo/aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcarTodosRevisados: marcarTodos }),
      });
      const json = await res.json();
      if (!res.ok || json.error) setError(json.error || `Error ${res.status}`);
      else {
        setMensaje(`Mapeo aplicado: ${json.titulosActualizados} títulos actualizados.`);
        await cargar();
      }
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setAplicando(false);
    }
  }

  async function guardarFila(titulo: string, carrera: string, facultad: string, revisado: boolean) {
    const res = await fetch("/api/admin/alumni/mapeo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        carrera_nombre: carrera || null,
        facultad: facultad || null,
        revisado,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      setError(json.error || `Error ${res.status}`);
      return;
    }
    setFilas((prev) =>
      prev.map((f) => (f.titulo === titulo ? { ...f, mapeo: json.mapeo } : f))
    );
  }

  const visibles = useMemo(() => {
    const q = filtro.trim().toUpperCase();
    return filas.filter((f) => {
      if (soloPendientes && f.mapeo?.revisado) return false;
      if (q && !f.titulo.includes(q) && !(f.mapeo?.carrera_nombre || "").toUpperCase().includes(q))
        return false;
      return true;
    });
  }, [filas, filtro, soloPendientes]);

  const stats = useMemo(() => {
    const conMapeo = filas.filter((f) => f.mapeo).length;
    const revisados = filas.filter((f) => f.mapeo?.revisado).length;
    return { total: filas.length, conMapeo, revisados };
  }, [filas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button className="btn-primary" disabled={generando || aplicando} onClick={generarIA}>
          {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {progresoIA ?? "Generar con IA"}
        </button>
        <button className="btn-outline" disabled={generando || aplicando} onClick={() => aplicar(true)}>
          <CheckCheck className="h-4 w-4" /> Marcar todo revisado y aplicar
        </button>
        <button className="btn-accent" disabled={generando || aplicando} onClick={() => aplicar(false)}>
          {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Aplicar revisados
        </button>
      </div>

      <p className="text-sm text-slate-500">
        {stats.total} títulos distintos — {stats.conMapeo} con propuesta, {stats.revisados} revisados.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {mensaje && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-700">{mensaje}</div>}

      <div className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="input flex-1 border-none focus:ring-0"
            placeholder="Filtrar por título o carrera…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Solo sin revisar
        </label>
      </div>

      {cargando ? (
        <div className="card flex items-center justify-center gap-2 p-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando títulos…
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Grad.</th>
                <th className="px-3 py-2">Carrera</th>
                <th className="px-3 py-2">Facultad</th>
                <th className="px-3 py-2">Conf.</th>
                <th className="px-3 py-2">Revisado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.slice(0, 400).map((f) => (
                <FilaMapeo key={f.titulo} fila={f} onGuardar={guardarFila} />
              ))}
            </tbody>
          </table>
          {visibles.length > 400 && (
            <p className="p-3 text-center text-xs text-slate-400">
              Mostrando 400 de {visibles.length}: usa el filtro para acotar.
            </p>
          )}
          {visibles.length === 0 && (
            <p className="p-8 text-center text-slate-400">Sin títulos que coincidan.</p>
          )}
        </div>
      )}
    </div>
  );
}

function FilaMapeo({
  fila,
  onGuardar,
}: {
  fila: Fila;
  onGuardar: (titulo: string, carrera: string, facultad: string, revisado: boolean) => Promise<void>;
}) {
  const [carrera, setCarrera] = useState(fila.mapeo?.carrera_nombre ?? "");
  const [facultad, setFacultad] = useState(fila.mapeo?.facultad ?? "");
  const [guardando, setGuardando] = useState(false);

  // Sincroniza cuando llega el resultado de la IA o de "aplicar".
  useEffect(() => {
    setCarrera(fila.mapeo?.carrera_nombre ?? "");
    setFacultad(fila.mapeo?.facultad ?? "");
  }, [fila.mapeo?.carrera_nombre, fila.mapeo?.facultad]);

  async function guardar(revisado: boolean) {
    setGuardando(true);
    try {
      await onGuardar(fila.titulo, carrera.trim(), facultad.trim(), revisado);
    } finally {
      setGuardando(false);
    }
  }

  const editado =
    carrera.trim() !== (fila.mapeo?.carrera_nombre ?? "") ||
    facultad.trim() !== (fila.mapeo?.facultad ?? "");

  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="max-w-xs px-3 py-2">
        <p className="font-medium text-slate-800">{fila.titulo}</p>
        <p className="text-xs text-slate-400">
          {fila.nivel_formacion ?? "—"} · {fila.instituto ?? "—"}
        </p>
      </td>
      <td className="px-3 py-2 text-slate-600">{fila.graduados}</td>
      <td className="px-3 py-2">
        <input
          className="input min-w-[12rem] py-1 text-sm"
          value={carrera}
          onChange={(e) => setCarrera(e.target.value)}
          onBlur={() => editado && guardar(fila.mapeo?.revisado ?? false)}
          placeholder="(sin carrera)"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="input min-w-[10rem] py-1 text-sm"
          value={facultad}
          onChange={(e) => setFacultad(e.target.value)}
          onBlur={() => editado && guardar(fila.mapeo?.revisado ?? false)}
          placeholder="(sin facultad)"
        />
      </td>
      <td className="px-3 py-2 text-slate-500">
        {fila.mapeo?.confianza != null ? `${Math.round(fila.mapeo.confianza * 100)}%` : "—"}
      </td>
      <td className="px-3 py-2">
        {guardando ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <input
            type="checkbox"
            checked={fila.mapeo?.revisado ?? false}
            onChange={(e) => guardar(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
        )}
      </td>
    </tr>
  );
}
