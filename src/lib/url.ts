// Origen público real detrás de un proxy inverso (Coolify/Traefik).
//
// Dentro del contenedor `request.url` es `http://localhost:3000/...` (la app
// escucha ahí), así que construir redirects absolutos con ese valor manda al
// usuario a localhost —una URL que su navegador no puede alcanzar—. Se
// reconstruye el origen desde las cabeceras que inyecta el proxy
// (X-Forwarded-Proto / X-Forwarded-Host), con el Host como respaldo.
export function origenPublico(request: Request): string {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  const host =
    h.get("x-forwarded-host")?.split(",")[0].trim() ||
    h.get("host") ||
    "";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
