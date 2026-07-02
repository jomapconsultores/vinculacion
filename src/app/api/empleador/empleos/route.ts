import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const profile = await requireProfile();
  if (profile.rol !== "empleador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!profile.empresa_id) {
    return NextResponse.json(
      { error: "Tu cuenta no tiene una empresa asociada." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.titulo?.trim()) {
    return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: empleo, error } = await supabase
    .from("empleos")
    .insert({
      empresa_id: profile.empresa_id,
      titulo: String(body.titulo).trim(),
      descripcion: body.descripcion?.trim() || null,
      ciudad: body.ciudad?.trim() || null,
      modalidad: body.modalidad?.trim() || null,
      salario_min: body.salario_min ?? null,
      salario_max: body.salario_max ?? null,
      estado: "publicado",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !empleo) {
    return NextResponse.json(
      { error: error?.message || "No se pudo crear la oferta." },
      { status: 500 }
    );
  }

  const competencias: number[] = Array.isArray(body.competencias) ? body.competencias : [];
  if (competencias.length) {
    const rows = competencias.map((competencia_id) => ({
      empleo_id: empleo.id,
      competencia_id,
      requerida: true,
    }));
    const { error: cErr } = await supabase.from("empleo_competencias").insert(rows);
    if (cErr) {
      return NextResponse.json(
        { id: empleo.id, warning: "Oferta creada, pero algunas competencias no se guardaron." },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ id: empleo.id });
}
