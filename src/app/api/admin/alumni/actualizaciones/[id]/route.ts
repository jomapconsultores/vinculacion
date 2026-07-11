// Revisión de actualizaciones enviadas por el canal público.
// POST { accion: "aprobar" | "rechazar" } — aprobar aplica el payload a
// alumni/alumni_titulos y marca la ficha como verificada.

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { categorizarOcupacion } from "@/lib/alumni-import";

export const runtime = "nodejs";

type Payload = {
  datos?: Record<string, string | null>;
  titulos?: {
    titulo: string;
    nivel: string | null;
    instituto: string | null;
    anio: number | null;
  }[];
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "Id inválido" }, { status: 400 });

  let accion: string;
  try {
    accion = String((await req.json())?.accion || "");
  } catch {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (accion !== "aprobar" && accion !== "rechazar") {
    return Response.json({ error: "Acción inválida" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: solicitud, error: e1 } = await admin
    .from("alumni_actualizaciones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) return Response.json({ error: e1.message }, { status: 500 });
  if (!solicitud) return Response.json({ error: "No existe" }, { status: 404 });
  if (solicitud.estado !== "pendiente") {
    return Response.json({ error: "Esta solicitud ya fue revisada." }, { status: 409 });
  }

  if (accion === "aprobar") {
    const payload = (solicitud.payload ?? {}) as Payload;
    const datos = payload.datos ?? {};
    const titulos = payload.titulos ?? [];

    // Ficha destino: la enlazada, o por cédula, o se crea (persona del
    // padrón aún no importada).
    let alumniId: number | null = solicitud.alumni_id;
    if (!alumniId) {
      const { data: porCedula } = await admin
        .from("alumni")
        .select("id")
        .eq("cedula", solicitud.cedula)
        .maybeSingle();
      alumniId = porCedula?.id ?? null;
    }

    const cambios: Record<string, unknown> = {};
    for (const campo of ["genero", "email", "celular", "telefono_fijo", "ciudad", "ocupacion", "cargo", "empresa"]) {
      const v = datos[campo];
      if (v != null && String(v).trim() !== "") cambios[campo] = v;
    }
    if (cambios.ocupacion || cambios.cargo) {
      cambios.ocupacion_categoria = categorizarOcupacion(
        String(cambios.ocupacion ?? ""),
        String(cambios.cargo ?? "")
      );
    }
    cambios.fuente = "autoservicio";
    cambios.estado_verificacion = "verificado";
    cambios.datos_actualizados_at = new Date().toISOString();

    if (!alumniId) {
      const { data: padron } = await admin
        .from("graduados_padron")
        .select("nombres, apellidos")
        .eq("cedula", solicitud.cedula)
        .maybeSingle();
      const { data: creada, error } = await admin
        .from("alumni")
        .insert({
          cedula: solicitud.cedula,
          nombres: padron?.nombres || "—",
          apellidos: padron?.apellidos || "—",
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
      const filas = titulos
        .filter((t) => t?.titulo && String(t.titulo).trim().length >= 3)
        .map((t) => ({
          alumni_id: alumniId!,
          titulo: String(t.titulo).trim().replace(/\s+/g, " ").toUpperCase(),
          nivel_formacion: t.nivel ?? null,
          instituto: t.instituto ? String(t.instituto).trim().toUpperCase() : null,
          anio_graduacion: t.anio ?? null,
          fuente: "autoservicio",
        }));
      if (filas.length > 0) {
        const { error } = await admin
          .from("alumni_titulos")
          .upsert(filas, { onConflict: "alumni_id,titulo,anio_graduacion", ignoreDuplicates: true });
        if (error) return Response.json({ error: error.message }, { status: 500 });
      }
    }
  }

  const { error: e2 } = await admin
    .from("alumni_actualizaciones")
    .update({
      estado: accion === "aprobar" ? "aprobada" : "rechazada",
      revisada_por: perfil!.id,
      revisada_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (e2) return Response.json({ error: e2.message }, { status: 500 });

  return Response.json({ ok: true });
}
