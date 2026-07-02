import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import { LayoutDashboard, Briefcase, Users, Building2, ClipboardList } from "lucide-react";

const items: NavItem[] = [
  { href: "/empleador", label: "Inicio", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/empleador/empleos", label: "Mis ofertas", icon: <Briefcase className="h-4 w-4" /> },
  { href: "/empleador/candidatos", label: "Candidatos", icon: <Users className="h-4 w-4" /> },
  { href: "/empleador/encuesta", label: "Encuesta", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/empleador/empresa", label: "Mi empresa", icon: <Building2 className="h-4 w-4" /> },
];

export default async function EmpleadorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.rol !== "empleador") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={items}
        nombre={profile.nombres ?? "Empleador"}
        apellido={profile.apellidos ?? ""}
        rol={profile.rol}
      />
      <main className="flex-1 overflow-x-hidden bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
