import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  outputFileTracingExcludes: {
    '*': [
      './public/NPG-X-10/**',
      './public/npgx-videos/**',
      './public/npgx-images/**',
      './public/npgx-characters/**',
      './public/music/**',
      './public/grok-video-*.mp4',
      './public/content/**',
      './public/adult-content/**',
      './public/licensed-patents/**',
      './public/landing-page-videos/**',
      './public/remember/**',
    ],
  },
};

export default nextConfig;
