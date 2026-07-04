import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generarCertificadoPDF } from "@/lib/cert";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { codigo: string } }) {
  const codigo = params.codigo?.toUpperCase();
  if (!codigo) return NextResponse.json({ error: "Código faltante" }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("competencias_graduado")
    .select("estado, fecha_aval, avalada_por, competencias(nombre, area), profiles(nombres, apellidos), cursos(nombre)")
    .eq("codigo_verificacion", codigo)
    .eq("estado", "avalada")
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });

  const d: any = data;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://conecta.pensamiento-libre.org";
  const buf = await generarCertificadoPDF({
    nombre: `${d.profiles?.nombres ?? ""} ${d.profiles?.apellidos ?? ""}`.trim() || "Graduado",
    competencia: d.competencias?.nombre ?? "Competencia",
    area: d.competencias?.area,
    avaladaPor: d.avalada_por,
    fecha: d.fecha_aval ? String(d.fecha_aval).slice(0, 10) : null,
    curso: d.cursos?.nombre,
    codigo,
    verifyUrl: `${site}/verificar/${codigo}`,
  });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${codigo}.pdf"`,
      // El certificado es inmutable una vez avalado: el mismo código
      // siempre genera el mismo PDF, así que puede cachearse de forma
      // agresiva en vez de regenerarlo en cada apertura del QR.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
