// Recepción de datos del asistente de alumni.
//
// POST { token, datos, titulos } — dos caminos:
// - Público (sin sesión, o sesión con otra cédula): lo enviado va a la tabla
//   de staging alumni_actualizaciones (estado 'pendiente') y un administrador
//   lo revisa antes de aplicarlo.
// - Con sesión cuya cédula del perfil coincide con la del token: se aplica
//   directo a alumni/alumni_titulos y la ficha queda 'verificado'.

import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verificarTokenAlumni } from "@/lib/alumni-token";
import { limiteExcedido, ipDe } from "@/lib/seguridad";
import { categorizarOcupacion, normalizarCelular, normalizarEmail } from "@/lib/alumni-import";

export const runtime = "nodejs";

const EsquemaTitulo = z.object({
  titulo: z.string().trim().min(3).max(300),
  nivel: z.enum(["PROFESIONAL", "ESPECIALISTA", "MAESTRIA"]).nullish(),
  instituto: z.string().trim().max(200).nullish(),
  anio: z.number().int().min(1950).max(2035).nullish(),
});

const Esquema = z.object({
  token: z.string().min(10),
  datos: z.object({
    genero: z.enum(["masculino", "femenino", "otro"]).nullish(),
    email: z.string().trim().max(200).nullish(),
    celular: z.string().trim().max(30).nullish(),
    ciudad: z.string().trim().max(120).nullish(),
    ocupacion: z.string().trim().max(300).nullish(),
    cargo: z.string().trim().max(200).nullish(),
    empresa: z.string().trim().max(200).nullish(),
  }),
  titulos: z.array(EsquemaTitulo).max(20).default([]),
  // De dónde salió cada campo (manual | voz | documento) — trazabilidad.
  origen_campos: z.record(z.string(), z.string().max(20)).optional(),
});

export async function POST(req: Request) {
  const ip = ipDe(req);
  if (limiteExcedido(`alumni-actualizar:ip:${ip}`, 10, 60 * 60_000, Date.now())) {
    return Response.json({ error: "Demasiados envíos. Intenta más tarde." }, { status: 429 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const parseado = Esquema.safeParse(cuerpo);
  if (!parseado.success) {
    return Response.json({ error: "Datos inválidos.", detalle: parseado.error.issues }, { status: 400 });
  }
  const { token, datos, titulos, origen_campos } = parseado.data;

  const t = verificarTokenAlumni(token);
  if (!t) {
    return Response.json(
      { error: "La sesión de verificación expiró. Vuelve a ingresar tu cédula." },
      { status: 401 }
    );
  }
  const cedula = t.cedula;

  // Normalización servidor (el cliente ya valida, pero no se confía en él).
  const { email, invalido: emailInvalido } = normalizarEmail(datos.email || "");
  if (datos.email && emailInvalido) {
    return Response.json({ error: "El correo electrónico no es válido." }, { status: 400 });
  }
  const cel = normalizarCelular(datos.celular || "");
  if (datos.celular && cel.descartado) {
    return Response.json(
      { error: "El celular no es válido (debe ser 09xxxxxxxx)." },
      { status: 400 }
    );
  }

  const datosLimpios = {
    genero: datos.genero ?? null,
    email,
    celular: cel.celular,
    telefono_fijo: cel.telefono_fijo,
    ciudad: datos.ciudad?.trim() || null,
    ocupacion: datos.ocupacion?.trim() || null,
    cargo: datos.cargo?.trim() || null,
    empresa: datos.empresa?.trim() || null,
  };

  const admin = createAdminClient();
  const { data: ficha } = await admin
    .from("alumni")
    .select("id, nombres, apellidos")
    .eq("cedula", cedula)
    .maybeSingle();

  // ¿Hay una sesión cuya cédula coincide? → aplicar directo.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let cedulaSesion: string | null = null;
  let nombreSesion: { nombres: string | null; apellidos: string | null } | null = null;
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("cedula, nombres, apellidos")
      .eq("id", user.id)
      .maybeSingle();
    cedulaSesion = perfil?.cedula ?? null;
    nombreSesion = perfil ? { nombres: perfil.nombres, apellidos: perfil.apellidos } : null;
  }
  const esPropietario = !!user && cedulaSesion === cedula;

  if (esPropietario) {
    // Solo se escriben los campos que el graduado envió (no se borra lo demás).
    const cambios: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(datosLimpios)) {
      if (v !== null) cambios[k] = v;
    }
    if (datosLimpios.ocupacion || datosLimpios.cargo) {
      cambios.ocupacion_categoria = categorizarOcupacion(
        datosLimpios.ocupacion || "",
        datosLimpios.cargo || ""
      );
    }
    cambios.fuente = "cuenta";
    cambios.estado_verificacion = "verificado";
    cambios.datos_actualizados_at = new Date().toISOString();

    let alumniId = ficha?.id as number | undefined;
    if (!alumniId) {
      const { data: creada, error } = await admin
        .from("alumni")
        .insert({
          cedula,
          nombres: nombreSesion?.nombres || "—",
          apellidos: nombreSesion?.apellidos || "—",
          ...cambios,
        })
        .select("id")
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      alumniId = creada.id;
    } else {
      const { error } = await admin.from("alumni").update(cambios).eq("id", alumniId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    if (titulos.length > 0) {
      const filas = titulos.map((tt) => ({
        alumni_id: alumniId!,
        titulo: tt.titulo.trim().replace(/\s+/g, " ").toUpperCase(),
        nivel_formacion: tt.nivel ?? null,
        instituto: tt.instituto?.trim().toUpperCase() || null,
        anio_graduacion: tt.anio ?? null,
        fuente: "cuenta",
      }));
      const { error } = await admin
        .from("alumni_titulos")
        .upsert(filas, { onConflict: "alumni_id,titulo,anio_graduacion", ignoreDuplicates: true });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, aplicado: true });
  }

  // Canal público: staging pendiente de revisión.
  const { error } = await admin.from("alumni_actualizaciones").insert({
    alumni_id: ficha?.id ?? null,
    cedula,
    payload: { datos: datosLimpios, titulos, origen_campos: origen_campos ?? {} },
    fuente: "publico",
    estado: "pendiente",
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (ficha?.id) {
    await admin
      .from("alumni")
      .update({ estado_verificacion: "pendiente_revision" })
      .eq("id", ficha.id)
      .eq("estado_verificacion", "importado");
  }

  return Response.json({ ok: true, aplicado: false });
}
