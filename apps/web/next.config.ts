import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@api-pulse/database", "@api-pulse/shared"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
