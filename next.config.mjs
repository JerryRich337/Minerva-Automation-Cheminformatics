/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Universal Webpack overrides
  webpack: (config) => {
    // Enable WebAssembly handling for Ketcher Standalone
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Safely alias jsdom and its deep internal imports to a false-stub
    config.resolve.alias = {
      ...config.resolve.alias,
      'jsdom': false,
      'jsdom/lib/jsdom/living/generated/utils': false,
    };

    return config;
  },

  // 2. Clear out the Turbopack check
  turbopack: {}
};

export default nextConfig;