// Consulta EN VIVO al sistema oficial de SENESCYT (consulta-titulos-web).
// El servicio oficial usa un captcha de imagen para impedir la consulta
// automática, por lo que el flujo es "humano en el bucle": el usuario resuelve
// el captcha real de SENESCYT y el servidor relaya la consulta y parsea la
// respuesta real. No se elude ningún control: la persona presente lo resuelve.

const BASE = "https://www.senescyt.gob.ec/consulta-titulos-web/faces/vista/consulta/consulta.xhtml";
const HOST = "https://www.senescyt.gob.ec";
const UA = "Mozilla/5.0 (compatible; ProyectoConecta/1.0)";

export type TituloLive = {
  titulo: string;
  institucion: string;
  tipo: string;
  numero_registro: string;
  fecha_registro: string;
  area: string;
};

export type SesionSenescyt = { jsessionid: string; viewstate: string; captcha: string };

function jsessionFrom(headers: Headers): string {
  const all = (headers as any).getSetCookie?.() ?? [];
  for (const c of all) {
    const m = String(c).match(/JSESSIONID=[^;]+/);
    if (m) return m[0];
  }
  const single = headers.get("set-cookie") || "";
  const m = single.match(/JSESSIONID=[^;]+/);
  return m ? m[0] : "";
}

// 1) Abre una sesión en SENESCYT y devuelve el captcha para que el usuario lo lea.
export async function iniciarSesionSenescyt(): Promise<SesionSenescyt> {
  const r = await fetch(BASE, { headers: { "User-Agent": UA } });
  const cookie = jsessionFrom(r.headers);
  const html = await r.text();
  const viewstate = (html.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]*)"/) || [])[1] || "";
  const capsrc = (html.match(/src="([^"]*[Cc]aptcha[^"]*)"/) || [])[1] || "";
  if (!cookie || !viewstate || !capsrc) throw new Error("No se pudo iniciar la sesión con SENESCYT.");

  const rc = await fetch(HOST + capsrc, {
    headers: { Cookie: cookie, "User-Agent": UA, Referer: BASE },
  });
  const buf = Buffer.from(await rc.arrayBuffer());
  return {
    jsessionid: cookie,
    viewstate,
    captcha: `data:image/jpeg;base64,${buf.toString("base64")}`,
  };
}

function limpiarCelda(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó").replace(/&Uacute;/g, "Ú").replace(/&Ntilde;/g, "Ñ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ResultadoLive =
  | { ok: true; nombre: string; titulos: TituloLive[] }
  | { ok: false; motivo: "captcha" | "sin_sesion" | "error"; detalle?: string };

// 2) Envía la consulta con el captcha que resolvió el usuario y parsea la respuesta real.
export async function consultarSenescytLive(args: {
  jsessionid: string;
  viewstate: string;
  cedula: string;
  captcha: string;
}): Promise<ResultadoLive> {
  const cedula = (args.cedula || "").replace(/\D/g, "");
  if (cedula.length !== 10) return { ok: false, motivo: "error", detalle: "Cédula inválida" };
  if (!args.jsessionid || !args.viewstate) return { ok: false, motivo: "sin_sesion" };

  const body = new URLSearchParams({
    "javax.faces.partial.ajax": "true",
    "javax.faces.source": "formPrincipal:boton-buscar",
    "javax.faces.partial.execute": "formPrincipal",
    "javax.faces.partial.render": "formPrincipal",
    "formPrincipal:boton-buscar": "formPrincipal:boton-buscar",
    formPrincipal: "formPrincipal",
    "formPrincipal:identificacion": cedula,
    "formPrincipal:apellidos": "",
    "formPrincipal:captchaSellerInput": (args.captcha || "").trim(),
    "javax.faces.ViewState": args.viewstate,
  });

  let raw: string;
  try {
    const r = await fetch(BASE, {
      method: "POST",
      headers: {
        Cookie: args.jsessionid,
        "User-Agent": UA,
        Referer: BASE,
        "Faces-Request": "partial/ajax",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    raw = await r.text();
  } catch (e: any) {
    return { ok: false, motivo: "error", detalle: e?.message };
  }

  const cdata = Array.from(raw.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)).map((m) => m[1]).join("\n") || raw;
  const low = cdata.toLowerCase();

  if (/caracteres incorrectos/.test(low) || /(c[oó]digo|captcha)[^<]{0,40}(incorrect|inv[aá]lid)/.test(low)) {
    return { ok: false, motivo: "captcha" };
  }

  // Nombre del titular (aparece tras la etiqueta "Nombres:")
  let nombre = "";
  const mNombre = cdata.match(/Nombres:\s*<\/label>[\s\S]{0,160}?<label[^>]*>([^<]+)<\/label>/i);
  if (mNombre) nombre = limpiarCelda(mNombre[1]);

  // Cada título viene en una datatable "tablaAplicaciones"
  const titulos: TituloLive[] = [];
  const tbodies = Array.from(cdata.matchAll(/<tbody[^>]*tablaAplicaciones_data[^>]*>([\s\S]*?)<\/tbody>/g));
  for (const tb of tbodies) {
    const filas = Array.from(tb[1].matchAll(/<tr[^>]*role="row"[^>]*>([\s\S]*?)<\/tr>/g));
    for (const f of filas) {
      const celdas = Array.from(f[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g))
        .map((c) => limpiarCelda(c[1]))
        .filter((c) => c.length > 0);
      if (celdas.length < 2) continue;
      // Identificar cada dato por su patrón (robusto ante columnas vacías)
      const numero = celdas.find((c) => /^\d{3,4}-\d{2}-\d+$/.test(c)) || "";
      const fecha = celdas.find((c) => /^\d{4}-\d{2}-\d{2}$/.test(c)) || "";
      const tipo = celdas.find((c) => /^(nacional|extranjer)/i.test(c)) || "";
      const usados = new Set([celdas[0], celdas[1], numero, fecha, tipo]);
      const area = celdas.slice(2).filter((c) => !usados.has(c)).sort((a, b) => b.length - a.length)[0] || "";
      titulos.push({
        titulo: celdas[0],
        institucion: celdas[1] || "",
        tipo,
        numero_registro: numero,
        fecha_registro: fecha,
        area,
      });
    }
  }

  return { ok: true, nombre, titulos };
}

// Divide el nombre de SENESCYT (formato Apellidos + Nombres) en partes.
// Ecuador: normalmente 2 apellidos + 1-2 nombres. Heurística: los 2 últimos
// tokens son nombres; el resto, apellidos.
export function partirNombre(completo: string): { nombres: string; apellidos: string } {
  const t = (completo || "").trim().split(/\s+/).filter(Boolean);
  if (t.length <= 1) return { nombres: t[0] ?? "", apellidos: "" };
  if (t.length === 2) return { apellidos: t[0], nombres: t[1] };
  if (t.length === 3) return { apellidos: t.slice(0, 2).join(" "), nombres: t[2] };
  return { apellidos: t.slice(0, t.length - 2).join(" "), nombres: t.slice(-2).join(" ") };
}
