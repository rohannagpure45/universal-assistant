/** @type {import('next').NextConfig} */

// Production-optimized Next.js configuration
const nextConfig = {
  // Core settings
  reactStrictMode: true,
  swcMinify: true,
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Build optimizations
  experimental: {
    // Modern bundler optimizations
    turbotrace: {
      logLevel: 'error',
      logAll: false,
      contextDirectory: process.cwd(),
    },
    
    // Memory optimizations
    workerThreads: true,
    
    // Bundle optimizations
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'lodash',
      'react-use'
    ]
  },

  // Compiler optimizations
  compiler: {
    // Remove console statements in production
    removeConsole: {
      exclude: ['error', 'warn']
    },
    
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    
    // Styled-components optimization
    styledComponents: {
      displayName: false,
      ssr: true,
      minify: true
    }
  },

  // Bundle analysis and optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production-specific webpack optimizations
    if (!dev && !isServer) {
      // Bundle splitting optimization
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for stable dependencies
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // UI components chunk
            ui: {
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              name: 'ui',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Services chunk
            services: {
              test: /[\\/]src[\\/]services[\\/]/,
              name: 'services',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Tree shaking optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Module concatenation
      config.optimization.concatenateModules = true;

      // Production bundle analyzer (optional)
      if (process.env.ANALYZE === 'true') {
        const BundleAnalyzerPlugin = require('@next/bundle-analyzer')();
        config.plugins.push(new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        }));
      }

      // Compression plugins
      const CompressionPlugin = require('compression-webpack-plugin');
      config.plugins.push(
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        })
      );

      // Brotli compression
      config.plugins.push(
        new CompressionPlugin({
          filename: '[path][base].br',
          algorithm: 'brotliCompress',
          test: /\.(js|css|html|svg)$/,
          compressionOptions: {
            params: {
              [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11,
            },
          },
          threshold: 8192,
          minRatio: 0.8,
        })
      );

      // Service worker precaching (if using PWA)
      if (process.env.ENABLE_PWA === 'true') {
        const WorkboxPlugin = require('workbox-webpack-plugin');
        config.plugins.push(
          new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-stylesheets',
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                },
              },
            ],
          })
        );
      }
    }

    // Security optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Prevent potential prototype pollution
      'lodash': 'lodash-es',
    };

    // Monitor bundle size
    config.performance = {
      hints: 'warning',
      maxAssetSize: 512000, // 512KB
      maxEntrypointSize: 512000, // 512KB
    };

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          },
          // Performance headers
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
        ],
      },
      // Static asset caching
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // API route headers
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      }
    ];
  },

  // Redirects for SEO and security
  async redirects() {
    return [
      // Force HTTPS in production
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://universal-assistant.com/:path*',
        permanent: true,
      },
    ];
  },

  // Environment-specific rewrites
  async rewrites() {
    return [
      // Health check endpoint
      {
        source: '/health',
        destination: '/api/health',
      },
      // Monitoring endpoints
      {
        source: '/metrics',
        destination: '/api/monitoring/metrics',
      },
    ];
  },

  // Output configuration
  output: 'standalone',
  
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Enable static optimization
  trailingSlash: false,
  
  // ESLint configuration
  eslint: {
    // Only run ESLint on specific directories
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    // Type checking during builds
    ignoreBuildErrors: false,
  },

  // Monitoring and analytics
  analyticsId: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  
  // Environment variables validation
  env: {
    BUILD_ID: process.env.BUILD_ID || 'dev',
    BUILD_TIME: new Date().toISOString(),
    NODE_ENV: process.env.NODE_ENV,
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: false, // Don't log full URLs in production
    },
  },

  // Development vs Production specific settings
  ...(process.env.NODE_ENV === 'production' ? {
    // Production-only settings
    assetPrefix: process.env.CDN_URL || '',
    basePath: process.env.BASE_PATH || '',
  } : {
    // Development-only settings
    devIndicators: {
      buildActivity: true,
    },
  }),
};

// Validate required environment variables for production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  const missingVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for production: ${missingVars.join(', ')}`
    );
  }
}

module.exports = nextConfig;