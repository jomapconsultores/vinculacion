import { redirect } from "next/navigation";

// La bolsa pública redirige al panel; el middleware envía a /login si no hay sesión.
export default function EmpleosPublicos() {
  redirect("/dashboard/empleos");
}
