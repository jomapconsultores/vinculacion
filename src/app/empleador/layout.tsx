import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, type NavItem, type RolDisponible } from "@/components/Sidebar";
import { LayoutDashboard, Briefcase, Users, Building2, ClipboardList } from "lucide-react";

const items: NavItem[] = [
  { href: "/empleador", label: "Inicio", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/empleador/empleos", label: "Mis ofertas", icon: <Briefcase className="h-4 w-4" /> },
  { href: "/empleador/candidatos", label: "Candidatos", icon: <Users className="h-4 w-4" /> },
  { href: "/empleador/encuesta", label: "Encuesta", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/empleador/empresa", label: "Mi empresa", icon: <Building2 className="h-4 w-4" /> },
];

const LABELS_ROL: Record<string, string> = {
  estudiante: "Estudiante",
  profesional: "Profesional",
  empleador: "Empleador",
};

export default async function EmpleadorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.rol !== "empleador") redirect("/dashboard");

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("roles_asignados")
    .select("rol")
    .eq("profile_id", profile.id);
  const rolesDisponibles: RolDisponible[] = (roles ?? []).map((r) => ({
    rol: r.rol,
    label: LABELS_ROL[r.rol] ?? r.rol.charAt(0).toUpperCase() + r.rol.slice(1),
  }));

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        items={items}
        nombre={profile.nombres ?? "Empleador"}
        apellido={profile.apellidos ?? ""}
        rol={profile.rol}
        rolesDisponibles={rolesDisponibles}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
