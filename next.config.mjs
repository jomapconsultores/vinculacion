/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactiva "Collecting build traces" (solo necesario para standalone/serverless).
  // Se cuelga en servidores con poca memoria; usamos `next start` con node_modules completo.
  outputFileTracing: false,
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "rfijjtvozncllqvocdat.supabase.co" },
    ],
  },
};

export default nextConfig;
