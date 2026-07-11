"use client";

// Grabación de voz para el asistente de alumni (MediaRecorder).
// Chrome/Android produce audio/webm;codecs=opus; Safari/iOS produce
// audio/mp4 (AAC) — se detecta el tipo soportado y se envía con su MIME y
// extensión reales para que la transcripción lo acepte.

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, AlertTriangle } from "lucide-react";

type Props = {
  onAudio: (audio: File) => Promise<void>; // procesa (sube y transcribe)
  deshabilitado?: boolean;
};

function tipoSoportado(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidatos: { mime: string; ext: string }[] = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ];
  for (const c of candidatos) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return null;
}

const MAX_SEGUNDOS = 120;

export function GrabadorVoz({ onAudio, deshabilitado }: Props) {
  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sinSoporte, setSinSoporte] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tipoSoportado()) setSinSoporte(true);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function iniciar() {
    setError(null);
    const tipo = tipoSoportado();
    if (!tipo) {
      setSinSoporte(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: tipo.mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setGrabando(false);
        const blob = new Blob(chunksRef.current, { type: tipo.mime.split(";")[0] });
        if (blob.size < 1000) {
          setError("La grabación quedó vacía. Intenta de nuevo.");
          return;
        }
        const archivo = new File([blob], `dictado.${tipo.ext}`, { type: blob.type });
        setProcesando(true);
        try {
          await onAudio(archivo);
        } finally {
          setProcesando(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setGrabando(true);
      setSegundos(0);
      timerRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= MAX_SEGUNDOS) detener();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError(
        "No se pudo acceder al micrófono. Revisa los permisos del navegador e intenta de nuevo."
      );
    }
  }

  function detener() {
    recorderRef.current?.stop();
  }

  if (sinSoporte) {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Tu navegador no permite grabar audio. Puedes llenar los campos manualmente.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!grabando && !procesando && (
        <button
          type="button"
          className="btn-primary w-full py-4 text-base"
          onClick={iniciar}
          disabled={deshabilitado}
        >
          <Mic className="h-5 w-5" /> Empezar a dictar
        </button>
      )}
      {grabando && (
        <button
          type="button"
          className="btn-accent w-full animate-pulse py-4 text-base"
          onClick={detener}
        >
          <Square className="h-5 w-5" /> Detener ({segundos}s)
        </button>
      )}
      {procesando && (
        <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-4 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Transcribiendo tu audio…
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
