import { useEffect, useRef } from "react";

// Cierre de sesión automático tras 30 minutos de inactividad.
// El contador se reinicia con cualquier actividad del usuario y se
// sincroniza entre pestañas abiertas (localStorage 'storage').
const IDLE_MS = 30 * 60 * 1000;
const SYNC_KEY = "__idle_last_activity";
const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click", "wheel"];

export function useInactivityLogout(onIdle: () => void, enabled = true) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let lastSync = 0;

    const fire = () => onIdleRef.current?.();
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(fire, IDLE_MS);
    };
    const onActivity = () => {
      reset();
      const now = Date.now();
      if (now - lastSync > 5000) {
        lastSync = now;
        try {
          localStorage.setItem(SYNC_KEY, String(now));
        } catch {
          /* ignore */
        }
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SYNC_KEY) reset();
    };

    EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    window.addEventListener("storage", onStorage);
    reset();

    return () => {
      clearTimeout(timer);
      EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled]);
}
