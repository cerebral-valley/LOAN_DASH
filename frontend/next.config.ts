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
};

export default nextConfig;
