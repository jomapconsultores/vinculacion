import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, type NavItem, type RolDisponible } from "@/components/Sidebar";
import { LayoutDashboard, HeartHandshake, GraduationCap, BarChart3, TrendingUp, ClipboardList, UserCheck, Brain, Users, ShieldCheck, UsersRound } from "lucide-react";

const LABELS_ROL: Record<string, string> = {
  estudiante: "Estudiante",
  profesional: "Profesional",
  empleador: "Empleador",
};

// Agrupados por módulo (mismo concepto que permisos_modulo, ver
// supabase/migrations/0032_permisos_modulo.sql): el orden del arreglo es el
// orden visual, y los ítems consecutivos con el mismo `group` se muestran
// juntos bajo un encabezado en el Sidebar.
const baseItems: NavItem[] = [
  { href: "/admin", label: "Panel", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/personas", label: "Personas", icon: <Users className="h-4 w-4" />, group: "Alumni y graduados" },
  { href: "/admin/alumni", label: "Alumni", icon: <GraduationCap className="h-4 w-4" />, group: "Alumni y graduados" },
  { href: "/admin/empleabilidad", label: "Empleabilidad", icon: <TrendingUp className="h-4 w-4" />, group: "Inserción laboral" },
  { href: "/admin/servicios", label: "Servicios", icon: <HeartHandshake className="h-4 w-4" />, group: "Servicios y prácticas" },
  { href: "/admin/practicas", label: "Prácticas", icon: <GraduationCap className="h-4 w-4" />, group: "Servicios y prácticas" },
  { href: "/admin/cursos", label: "Revisión de cursos", icon: <UserCheck className="h-4 w-4" />, group: "Servicios y prácticas" },
  { href: "/admin/indicadores", label: "Indicadores", icon: <BarChart3 className="h-4 w-4" />, group: "Indicadores y acreditación" },
  { href: "/admin/encuestas", label: "Encuestas", icon: <ClipboardList className="h-4 w-4" />, group: "Indicadores y acreditación" },
  { href: "/admin/psicometria", label: "Psicometría", icon: <Brain className="h-4 w-4" />, group: "Indicadores y acreditación" },
];

// Mapa href -> slug de módulo (permisos_modulo.modulo). "/admin" no tiene
// módulo asociado: siempre visible para cualquier autoridad aprobada.
const MODULO_POR_HREF: Record<string, string> = {
  "/admin/personas": "personas",
  "/admin/alumni": "alumni",
  "/admin/empleabilidad": "empleabilidad",
  "/admin/servicios": "servicios",
  "/admin/practicas": "practicas",
  "/admin/cursos": "cursos",
  "/admin/indicadores": "indicadores",
  "/admin/encuestas": "encuestas",
  "/admin/psicometria": "psicometria",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.rol === "empleador") redirect("/empleador");
  if (["estudiante", "profesional", "graduado"].includes(profile.rol)) redirect("/dashboard");
  if (profile.rol === "autoridad" && !profile.aprobado) redirect("/pendiente");
  // Solo administrador o autoridad aprobada continúan.

  const supabase = await createClient();
  const [{ data: roles }, { data: permisos }] = await Promise.all([
    supabase.from("roles_asignados").select("rol").eq("profile_id", profile.id),
    profile.rol === "admin"
      ? Promise.resolve({ data: null })
      : supabase.from("permisos_modulo").select("modulo").eq("profile_id", profile.id),
  ]);
  const rolesDisponibles: RolDisponible[] = (roles ?? []).map((r) => ({
    rol: r.rol,
    label: LABELS_ROL[r.rol] ?? r.rol.charAt(0).toUpperCase() + r.rol.slice(1),
  }));

  // Admin ve todo. Autoridad solo ve "/admin" + los módulos para los que
  // tiene un permiso otorgado en permisos_modulo.
  const modulosPermitidos = new Set((permisos ?? []).map((p) => p.modulo));
  const itemsVisibles =
    profile.rol === "admin"
      ? baseItems
      : baseItems.filter((item) => {
          const modulo = MODULO_POR_HREF[item.href];
          return !modulo || modulosPermitidos.has(modulo);
        });

  const items: NavItem[] =
    profile.rol === "admin"
      ? [
          ...itemsVisibles,
          { href: "/admin/usuarios", label: "Usuarios", icon: <UsersRound className="h-4 w-4" />, group: "Administración" },
          { href: "/admin/solicitudes", label: "Solicitudes", icon: <UserCheck className="h-4 w-4" />, group: "Administración" },
          { href: "/admin/autoridades", label: "Autoridades", icon: <ShieldCheck className="h-4 w-4" />, group: "Administración" },
        ]
      : itemsVisibles;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        items={items}
        nombre={profile.nombres ?? "Autoridad"}
        apellido={profile.apellidos ?? ""}
        rol={profile.rol}
        rolesDisponibles={rolesDisponibles}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
