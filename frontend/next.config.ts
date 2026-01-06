import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable webpack caching and file watching for network drive compatibility
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      // Completely disable file watching for network drives
      config.watchOptions = {
        ignored: ['**/*'],  // Ignore all files - no hot reload
      };
    }
    return config;
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Enable optimistic client cache for faster navigation
    optimisticClientCache: true,
  },
  
  // Optimize image loading
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Enable HTTP/2 support via headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
