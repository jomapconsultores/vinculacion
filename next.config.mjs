// Cabeceras de seguridad HTTP (ausentes en producción: ver auditoría).
//
// CORRECCIÓN: la versión anterior de este archivo asumía que la app "no usa
// scripts inline" y ponía script-src 'self' sin 'unsafe-inline'. Eso es falso:
// el propio App Router de Next.js inyecta <script> inline en cada página para
// el streaming de RSC y el bootstrap de hidratación (self.__next_f.push(...)),
// confirmado viendo el HTML servido en producción. Con 'unsafe-inline'
// ausente, el navegador bloqueaba esos scripts y TODA la interactividad de
// cliente dejaba de funcionar sitio-wide (formularios, botones, el ojito de
// contraseña, etc.) sin ningún error visible en la UI. Se agrega
// 'unsafe-inline' a script-src para restaurar la hidratación.
const SUPABASE_HOST = "rfijjtvozncllqvocdat.supabase.co";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: https://${SUPABASE_HOST}`,
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
  { key: "Content-Security-Policy", value: CSP },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactiva "Collecting build traces" (solo necesario para standalone/serverless).
  // Se cuelga en servidores con poca memoria; usamos `next start` con node_modules completo.
  outputFileTracing: false,
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: SUPABASE_HOST },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
