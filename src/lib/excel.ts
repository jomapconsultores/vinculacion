// Helper para construir libros Excel (.xlsx) con SheetJS de forma consistente:
// anchos de columna automáticos, autofiltro en la tabla y filas de título
// opcionales por hoja.
import * as XLSX from "xlsx";

export type Hoja = {
  nombre: string; // nombre de pestaña (Excel limita a 31 caracteres)
  encabezados: string[];
  filas: (string | number)[][];
  titulo?: string[]; // filas de título por encima de la tabla (opcional)
};

function anchos(aoa: (string | number)[][]): { wch: number }[] {
  const cols = Math.max(0, ...aoa.map((f) => f.length));
  const w: number[] = new Array(cols).fill(10);
  for (const fila of aoa) {
    fila.forEach((celda, i) => {
      const len = String(celda ?? "").length + 2;
      if (len > w[i]) w[i] = len;
    });
  }
  return w.map((n) => ({ wch: Math.min(Math.max(n, 10), 48) }));
}

// Índice de columna (0-based) a letra de Excel: 0->A, 25->Z, 26->AA…
function colLetra(idx: number): string {
  let s = "";
  let n = idx;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function libroExcel(hojas: Hoja[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const h of hojas) {
    const aoa: (string | number)[][] = [];
    if (h.titulo?.length) {
      h.titulo.forEach((t) => aoa.push([t]));
      aoa.push([]);
    }
    const filaEncabezado = aoa.length; // 0-based
    aoa.push(h.encabezados);
    for (const f of h.filas) aoa.push(f);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = anchos(aoa);
    if (h.filas.length > 0) {
      const ultima = colLetra(h.encabezados.length - 1);
      const r0 = filaEncabezado + 1; // 1-based
      ws["!autofilter"] = { ref: `A${r0}:${ultima}${r0 + h.filas.length}` };
    }
    XLSX.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31));
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
