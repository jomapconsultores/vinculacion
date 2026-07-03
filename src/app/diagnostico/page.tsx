"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Check = { nombre: string; ok: boolean | null; detalle?: string };

export default function DiagnosticoPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [corriendo, setCorriendo] = useState(true);

  useEffect(() => {
    (async () => {
      const resultados: Check[] = [];
      const add = (c: Check) => {
        resultados.push(c);
        setChecks([...resultados]);
      };

      // 1. Cookies habilitadas
      let cookies = false;
      try {
        document.cookie = "diag=1; path=/";
        cookies = document.cookie.includes("diag=1");
      } catch {}
      add({ nombre: "Cookies habilitadas", ok: cookies });

      // 2. API del sitio alcanzable + hora del servidor
      let api = false;
      let skewSeg: number | null = null;
      try {
        const t0 = Date.now();
        const r = await fetch("/api/padron?cedula=0000000000", { cache: "no-store" });
        api = r.ok;
        const fecha = r.headers.get("date");
        if (fecha) skewSeg = Math.round((new Date(fecha).getTime() - (t0 + Date.now()) / 2) / 1000);
      } catch {}
      add({ nombre: "Conexión con el servidor del sitio", ok: api });

      // 3. Reloj del dispositivo
      const relojOk = skewSeg === null ? null : Math.abs(skewSeg) < 120;
      add({
        nombre: "Hora del dispositivo",
        ok: relojOk,
        detalle: skewSeg === null ? "no medible" : `desfase ${skewSeg}s`,
      });

      // 4. Endpoint de sesión
      let sesionApi = false;
      let autenticado = false;
      try {
        const r = await fetch("/api/auth/password", { cache: "no-store" });
        sesionApi = r.ok;
        const j = await r.json();
        autenticado = !!j.authenticated;
      } catch {}
      add({ nombre: "Servicio de sesión", ok: sesionApi, detalle: autenticado ? "hay sesión activa" : "sin sesión" });

      // 5. Login de prueba con credenciales inválidas (debe responder 401 limpio)
      let loginApi: boolean | null = null;
      try {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "diagnostico@conecta.demo", password: "x-invalida-x" }),
        });
        loginApi = r.status === 401 || r.ok;
      } catch {
        loginApi = false;
      }
      add({ nombre: "Servicio de inicio de sesión", ok: loginApi });

      // Enviar reporte
      try {
        const r = await fetch("/api/diagnostico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cookies,
            api,
            skewSeg,
            sesionApi,
            autenticado,
            loginApi,
            url: location.href,
            pantalla: `${screen.width}x${screen.height}`,
            idioma: navigator.language,
            online: navigator.onLine,
          }),
        });
        const j = await r.json();
        if (j.id) setCodigo(String(j.id));
      } catch {}
      setCorriendo(false);
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2 font-semibold text-blue-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          Diagnóstico de conexión
        </div>

        <ul className="space-y-3">
          {checks.map((c, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              {c.ok === null ? (
                <span className="h-5 w-5 rounded-full bg-slate-200" />
              ) : c.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-red-500" />
              )}
              <span className="text-slate-700">{c.nombre}</span>
              {c.detalle && <span className="ml-auto text-xs text-slate-400">{c.detalle}</span>}
            </li>
          ))}
        </ul>

        {corriendo && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Ejecutando pruebas…
          </p>
        )}

        {!corriendo && (
          <div className="mt-5 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            {codigo ? (
              <>Diagnóstico enviado. <b>Código: D-{codigo}</b>. Comparte este código con soporte.</>
            ) : (
              <>No se pudo enviar el reporte al servidor — comparte una foto de esta pantalla con soporte.</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
