"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Save, Loader2, Briefcase, GraduationCap, Sparkles } from "lucide-react";

type Exp = { id?: number; empresa: string; cargo: string; ciudad?: string; fecha_inicio?: string; fecha_fin?: string; actual?: boolean; descripcion?: string };
type Edu = { id?: number; institucion: string; titulo: string; nivel?: string; fecha_inicio?: string; fecha_fin?: string };
type Hab = { id?: number; nombre: string; nivel: number };

export function PerfilEditor({
  profileId,
  datos,
  experiencia,
  educacion,
  habilidades,
}: {
  profileId: string;
  datos: { telefono?: string; ciudad?: string; linkedin?: string; resumen_profesional?: string };
  experiencia: Exp[];
  educacion: Edu[];
  habilidades: Hab[];
}) {
  const supabase = createClient();
  const [info, setInfo] = useState(datos);
  const [exps, setExps] = useState<Exp[]>(experiencia);
  const [edus, setEdus] = useState<Edu[]>(educacion);
  const [habs, setHabs] = useState<Hab[]>(habilidades);
  const [savingInfo, setSavingInfo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function guardarInfo() {
    setSavingInfo(true);
    const { error } = await supabase.from("profiles").update(info).eq("id", profileId);
    setSavingInfo(false);
    setMsg(error ? `No se pudo guardar: ${error.message}` : "Datos guardados");
    setTimeout(() => setMsg(null), 3000);
  }

  async function addExp() {
    const nuevo: Exp = { empresa: "", cargo: "" };
    const { data } = await supabase.from("experiencia_laboral").insert({ ...nuevo, profile_id: profileId }).select().single();
    if (data) setExps([...exps, data as Exp]);
  }
  async function saveExp(e: Exp) {
    if (!e.id) return;
    await supabase.from("experiencia_laboral").update({
      empresa: e.empresa, cargo: e.cargo, ciudad: e.ciudad, fecha_inicio: e.fecha_inicio || null,
      fecha_fin: e.fecha_fin || null, actual: e.actual, descripcion: e.descripcion,
    }).eq("id", e.id);
  }
  async function delExp(id?: number) {
    if (!id) return;
    await supabase.from("experiencia_laboral").delete().eq("id", id);
    setExps(exps.filter((x) => x.id !== id));
  }

  async function addEdu() {
    const { data } = await supabase.from("educacion").insert({ profile_id: profileId, institucion: "", titulo: "" }).select().single();
    if (data) setEdus([...edus, data as Edu]);
  }
  async function saveEdu(e: Edu) {
    if (!e.id) return;
    await supabase.from("educacion").update({ institucion: e.institucion, titulo: e.titulo, nivel: e.nivel, fecha_inicio: e.fecha_inicio || null, fecha_fin: e.fecha_fin || null }).eq("id", e.id);
  }
  async function delEdu(id?: number) {
    if (!id) return;
    await supabase.from("educacion").delete().eq("id", id);
    setEdus(edus.filter((x) => x.id !== id));
  }

  async function addHab() {
    const { data } = await supabase.from("habilidades").insert({ profile_id: profileId, nombre: "", nivel: 3 }).select().single();
    if (data) setHabs([...habs, data as Hab]);
  }
  async function saveHab(h: Hab) {
    if (!h.id) return;
    await supabase.from("habilidades").update({ nombre: h.nombre, nivel: h.nivel }).eq("id", h.id);
  }
  async function delHab(id?: number) {
    if (!id) return;
    await supabase.from("habilidades").delete().eq("id", id);
    setHabs(habs.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Datos de contacto + resumen */}
      <section className="card p-6">
        <h2 className="font-semibold text-slate-900">Datos de contacto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Teléfono</label><input className="input" value={info.telefono ?? ""} onChange={(e) => setInfo({ ...info, telefono: e.target.value })} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={info.ciudad ?? ""} onChange={(e) => setInfo({ ...info, ciudad: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">LinkedIn</label><input className="input" value={info.linkedin ?? ""} onChange={(e) => setInfo({ ...info, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
          <div className="sm:col-span-2">
            <label className="label">Resumen profesional</label>
            <textarea className="input min-h-[90px]" value={info.resumen_profesional ?? ""} onChange={(e) => setInfo({ ...info, resumen_profesional: e.target.value })} placeholder="Un párrafo sobre ti. La IA puede ayudarte a redactarlo desde tu CV." />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary" onClick={guardarInfo} disabled={savingInfo}>
            {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
          {msg && <span className="text-sm text-teal-600">{msg}</span>}
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
              <input className="input" placeholder="Título" value={e.titulo} onChange={(ev) => { const c = [...edus]; c[i] = { ...e, titulo: ev.target.value }; setEdus(c); }} onBlur={() => saveEdu(edus[i])} />
              <input className="input" placeholder="Institución" value={e.institucion} onChange={(ev) => { const c = [...edus]; c[i] = { ...e, institucion: ev.target.value }; setEdus(c); }} onBlur={() => saveEdu(edus[i])} />
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
