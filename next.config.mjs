/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Force Webpack config adjustments
  webpack: (config, { isServer, webpack }) => {
    // Enable WebAssembly handling for Ketcher Standalone
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // ONLY on client-side builds, tell Webpack to mock or ignore server-side modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Tell Webpack to explicitly ignore jsdom requests made by the paper package
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^jsdom$/,
        })
      );
    }

    return config;
  },

  // 2. Clear out the Turbopack check
  turbopack: {}
};

export default nextConfig;