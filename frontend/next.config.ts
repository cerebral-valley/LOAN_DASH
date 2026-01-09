import type { NextConfig } from "next";
import crypto from 'crypto';

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize webpack for faster builds while maintaining network drive compatibility
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Use memory cache in dev for faster rebuilds (works on network drives)
      config.cache = { type: 'memory' };
      // Completely disable file watching for network drives
      config.watchOptions = {
        ignored: ['**/*'],  // Ignore all files - no hot reload
      };
    }
    
    // Add tree shaking and code splitting optimizations for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module: any) {
              return module.size() > 50000 && /node_modules/.test(module.identifier());
            },
            name(module: any) {
              const hash = crypto.createHash('sha1');
              hash.update(module.libIdent({ context: 'dir' }));
              return hash.digest('hex').substring(0, 8);
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name(module: any, chunks: any) {
              return chunks.map((c: any) => c.name).join('~');
            },
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },
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
