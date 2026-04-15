import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Strict mode: don't ship a build with type errors. The previous
  // `ignoreBuildErrors: true` was a shortcut to unblock the NPGX
  // port; on the merged codebase we fix errors instead of hiding them.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
