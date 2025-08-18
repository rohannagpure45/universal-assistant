/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure proper module resolution
  transpilePackages: [],
  // Add fallback for Node.js modules in browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;