import { createClient } from "@/lib/supabase/server";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";

export const runtime = "nodejs";

type Usuario = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  cedula: string | null;
  email: string | null;
  rol: string | null;
  aprobado: boolean | null;
};

const ROL_LABEL: Record<string, string> = {
  estudiante: "Estudiante",
  profesional: "Profesional",
  empleador: "Empleador",
  autoridad: "Autoridad",
  admin: "Administrador",
};

function estadoUsuario(u: Usuario): string {
  if (u.rol === "autoridad" && !u.aprobado) return "Pendiente";
  return "Activo";
}

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
    .from("profiles")
    .select("id, nombres, apellidos, cedula, email, rol, aprobado")
    .order("apellidos", { ascending: true });
  if (error) {
    console.error("[usuarios-reporte]", error.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const usuarios: Usuario[] = (data as Usuario[]) ?? [];

  const conteoRol = new Map<string, number>();
  for (const u of usuarios) {
    const label = ROL_LABEL[u.rol ?? ""] ?? u.rol ?? "—";
    conteoRol.set(label, (conteoRol.get(label) ?? 0) + 1);
  }
  const pendientes = usuarios.filter((u) => u.rol === "autoridad" && !u.aprobado).length;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = ["Apellidos", "Nombres", "Cédula", "Correo", "Rol", "Estado"];
  const filas: (string | number)[][] = usuarios.map((u) => [
    u.apellidos ?? "—",
    u.nombres ?? "—",
    u.cedula ?? "—",
    u.email ?? "—",
    ROL_LABEL[u.rol ?? ""] ?? u.rol ?? "—",
    estadoUsuario(u),
  ]);

  const resumen: (string | number)[][] = [
    ["Usuarios registrados", usuarios.length],
    ...Array.from(conteoRol.entries()).map(([rol, n]): (string | number)[] => [rol, n]),
    ["Autoridades pendientes", pendientes],
  ];

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Usuarios del sistema",
      subtitulo: "Administración de cuentas, roles y permisos",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Detalle de usuarios", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="usuarios.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Usuarios del sistema", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Usuarios", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="usuarios.xlsx"',
    },
  });
}
