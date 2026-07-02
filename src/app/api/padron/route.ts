import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Vista previa del padrón por cédula (para el registro).
// Usa service role porque el padrón está protegido por RLS.
export async function GET(req: Request) {
  const cedula = new URL(req.url).searchParams.get("cedula")?.trim();
  if (!cedula || cedula.length < 10) {
    return NextResponse.json({ encontrado: false });
  }
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("graduados_padron")
      .select("nombres, apellidos, titulo, anio_graduacion, carreras(nombre)")
      .eq("cedula", cedula)
      .maybeSingle();

    if (!data) return NextResponse.json({ encontrado: false });

    return NextResponse.json({
      encontrado: true,
      nombres: data.nombres,
      apellidos: data.apellidos,
      titulo: data.titulo,
      anio_graduacion: data.anio_graduacion,
      carrera: (data as any).carreras?.nombre ?? null,
    });
  } catch {
    return NextResponse.json({ encontrado: false });
  }
}
