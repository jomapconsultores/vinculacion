import { NextResponse } from "next/server";
import { consultarSenescyt, SENESCYT_URL_OFICIAL } from "@/lib/senescyt";

// Consulta de títulos por cédula (usada en el registro y en el perfil).
export async function GET(req: Request) {
  const cedula = new URL(req.url).searchParams.get("cedula")?.trim() ?? "";
  if (cedula.replace(/\D/g, "").length !== 10) {
    return NextResponse.json({ encontrado: false, titulos: [] });
  }
  try {
    const titulos = await consultarSenescyt(cedula);
    return NextResponse.json({
      encontrado: titulos.length > 0,
      titulos,
      verificacion_oficial: SENESCYT_URL_OFICIAL,
    });
  } catch {
    return NextResponse.json({ encontrado: false, titulos: [] });
  }
}
