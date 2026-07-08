import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, type NavItem, type RolDisponible } from "@/components/Sidebar";
import { LayoutDashboard, User, FileText, Briefcase, GraduationCap, Award, ScanText, ClipboardList, ClipboardCheck, Brain } from "lucide-react";

const LABELS_ROL: Record<string, string> = {
  estudiante: "Estudiante",
  profesional: "Profesional",
  empleador: "Empleador",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.rol === "empleador") redirect("/empleador");
  if (profile.rol === "admin") redirect("/admin");
  if (profile.rol === "autoridad") redirect(profile.aprobado ? "/admin" : "/pendiente");

  const esEstudiante = profile.rol === "estudiante";

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("roles_asignados")
    .select("rol")
    .eq("profile_id", profile.id);
  const rolesDisponibles: RolDisponible[] = (roles ?? []).map((r) => ({
    rol: r.rol,
    label: LABELS_ROL[r.rol] ?? r.rol.charAt(0).toUpperCase() + r.rol.slice(1),
  }));

  const items: NavItem[] = [
    { href: "/dashboard", label: "Inicio", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/dashboard/perfil", label: "Mi perfil", icon: <User className="h-4 w-4" />, group: "Mi perfil y CV" },
    { href: "/dashboard/analizar", label: "Analizar mi CV", icon: <ScanText className="h-4 w-4" />, group: "Mi perfil y CV" },
    { href: "/dashboard/cv", label: "Mi CV", icon: <FileText className="h-4 w-4" />, group: "Mi perfil y CV" },
    // El estudiante ve sus prácticas; el profesional además busca empleo.
    ...(esEstudiante
      ? [{ href: "/dashboard/practicas", label: "Mis prácticas", icon: <ClipboardCheck className="h-4 w-4" />, group: "Inserción laboral" }]
      : [
          { href: "/dashboard/empleos", label: "Empleos", icon: <Briefcase className="h-4 w-4" />, group: "Inserción laboral" },
          { href: "/dashboard/competencias", label: "Competencias", icon: <Award className="h-4 w-4" />, group: "Inserción laboral" },
        ]),
    { href: "/dashboard/cursos", label: "Educación continua", icon: <GraduationCap className="h-4 w-4" />, group: "Desarrollo profesional" },
    { href: "/dashboard/encuesta", label: "Encuesta de pertinencia", icon: <ClipboardList className="h-4 w-4" />, group: "Desarrollo profesional" },
    { href: "/dashboard/psicometria", label: "Evaluación psicométrica", icon: <Brain className="h-4 w-4" />, group: "Desarrollo profesional" },
  ];

  const rolLabel = esEstudiante ? "Estudiante" : "Profesional";

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        items={items}
        nombre={profile.nombres ?? rolLabel}
        apellido={profile.apellidos ?? ""}
        rol={rolLabel}
        rolesDisponibles={rolesDisponibles}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
