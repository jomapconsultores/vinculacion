import { createClient } from "@/lib/supabase/server";
import { libroExcel } from "@/lib/excel";
import { reportePdf } from "@/lib/pdf";
import { MODULOS_DISPONIBLES } from "@/lib/modulos";

export const runtime = "nodejs";

type Autoridad = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  email: string | null;
  aprobado: boolean;
};

type PermisoModulo = {
  profile_id: string;
  modulo: string;
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

  const [{ data: autoridadesData, error: errAut }, { data: permisosData, error: errPerm }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nombres, apellidos, email, aprobado")
        .eq("rol", "autoridad")
        .order("apellidos", { ascending: true }),
      supabase.from("permisos_modulo").select("profile_id, modulo"),
    ]);

  if (errAut || errPerm) {
    console.error("[autoridades-reporte]", errAut?.message ?? errPerm?.message);
    return new Response("No se pudo generar el reporte.", { status: 500 });
  }

  const autoridades: Autoridad[] = (autoridadesData as Autoridad[]) ?? [];
  const permisos: PermisoModulo[] = (permisosData as PermisoModulo[]) ?? [];

  const etiquetaModulo = (value: string): string =>
    MODULOS_DISPONIBLES.find((m) => m.value === value)?.label ?? value;

  const generado = new Date().toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" });

  const encabezados = ["Apellidos", "Nombres", "Correo", "Estado", "Módulos con acceso"];
  const filas: (string | number)[][] = autoridades.map((a) => {
    const modulos = permisos
      .filter((p) => p.profile_id === a.id)
      .map((p) => etiquetaModulo(p.modulo))
      .sort((x, y) => x.localeCompare(y, "es"));
    return [
      a.apellidos ?? "—",
      a.nombres ?? "—",
      a.email ?? "—",
      a.aprobado ? "Aprobada" : "Pendiente de aprobación",
      modulos.length > 0 ? modulos.join(", ") : "Sin módulos",
    ];
  });

  const aprobadas = autoridades.filter((a) => a.aprobado).length;
  const resumen: (string | number)[][] = [
    ["Autoridades registradas", autoridades.length],
    ["Aprobadas", aprobadas],
    ["Pendientes de aprobación", autoridades.length - aprobadas],
    ["Asignaciones de módulo (total)", permisos.length],
  ];

  if (formato === "pdf") {
    const bytes = await reportePdf({
      titulo: "Autoridades",
      subtitulo: "Accesos por módulo de /admin",
      generado,
      secciones: [
        { titulo: "Resumen", encabezados: ["Indicador", "Valor"], filas: resumen },
        { titulo: "Detalle de autoridades", encabezados, filas },
      ],
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="autoridades.pdf"',
      },
    });
  }

  const buf = libroExcel([
    {
      nombre: "Resumen",
      titulo: ["Autoridades — Accesos por módulo", `Generado: ${generado}`],
      encabezados: ["Indicador", "Valor"],
      filas: resumen,
    },
    { nombre: "Autoridades", encabezados, filas },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="autoridades.xlsx"',
    },
  });
}
