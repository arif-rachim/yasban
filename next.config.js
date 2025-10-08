/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export for Electron (production only)
  output: 'export',

  // Output directory - use .next for dev, out for production build
  distDir: process.env.NODE_ENV === 'production' ? 'out' : '.next',

  // Disable image optimization (not available in static export)
  images: {
    unoptimized: true,
  },

  // Trailing slash helps with file:// routing
  trailingSlash: true,

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
      };
    }

    return config;
  },
};

module.exports = nextConfig;
