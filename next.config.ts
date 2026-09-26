import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autoconsistente per il deploy con Docker o su una VPS.
  output: "standalone",
  serverExternalPackages: ["@libsql/client", "unpdf", "mammoth", "xlsx", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Niente incorniciamento in siti terzi: i dossier restano privati.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
