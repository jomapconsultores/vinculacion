import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import { LayoutDashboard, HeartHandshake, GraduationCap, BarChart3 } from "lucide-react";

const items: NavItem[] = [
  { href: "/admin", label: "Panel", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/servicios", label: "Servicios", icon: <HeartHandshake className="h-4 w-4" /> },
  { href: "/admin/practicas", label: "Prácticas", icon: <GraduationCap className="h-4 w-4" /> },
  { href: "/admin/indicadores", label: "Indicadores", icon: <BarChart3 className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.rol !== "admin" && profile.rol !== "autoridad") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
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
