"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Loader2, Briefcase, GraduationCap, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

type Exp = { id?: number; empresa: string; cargo: string; ciudad?: string; fecha_inicio?: string; fecha_fin?: string; actual?: boolean; descripcion?: string };
type Edu = { id?: number; institucion: string; titulo: string; nivel?: string; fecha_inicio?: string; fecha_fin?: string; area_nombre?: string | null; area_codigo?: string | null };
type Hab = { id?: number; nombre: string; nivel: number };

type Estado = "idle" | "guardando" | "guardado" | "error";

async function api(body: any): Promise<any> {
  const r = await fetch("/api/perfil", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "No se pudo guardar");
  }
  return r.json();
}

export function PerfilEditor({
  datos,
  experiencia,
  educacion,
  habilidades,
  nombreEditable = false,
}: {
  profileId?: string;
  datos: { nombres?: string; apellidos?: string; telefono?: string; ciudad?: string; linkedin?: string; resumen_profesional?: string };
  experiencia: Exp[];
  educacion: Edu[];
  habilidades: Hab[];
  nombreEditable?: boolean;
}) {
  const [info, setInfo] = useState(datos);
  const [exps, setExps] = useState<Exp[]>(experiencia);
  const [edus, setEdus] = useState<Edu[]>(educacion);
  const [habs, setHabs] = useState<Hab[]>(habilidades);
  const [savingInfo, setSavingInfo] = useState(false);
  const [estado, setEstado] = useState<Estado>("idle");

  // Indicador global de guardado automático
  async function autoguardar(fn: () => Promise<void>) {
    setEstado("guardando");
    try {
      await fn();
      setEstado("guardado");
      setTimeout(() => setEstado((e) => (e === "guardado" ? "idle" : e)), 2000);
    } catch {
      setEstado("error");
    }
  }

  async function guardarInfo() {
    setSavingInfo(true);
    try {
      await api({ accion: "datos", datos: info });
      setEstado("guardado");
      setTimeout(() => setEstado("idle"), 2000);
    } catch {
      setEstado("error");
    }
    setSavingInfo(false);
  }

  async function addExp() {
    const j = await api({ accion: "crear", tabla: "experiencia_laboral", datos: { empresa: "", cargo: "" } });
    if (j.fila) setExps([...exps, j.fila as Exp]);
  }
  function saveExp(e: Exp) {
    if (!e.id) return;
    autoguardar(() => api({ accion: "actualizar", tabla: "experiencia_laboral", id: e.id, datos: e }));
  }
  async function delExp(id?: number) {
    if (!id) return;
    await autoguardar(() => api({ accion: "eliminar", tabla: "experiencia_laboral", id }));
    setExps(exps.filter((x) => x.id !== id));
  }

  async function addEdu() {
    const j = await api({ accion: "crear", tabla: "educacion", datos: { institucion: "", titulo: "" } });
    if (j.fila) setEdus([...edus, j.fila as Edu]);
  }
  function saveEdu(e: Edu) {
    if (!e.id) return;
    autoguardar(() => api({ accion: "actualizar", tabla: "educacion", id: e.id, datos: e }));
  }
  async function delEdu(id?: number) {
    if (!id) return;
    await autoguardar(() => api({ accion: "eliminar", tabla: "educacion", id }));
    setEdus(edus.filter((x) => x.id !== id));
  }

  async function addHab() {
    const j = await api({ accion: "crear", tabla: "habilidades", datos: { nombre: "", nivel: 3 } });
    if (j.fila) setHabs([...habs, j.fila as Hab]);
  }
  function saveHab(h: Hab) {
    if (!h.id) return;
    autoguardar(() => api({ accion: "actualizar", tabla: "habilidades", id: h.id, datos: h }));
  }
  async function delHab(id?: number) {
    if (!id) return;
    await autoguardar(() => api({ accion: "eliminar", tabla: "habilidades", id }));
    setHabs(habs.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Indicador de guardado automático (flotante) */}
      {estado !== "idle" && (
        <div className="fixed bottom-4 right-4 z-30">
          <span
            className={`badge shadow-sm ${
              estado === "error" ? "bg-red-50 text-red-600" : estado === "guardando" ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-700"
            }`}
          >
            {estado === "guardando" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {estado === "guardado" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {estado === "error" && <AlertCircle className="h-3.5 w-3.5" />}
            {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : "No se pudo guardar"}
          </span>
        </div>
      )}

      {/* Datos de contacto + resumen */}
      <section className="card p-6">
        <h2 className="font-semibold text-slate-900">Datos personales y de contacto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {nombreEditable && (
            <>
              <div><label className="label">Nombres</label><input className="input" value={info.nombres ?? ""} onChange={(e) => setInfo({ ...info, nombres: e.target.value })} onBlur={guardarInfo} placeholder="Tus nombres" /></div>
              <div><label className="label">Apellidos</label><input className="input" value={info.apellidos ?? ""} onChange={(e) => setInfo({ ...info, apellidos: e.target.value })} onBlur={guardarInfo} placeholder="Tus apellidos" /></div>
            </>
          )}
          <div><label className="label">Teléfono</label><input className="input" value={info.telefono ?? ""} onChange={(e) => setInfo({ ...info, telefono: e.target.value })} onBlur={guardarInfo} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={info.ciudad ?? ""} onChange={(e) => setInfo({ ...info, ciudad: e.target.value })} onBlur={guardarInfo} /></div>
          <div className="sm:col-span-2"><label className="label">LinkedIn</label><input className="input" value={info.linkedin ?? ""} onChange={(e) => setInfo({ ...info, linkedin: e.target.value })} onBlur={guardarInfo} placeholder="https://linkedin.com/in/..." /></div>
          <div className="sm:col-span-2">
            <label className="label">Resumen profesional</label>
            <textarea className="input min-h-[90px]" value={info.resumen_profesional ?? ""} onChange={(e) => setInfo({ ...info, resumen_profesional: e.target.value })} onBlur={guardarInfo} placeholder="Un párrafo sobre ti. La IA puede ayudarte a redactarlo desde tu CV." />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary" onClick={guardarInfo} disabled={savingInfo}>
            {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
          <span className="text-xs text-slate-400">Los cambios se guardan automáticamente.</span>
        </div>
      </section>

      {/* Experiencia */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Briefcase className="h-5 w-5 text-teal-600" /> Experiencia laboral</h2>
          <button className="btn-outline" onClick={addExp}><Plus className="h-4 w-4" /> Agregar</button>
        </div>
        <div className="mt-4 space-y-4">
          {exps.length === 0 && <p className="text-sm text-slate-400">Aún no agregas experiencia.</p>}
          {exps.map((e, i) => (
            <div key={e.id ?? i} className="rounded-lg border border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" placeholder="Cargo" value={e.cargo} onChange={(ev) => { const c = [...exps]; c[i] = { ...e, cargo: ev.target.value }; setExps(c); }} onBlur={() => saveExp(exps[i])} />
                <input className="input" placeholder="Empresa" value={e.empresa} onChange={(ev) => { const c = [...exps]; c[i] = { ...e, empresa: ev.target.value }; setExps(c); }} onBlur={() => saveExp(exps[i])} />
                <input className="input" type="month" value={e.fecha_inicio?.slice(0, 7) ?? ""} onChange={(ev) => { const c = [...exps]; c[i] = { ...e, fecha_inicio: ev.target.value ? ev.target.value + "-01" : undefined }; setExps(c); }} onBlur={() => saveExp(exps[i])} />
                <input className="input" type="month" value={e.fecha_fin?.slice(0, 7) ?? ""} onChange={(ev) => { const c = [...exps]; c[i] = { ...e, fecha_fin: ev.target.value ? ev.target.value + "-01" : undefined }; setExps(c); }} onBlur={() => saveExp(exps[i])} />
              </div>
              <textarea className="input mt-3 min-h-[60px]" placeholder="¿Qué hiciste? Logros y responsabilidades" value={e.descripcion ?? ""} onChange={(ev) => { const c = [...exps]; c[i] = { ...e, descripcion: ev.target.value }; setExps(c); }} onBlur={() => saveExp(exps[i])} />
              <button className="btn-ghost mt-2 text-red-500" onClick={() => delExp(e.id)}><Trash2 className="h-4 w-4" /> Eliminar</button>
            </div>
          ))}
        </div>
      </section>

      {/* Educación */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><GraduationCap className="h-5 w-5 text-blue-700" /> Educación</h2>
          <button className="btn-outline" onClick={addEdu}><Plus className="h-4 w-4" /> Agregar</button>
        </div>
        <div className="mt-4 space-y-4">
          {edus.length === 0 && <p className="text-sm text-slate-400">Aún no agregas formación.</p>}
          {edus.map((e, i) => (
            <div key={e.id ?? i} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
              <div>
                <label className="label">Título</label>
                <input className="input" placeholder="Título" value={e.titulo} onChange={(ev) => { const c = [...edus]; c[i] = { ...e, titulo: ev.target.value }; setEdus(c); }} onBlur={() => saveEdu(edus[i])} />
              </div>
              <div>
                <label className="label">Institución</label>
                <input className="input" placeholder="Institución" value={e.institucion} onChange={(ev) => { const c = [...edus]; c[i] = { ...e, institucion: ev.target.value }; setEdus(c); }} onBlur={() => saveEdu(edus[i])} />
              </div>
              <div>
                <label className="label">Fecha (registro / graduación)</label>
                <input className="input" type="date" value={e.fecha_fin?.slice(0, 10) ?? ""} onChange={(ev) => { const c = [...edus]; c[i] = { ...e, fecha_fin: ev.target.value || undefined }; setEdus(c); }} onBlur={() => saveEdu(edus[i])} />
              </div>
              <div>
                <label className="label">Área de conocimiento</label>
                <input className="input" placeholder="Ej. Ciencias Sociales, Educación Comercial y Derecho" value={e.area_nombre ?? ""} onChange={(ev) => { const c = [...edus]; c[i] = { ...e, area_nombre: ev.target.value }; setEdus(c); }} onBlur={() => saveEdu(edus[i])} />
              </div>
              <button className="btn-ghost text-red-500 sm:col-span-2 justify-self-start" onClick={() => delEdu(e.id)}><Trash2 className="h-4 w-4" /> Eliminar</button>
            </div>
          ))}
        </div>
      </section>

      {/* Habilidades */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="h-5 w-5 text-violet-600" /> Habilidades</h2>
          <button className="btn-outline" onClick={addHab}><Plus className="h-4 w-4" /> Agregar</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {habs.length === 0 && <p className="text-sm text-slate-400">Aún no agregas habilidades.</p>}
          {habs.map((h, i) => (
            <div key={h.id ?? i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
              <input className="input w-40" placeholder="Habilidad" value={h.nombre} onChange={(ev) => { const c = [...habs]; c[i] = { ...h, nombre: ev.target.value }; setHabs(c); }} onBlur={() => saveHab(habs[i])} />
              <select className="input w-24" value={h.nivel} onChange={(ev) => { const c = [...habs]; c[i] = { ...h, nivel: Number(ev.target.value) }; setHabs(c); saveHab(c[i]); }}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Nivel {n}</option>)}
              </select>
              <button className="text-red-400 hover:text-red-600" onClick={() => delHab(h.id)}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
