/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Webpack setup
  webpack: (config, { webpack }) => {
    // Enable WebAssembly handling for Ketcher Standalone
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Force Webpack to completely replace any reference to jsdom with an empty module stub
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^jsdom$/,
        false // Evaluates to an empty object
      )
    );

    return config;
  },

  // 2. Suppress Next.js 16 Turbopack strict gates
  turbopack: {}
};

export default nextConfig;