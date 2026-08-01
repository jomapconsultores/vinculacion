/* ------------------------------------------------------------
 * Desarrollado por Marco Antonio Posligua San Martín
 * ------------------------------------------------------------ */
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { FaviconLatido } from "@/components/FaviconLatido";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "UCuenca · Proyecto Conecta — Vinculación con Graduados",
  description:
    "Plataforma institucional de vinculación: seguimiento a graduados, empleabilidad con IA, servicios comunitarios e indicadores de acreditación.",
  // Instalable desde el navegador del teléfono (Android e iPhone), sin tiendas.
  manifest: "/manifest.webmanifest",
  icons: {
    // iOS recorta el icono a un cuadrado: se le entrega uno ya cuadrado en vez
    // del logotipo apaisado de la marca, que quedaba destrozado.
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Vinculación",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#003366",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {/* Registra el service worker: es lo que hace la plataforma instalable y
            le da una pantalla propia sin conexión. Ver public/sw.js. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              });
            }`,
          }}
        />
        <FaviconLatido />
        {children}
        <div className="border-t border-slate-200/70 bg-white py-3 text-center text-xs text-slate-400">
          Desarrollado por Marco Antonio Posligua San Martín
        </div>
      </body>
    </html>
  );
}
