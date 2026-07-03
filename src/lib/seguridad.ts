// Utilidades de seguridad para endpoints públicos (padrón, senescyt, registro).

// Formato de cédula ecuatoriana: 10 dígitos.
export function cedulaFormato(cedula: string): boolean {
  return /^\d{10}$/.test((cedula || "").replace(/\D/g, ""));
}

// Limitador de tasa en memoria (ventana deslizante) por clave (p. ej. IP+ruta).
// Suficiente para frenar enumeración masiva en un contenedor; no es un límite
// distribuido. Para varias instancias, migrar a un store compartido.
const hits = new Map<string, number[]>();

export function limiteExcedido(clave: string, max: number, ventanaMs: number, ahora: number): boolean {
  const desde = ahora - ventanaMs;
  const previos = (hits.get(clave) ?? []).filter((t) => t > desde);
  previos.push(ahora);
  hits.set(clave, previos);
  // Limpieza oportunista para no crecer sin límite
  if (hits.size > 5000) {
    const vaciar: string[] = [];
    hits.forEach((v, k) => {
      if (v.every((t) => t <= desde)) vaciar.push(k);
    });
    vaciar.forEach((k) => hits.delete(k));
  }
  return previos.length > max;
}

// Obtiene la IP del cliente a partir de las cabeceras del proxy.
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "desconocida";
}
