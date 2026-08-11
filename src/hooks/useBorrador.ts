/* ------------------------------------------------------------
 * Desarrollado por Marco Antonio Posligua San Martín
 * ------------------------------------------------------------ */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useBorrador — igual que useState, pero lo escrito se guarda al instante en el
 * navegador y sobrevive a recargas, cortes de internet y cierres de sesión.
 *
 *   const [respuestas, setRespuestas, borrador] = useBorrador(clave, {});
 *
 * Nació por las encuestas: sus respuestas vivían solo en memoria y el envío es
 * todo-o-nada, así que el cierre por inactividad a los 20 minutos borraba de un
 * golpe una encuesta a medio responder. Eso es trabajo de un tercero que casi
 * nunca se repite.
 *
 * `clave` puede llegar como null mientras se averigua quién es el usuario: hasta
 * entonces no se lee ni se escribe nada, y en cuanto llega se carga el borrador
 * que le corresponde. Incluir el id del usuario en la clave evita que en un
 * equipo compartido una persona vea lo que empezó a escribir otra.
 *
 * Sobre Next.js: NO se lee localStorage durante el render. El App Router
 * renderiza este componente también en el servidor, donde `localStorage` no
 * existe; hacerlo dentro de useState reventaría el render o provocaría un
 * desajuste de hidratación. Por eso se carga en un efecto, ya en el navegador.
 */
export type EstadoBorrador = {
  /** true cuando se recuperó algo de una sesión anterior. */
  recuperado: boolean;
  /** Momento del último guardado, para poder decírselo al usuario. */
  guardadoEn: Date | null;
  /** Borra el borrador. Úsalo tras enviar con éxito. */
  descartar: () => void;
};

export function useBorrador<T>(
  clave: string | null,
  inicial: T,
): [T, React.Dispatch<React.SetStateAction<T>>, EstadoBorrador] {
  const [valor, setValor] = useState<T>(inicial);
  const [recuperado, setRecuperado] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState<Date | null>(null);

  // Hasta que no se haya intentado cargar, no se escribe: si no, el efecto de
  // guardado se dispararía primero con el valor inicial vacío y machacaría el
  // borrador justo antes de leerlo.
  const cargado = useRef(false);
  const claveRef = useRef<string | null>(null);

  // Cargar (o recargar si cambia la clave).
  useEffect(() => {
    if (!clave) return;
    if (claveRef.current === clave) return;
    claveRef.current = clave;
    cargado.current = false;
    try {
      const crudo = window.localStorage.getItem(clave);
      if (crudo != null) {
        setValor(JSON.parse(crudo) as T);
        setRecuperado(true);
      }
    } catch {
      // localStorage bloqueado (modo privado) o JSON corrupto: se sigue sin
      // borrador en vez de romper la pantalla.
    }
    cargado.current = true;
  }, [clave]);

  // Guardar en cada cambio.
  useEffect(() => {
    if (!clave || !cargado.current) return;
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor));
      setGuardadoEn(new Date());
    } catch {
      // Sin espacio o almacenamiento bloqueado: no se avisa para no interrumpir
      // a quien está respondiendo; simplemente no hay red de seguridad.
    }
  }, [clave, valor]);

  const descartar = useCallback(() => {
    setRecuperado(false);
    setGuardadoEn(null);
    if (!clave) return;
    try {
      window.localStorage.removeItem(clave);
    } catch {
      /* noop */
    }
  }, [clave]);

  return [valor, setValor, { recuperado, guardadoEn, descartar }];
}

export default useBorrador;
