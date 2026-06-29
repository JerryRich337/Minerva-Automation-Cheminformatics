/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Universal Webpack overrides
  webpack: (config, { webpack }) => {
    // Enable WebAssembly handling for Ketcher Standalone
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Completely ignore jsdom module resolution globally so 'paper' doesn't crash the build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      jsdom: false, // <-- This forces Webpack to treat any 'jsdom' import as an empty object
    };

    return config;
  },

  // 2. Clear out the Turbopack check
  turbopack: {}
};

export default nextConfig;