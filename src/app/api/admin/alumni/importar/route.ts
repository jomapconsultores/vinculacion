// Importación del reporte institucional de alumni (Excel "Alumni Report").
//
// POST multipart:
//   archivo          .xlsx del reporte
//   modo             "previsualizar" (no escribe) | "confirmar"
//   actualizarPadron "1" para sincronizar también graduados_padron
//
// La depuración (normalización + deduplicación) es determinista y vive en
// src/lib/alumni-import.ts. El modo confirmar es idempotente: re-importar el
// mismo archivo no duplica nada, y NO pisa los datos de contacto/ocupación
// de personas que ya se actualizaron por autoservicio o están verificadas.

import * as XLSX from "xlsx";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import {
  depurarFilas,
  mapearFilaExcel,
  type PersonaDepurada,
} from "@/lib/alumni-import";

export const runtime = "nodejs";
export const maxDuration = 120;

const LOTE = 500;

function lotes<T>(items: T[], tam: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += tam) out.push(items.slice(i, i + tam));
  return out;
}

type AlumniExistente = {
  id: number;
  cedula: string;
  fuente: string;
  estado_verificacion: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, rol, aprobado")
    .eq("id", user.id)
    .maybeSingle();
  const autorizado = perfil ? await tieneModulo(perfil, "alumni") : false;
  if (!autorizado) return Response.json({ error: "Acceso denegado" }, { status: 403 });

  const form = await req.formData();
  const archivo = form.get("archivo");
  const modo = String(form.get("modo") || "previsualizar");
  const actualizarPadron = String(form.get("actualizarPadron") || "0") === "1";

  if (!(archivo instanceof File)) {
    return Response.json({ error: "Falta el archivo .xlsx del reporte." }, { status: 400 });
  }
  if (archivo.size > 25 * 1024 * 1024) {
    return Response.json({ error: "El archivo supera 25 MB." }, { status: 400 });
  }

  // --- Parseo y depuración ---
  let personas: PersonaDepurada[];
  let informe;
  try {
    const wb = XLSX.read(await archivo.arrayBuffer(), { cellDates: true });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    if (!hoja) throw new Error("El archivo no tiene hojas.");
    const crudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });
    if (crudas.length === 0) throw new Error("La hoja no tiene filas de datos.");
    if (!("# Identificación" in crudas[0])) {
      throw new Error(
        'No se encontró la columna "# Identificación": ¿es el reporte de alumni correcto?'
      );
    }
    const filas = crudas.map(mapearFilaExcel);
    ({ personas, informe } = depurarFilas(filas));
  } catch (e: any) {
    return Response.json(
      { error: `No se pudo leer el archivo: ${e?.message || e}` },
      { status: 400 }
    );
  }

  // --- Estado actual en BD (para preview y para la regla de no-pisado) ---
  const admin = createAdminClient();
  const existentes = new Map<string, AlumniExistente>();
  for (const grupo of lotes(personas.map((p) => p.cedula), LOTE)) {
    const { data, error } = await admin
      .from("alumni")
      .select("id, cedula, fuente, estado_verificacion")
      .in("cedula", grupo);
    if (error) {
      return Response.json({ error: `Error consultando alumni: ${error.message}` }, { status: 500 });
    }
    for (const fila of (data ?? []) as AlumniExistente[]) existentes.set(fila.cedula, fila);
  }

  const nuevas = personas.filter((p) => !existentes.has(p.cedula));
  const actualizables = personas.filter((p) => {
    const e = existentes.get(p.cedula);
    return e && e.fuente === "importacion_excel" && e.estado_verificacion !== "verificado";
  });
  const protegidas = personas.filter((p) => {
    const e = existentes.get(p.cedula);
    return e && !(e.fuente === "importacion_excel" && e.estado_verificacion !== "verificado");
  });

  if (modo === "previsualizar") {
    return Response.json({
      ok: true,
      modo,
      informe,
      nuevos: nuevas.length,
      actualizados: actualizables.length,
      protegidos: protegidas.length,
    });
  }

  // --- Confirmar: escritura por lotes ---

  // Mapeo título -> carrera revisado (para asignar carrera_id al vuelo).
  const mapeoCarrera = new Map<string, number>();
  {
    const { data } = await admin
      .from("titulos_mapeo")
      .select("titulo_normalizado, carrera_id")
      .eq("revisado", true)
      .not("carrera_id", "is", null);
    for (const m of data ?? []) mapeoCarrera.set(m.titulo_normalizado, m.carrera_id);
  }

  const columnasPersona = (p: PersonaDepurada) => ({
    cedula: p.cedula,
    nombres: p.nombres,
    apellidos: p.apellidos,
    genero: p.genero,
    email: p.email,
    celular: p.celular,
    telefono_fijo: p.telefono_fijo,
    ocupacion: p.ocupacion,
    cargo: p.cargo,
    ocupacion_categoria: p.ocupacion_categoria,
    fuente: "importacion_excel",
  });

  const idPorCedula = new Map<string, number>();
  for (const [cedula, e] of existentes) idPorCedula.set(cedula, e.id);

  // 1. Insertar personas nuevas.
  let insertadas = 0;
  for (const grupo of lotes(nuevas, LOTE)) {
    const { data, error } = await admin
      .from("alumni")
      .insert(grupo.map(columnasPersona))
      .select("id, cedula");
    if (error) {
      return Response.json({ error: `Error insertando alumni: ${error.message}` }, { status: 500 });
    }
    for (const fila of data ?? []) idPorCedula.set(fila.cedula, fila.id);
    insertadas += data?.length ?? 0;
  }

  // 2. Actualizar personas importadas no verificadas (upsert por cédula).
  let actualizadas = 0;
  for (const grupo of lotes(actualizables, LOTE)) {
    const { error } = await admin
      .from("alumni")
      .upsert(grupo.map(columnasPersona), { onConflict: "cedula" });
    if (error) {
      return Response.json({ error: `Error actualizando alumni: ${error.message}` }, { status: 500 });
    }
    actualizadas += grupo.length;
  }

  // 3. Títulos de TODAS las personas (también de las protegidas: los títulos
  //    son aditivos y la clave única evita duplicados).
  type FilaTitulo = {
    alumni_id: number;
    titulo: string;
    nivel_formacion: string | null;
    instituto: string | null;
    anio_graduacion: number | null;
    carrera_id: number | null;
    fuente: string;
    fecha_creacion_origen: string | null;
  };
  const filasTitulos: FilaTitulo[] = [];
  for (const p of personas) {
    const alumniId = idPorCedula.get(p.cedula);
    if (!alumniId) continue;
    for (const t of p.titulos) {
      filasTitulos.push({
        alumni_id: alumniId,
        titulo: t.titulo,
        nivel_formacion: t.nivel_formacion,
        instituto: t.instituto,
        anio_graduacion: t.anio_graduacion,
        carrera_id: mapeoCarrera.get(t.titulo_normalizado) ?? null,
        fuente: "importacion_excel",
        fecha_creacion_origen: t.fecha_creacion_origen,
      });
    }
  }
  let titulosNuevos = 0;
  for (const grupo of lotes(filasTitulos, LOTE)) {
    const { data, error } = await admin
      .from("alumni_titulos")
      .upsert(grupo, {
        onConflict: "alumni_id,titulo,anio_graduacion",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      return Response.json({ error: `Error insertando títulos: ${error.message}` }, { status: 500 });
    }
    titulosNuevos += data?.length ?? 0;
  }

  // 4. Sembrar titulos_mapeo con las filas del Excel que SÍ traían
  //    facultad/carrera (origen='excel'; no pisa mapeos existentes).
  {
    const semillas = new Map<string, { carrera: string; facultad: string | null }>();
    for (const p of personas) {
      for (const t of p.titulos) {
        if (t.carrera_origen && !semillas.has(t.titulo_normalizado)) {
          semillas.set(t.titulo_normalizado, {
            carrera: t.carrera_origen,
            facultad: t.facultad_origen,
          });
        }
      }
    }
    if (semillas.size > 0) {
      const { data: carreras } = await admin.from("carreras").select("id, nombre");
      const carreraId = new Map<string, number>(
        (carreras ?? []).map((c: { id: number; nombre: string }) => [
          c.nombre.trim().toUpperCase(),
          c.id,
        ])
      );
      const filasMapeo = [...semillas.entries()].map(([tituloNorm, s]) => ({
        titulo_normalizado: tituloNorm,
        carrera_nombre: s.carrera,
        facultad: s.facultad,
        carrera_id: carreraId.get(s.carrera.trim().toUpperCase()) ?? null,
        origen: "excel",
        confianza: 1,
        revisado: false,
      }));
      await admin
        .from("titulos_mapeo")
        .upsert(filasMapeo, { onConflict: "titulo_normalizado", ignoreDuplicates: true });
    }
  }

  // 5. Sincronizar graduados_padron (opcional): el registro de cuentas
  //    autocompleta desde ahí (handle_new_user). Se usa el título más
  //    reciente de cada persona.
  let padronActualizado = 0;
  if (actualizarPadron) {
    const filasPadron = personas.map((p) => {
      const masReciente = [...p.titulos].sort(
        (a, b) => (b.anio_graduacion ?? 0) - (a.anio_graduacion ?? 0)
      )[0];
      return {
        cedula: p.cedula,
        nombres: p.nombres,
        apellidos: p.apellidos,
        telefono: p.celular,
        titulo: masReciente?.titulo ?? null,
        anio_graduacion: masReciente?.anio_graduacion ?? null,
        carrera_id: masReciente
          ? mapeoCarrera.get(masReciente.titulo_normalizado) ?? null
          : null,
      };
    });
    for (const grupo of lotes(filasPadron, LOTE)) {
      const { error } = await admin
        .from("graduados_padron")
        .upsert(grupo, { onConflict: "cedula" });
      if (error) {
        return Response.json(
          { error: `Error actualizando el padrón: ${error.message}` },
          { status: 500 }
        );
      }
      padronActualizado += grupo.length;
    }
  }

  return Response.json({
    ok: true,
    modo,
    informe,
    nuevos: insertadas,
    actualizados: actualizadas,
    protegidos: protegidas.length,
    titulosNuevos,
    padronActualizado,
  });
}
