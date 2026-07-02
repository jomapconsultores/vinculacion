import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import { LayoutDashboard, User, FileText, Briefcase, GraduationCap, Award } from "lucide-react";

const items: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/dashboard/perfil", label: "Mi perfil", icon: <User className="h-4 w-4" /> },
  { href: "/dashboard/cv", label: "Mi CV", icon: <FileText className="h-4 w-4" /> },
  { href: "/dashboard/empleos", label: "Empleos", icon: <Briefcase className="h-4 w-4" /> },
  { href: "/dashboard/competencias", label: "Competencias", icon: <Award className="h-4 w-4" /> },
  { href: "/dashboard/cursos", label: "Educación continua", icon: <GraduationCap className="h-4 w-4" /> },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.rol === "empleador") redirect("/empleador");
  if (profile.rol === "admin" || profile.rol === "autoridad") redirect("/admin");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={items}
        nombre={profile.nombres ?? "Graduado"}
        apellido={profile.apellidos ?? ""}
        rol={profile.rol}
      />
      <main className="flex-1 overflow-x-hidden bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
