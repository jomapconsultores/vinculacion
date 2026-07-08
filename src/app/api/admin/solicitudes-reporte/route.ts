import { createClient } from "@/lib/supabase/server";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";

export const runtime = "nodejs";

const ROL_LABEL: Record<string, string> = { autoridad: "Autoridad", admin: "Administrador" };
const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

type PerfilRef = {
  nombres: string | null;
  apellidos: string | null;
  email: string | null;
};

type SolicitudRol = {
  id: string;
  rol: string;
  estado: string;
  creado_en: string;
  profiles: PerfilRef | null;
};

export async function GET(req: Request) {
  const formato = new URL(req.url).searchParams.get("formato") === "pdf" ? "pdf" : "excel";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.rol !== "admin") return new Response("Acceso denegado", { status: 403 });

  const { data, error } = await supabase
    .from("solicitudes_rol")
    .select(
      "id, rol, estado, creado_en, profiles!solicitudes_rol_profile_id_fkey(nombres, apellidos, email)"
    )
    .order("creado_en", { ascending: false });
  if (error) {
    console.error("[solicitudes-reporte]", error.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const solicitudes = ((data as unknown as SolicitudRol[]) ?? []).map((s) => ({
    ...s,
    profiles: Array.isArray(s.profiles) ? (s.profiles[0] ?? null) : s.profiles,
  }));

  const nombrePersona = (p: PerfilRef | null): string => {
    const nombre = `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim();
    if (nombre) return nombre;
    return p?.email ?? "—";
  };
  const fechaCorta = (iso: string): string =>
    iso ? new Date(iso).toLocaleDateString("es-EC", { dateStyle: "medium" }) : "—";

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = ["Persona", "Rol solicitado", "Estado", "Fecha de solicitud"];
  const filas: (string | number)[][] = solicitudes.map((s) => [
    nombrePersona(s.profiles),
    ROL_LABEL[s.rol] ?? s.rol,
    ESTADO_LABEL[s.estado] ?? s.estado,
    fechaCorta(s.creado_en),
  ]);

  const cuenta = (estado: string): number => solicitudes.filter((s) => s.estado === estado).length;
  const resumen: (string | number)[][] = [
    ["Solicitudes totales", solicitudes.length],
    ["Pendientes", cuenta("pendiente")],
    ["Aprobadas", cuenta("aprobado")],
    ["Rechazadas", cuenta("rechazado")],
  ];

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Solicitudes de rol",
      subtitulo: "Otorgamiento de roles de autoridad / administrador",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Detalle de solicitudes", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="solicitudes.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Solicitudes de rol", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Solicitudes", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="solicitudes.xlsx"',
    },
  });
}
