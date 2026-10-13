import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma + libSQL use native bindings; keep them out of the server bundle.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],
  poweredByHeader: false,
};

export default nextConfig;
