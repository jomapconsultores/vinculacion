import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import { LayoutDashboard, HeartHandshake, GraduationCap, BarChart3, TrendingUp, ClipboardList, UserCheck, Brain } from "lucide-react";

const baseItems: NavItem[] = [
  { href: "/admin", label: "Panel", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/empleabilidad", label: "Empleabilidad", icon: <TrendingUp className="h-4 w-4" /> },
  { href: "/admin/servicios", label: "Servicios", icon: <HeartHandshake className="h-4 w-4" /> },
  { href: "/admin/practicas", label: "Prácticas", icon: <GraduationCap className="h-4 w-4" /> },
  { href: "/admin/indicadores", label: "Indicadores", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/admin/encuestas", label: "Encuestas", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/admin/psicometria", label: "Psicometría", icon: <Brain className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.rol === "empleador") redirect("/empleador");
  if (["estudiante", "profesional", "graduado"].includes(profile.rol)) redirect("/dashboard");
  if (profile.rol === "autoridad" && !profile.aprobado) redirect("/pendiente");
  // Solo administrador o autoridad aprobada continúan.

  const items: NavItem[] =
    profile.rol === "admin"
      ? [...baseItems, { href: "/admin/solicitudes", label: "Solicitudes", icon: <UserCheck className="h-4 w-4" /> }]
      : baseItems;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        items={items}
        nombre={profile.nombres ?? "Autoridad"}
        apellido={profile.apellidos ?? ""}
        rol={profile.rol}
      />
      <main className="flex-1 overflow-x-hidden bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
