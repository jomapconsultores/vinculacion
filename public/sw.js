/* ------------------------------------------------------------
 * Desarrollado por Marco Antonio Posligua San Martín
 * ------------------------------------------------------------ */

/* Service worker del Proyecto Conecta.
 *
 * Hace instalable la plataforma (PWA) y le da una pantalla digna sin conexión.
 * Es deliberadamente conservador:
 *
 *   - NUNCA cachea nada que exija sesión. Son datos personales de graduados y
 *     decisiones de permisos: servir una copia vieja sería mostrar información
 *     equivocada o dejar ver algo a quien ya no debería.
 *   - Para la navegación usa "red primero": si hay internet manda el servidor;
 *     si no, se responde con lo último visto y, si no hay nada, con /offline.
 *   - Para los estáticos usa "caché primero", que es donde esto rinde.
 */

const VERSION = 'conecta-v1';
const CACHE_PAGINAS = `${VERSION}-paginas`;
const CACHE_ESTATICOS = `${VERSION}-estaticos`;
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGINAS).then((c) => c.addAll([OFFLINE])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

/* Rutas que jamás deben servirse desde caché.
 *
 * Las cuatro primeras son EXACTAMENTE las que exigen sesión en
 * src/lib/supabase/middleware.ts (isProtected). Si allí se añade una zona
 * protegida, hay que añadirla también aquí: si no, su HTML —con datos
 * personales del graduado— quedaría escrito en el disco del dispositivo y
 * seguiría siendo legible después de cerrar sesión.
 *
 * Las últimas son las pantallas del flujo de acceso: llevan códigos de un solo
 * uso en la URL y no tiene ningún sentido conservarlas.
 */
const RUTAS_PRIVADAS = [
  '/dashboard', '/empleador', '/admin', '/cuenta',   // = isProtected del middleware
  '/api', '/auth',                                   // datos y sesión
  '/login', '/register', '/recuperar', '/restablecer', '/actualiza-datos',
];

function esPrivado(url) {
  return RUTAS_PRIVADAS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (esPrivado(url)) return; // se deja pasar a la red, sin tocar

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Solo se guarda lo que llegó bien y de este mismo servidor. Sin esta
          // comprobación, un error 500 o una redirección al login se quedaban
          // guardados y luego se servían como si fueran la página buena.
          if (res.ok && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE_PAGINAS).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE))),
    );
    return;
  }

  if (/\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cacheado) => cacheado || fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE_ESTATICOS).then((c) => c.put(req, copia));
        }
        return res;
      })),
    );
  }
});
