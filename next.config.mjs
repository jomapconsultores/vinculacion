/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "rfijjtvozncllqvocdat.supabase.co" },
    ],
  },
};

export default nextConfig;
