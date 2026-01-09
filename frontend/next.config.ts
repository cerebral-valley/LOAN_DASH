import type { NextConfig } from "next";
import crypto from 'crypto';

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize webpack for faster builds while maintaining network drive compatibility
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Use filesystem cache on local temp drive for 80% faster rebuilds
      const cacheDir = process.env.TEMP || process.env.TMP || 'C:\\temp';
      config.cache = {
        type: 'filesystem',
        cacheDirectory: `${cacheDir}\\nextjs-webpack-cache`,
        // Note: buildDependencies omitted to avoid warnings with TypeScript config
        // Cache will automatically invalidate when dependencies change
      };
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
          // React framework
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // React Query and data fetching
          dataFetching: {
            test: /[\\/]node_modules[\\/](@tanstack|axios)[\\/]/,
            name: 'data-fetching',
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
          // UI components (lucide-react, radix-ui)
          uiComponents: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui)[\\/]/,
            name: 'ui-components',
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
          // Large libraries
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
          // Common components across pages
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
          // Shared page chunks
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
      
      // Optimize module concatenation
      config.optimization.concatenateModules = true;
      
      // Minimize size
      config.optimization.minimize = true;
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

export default withBundleAnalyzer(nextConfig);
