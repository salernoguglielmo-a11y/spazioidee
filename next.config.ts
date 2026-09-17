import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autoconsistente per il deploy con Docker o su una VPS.
  output: "standalone",
  serverExternalPackages: ["@libsql/client", "unpdf", "mammoth", "xlsx", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default nextConfig;
