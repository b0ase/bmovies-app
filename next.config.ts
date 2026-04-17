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
  // Serve public/index.html at the root path. Next.js will happily
  // serve public/<anything>.html at /<anything>.html on its own, but
  // it does NOT auto-serve public/index.html at /. The rewrite closes
  // that gap so the merged brochure lands on the domain root without
  // forcing us to add a src/app/page.tsx wrapper.
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/marketing-ideas',     destination: '/marketing-ideas.html' },
      { source: '/pump-fun-for-movies', destination: '/pump-fun-for-movies.html' },
    ];
  },
  // Allow captable.html to be embedded in an iframe on the same origin
  async headers() {
    return [
      {
        source: '/captable.html',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/deck.html',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/production.html',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
