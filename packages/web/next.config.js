/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep images unoptimized for Electron
  images: {
    unoptimized: true,
  },

  // Enable server mode (remove static export configs)
  // trailingSlash removed - not needed for server mode

  // Don't transpile @yasban/shared - use pre-compiled dist folder
  // This allows the shared package to use .js extensions for ES modules
  // transpilePackages: ['@yasban/shared'],

  // Server-only packages (don't bundle for client)
  // Note: @yasban/shared is transpiled, so only external deps are listed here
  serverExternalPackages: [
    'tedious',
    'pg',
    'mysql2',
    'better-sqlite3',
    '@prisma/client',
    'node-windows',
    'node-linux',
  ],

  // Experimental features for Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Webpack config adjustments for Electron
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix for "Can't resolve 'fs'" errors in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        // Database drivers
        pg: false,
        mysql2: false,
        tedious: false,
        'better-sqlite3': false,
      };

      // Mark database drivers as external for client bundle
      config.externals = config.externals || {};
      config.externals = [
        ...config.externals,
        'pg',
        'mysql2',
        'tedious',
        'better-sqlite3',
        '@prisma/client',
      ];
    }

    // Allow server-side modules and database drivers
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        '@prisma/client',
        'tedious',
        'pg',
        'mysql2',
        'better-sqlite3',
        'node-windows',
        'node-linux'
      );
    }

    return config;
  },
};

module.exports = nextConfig;
