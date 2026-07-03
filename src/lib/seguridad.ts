// Utilidades de seguridad para endpoints públicos (padrón, senescyt, registro).

// Formato de cédula ecuatoriana: 10 dígitos.
export function cedulaFormato(cedula: string): boolean {
  return /^\d{10}$/.test((cedula || "").replace(/\D/g, ""));
}

// Valida el dígito verificador de una cédula ecuatoriana (algoritmo módulo 10).
// Filtra números de 10 dígitos "con forma correcta" pero inventados/mal leídos
// (p. ej. por OCR): una cédula real siempre pasa este checksum.
export function cedulaValida(cedula: string): boolean {
  const c = (cedula || "").replace(/\D/g, "");
  if (!/^\d{10}$/.test(c)) return false;
  const provincia = Number(c.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  const digitos = c.split("").map(Number);
  const verificador = digitos[9];
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const suma = coeficientes.reduce((acc, coef, i) => {
    const prod = digitos[i] * coef;
    return acc + (prod >= 10 ? prod - 9 : prod);
  }, 0);
  const esperado = (10 - (suma % 10)) % 10;
  return esperado === verificador;
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
