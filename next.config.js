/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: Enable React strict mode in production
  reactStrictMode: process.env.NODE_ENV === 'production',
  swcMinify: true,
  
  // Production console removal (keeps error/warn for debugging)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },
  
  // Development improvements
  ...(process.env.NODE_ENV === 'development' && {
    // Improve development source maps
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-right',
    },
    // Better error overlay
    typescript: {
      ignoreBuildErrors: false,
    },
    eslint: {
      ignoreDuringBuilds: false,
    },
  }),
  
  // Security: Essential headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security Headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Content Security Policy (Optimized for Firebase)
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' ? [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseapp.com https://*.firebaseio.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleapis.com",
              "connect-src 'self' ws: wss: http://localhost:* ws://localhost:* https://*.firebase.com https://*.firebaseio.com https://*.firebaseapp.com https://*.firebasestorage.app https://*.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com",
              "media-src 'self' blob: data: https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.storage.googleapis.com",
              "worker-src 'self' blob:",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
              "object-src 'none'"
            ].join('; ') : [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseapp.com https://*.firebaseio.com https://*.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com",
              "connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.deepgram.com https://api.elevenlabs.io https://*.firebase.com https://*.firebaseio.com https://*.firebaseapp.com https://*.firebasestorage.app https://*.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com https://*.google-analytics.com https://*.googletagmanager.com",
              "media-src 'self' blob: data: https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.storage.googleapis.com",
              "worker-src 'self' blob:",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()'
          }
        ]
      }
    ];
  },

  // Security: Remove powered by header
  poweredByHeader: false,
  
  // Security: Image domains whitelist
  images: {
    domains: [
      'localhost',
      'firebase.googleapis.com',
      'firebasestorage.googleapis.com'
    ],
    minimumCacheTTL: 60,
  },

  // CORS Resolution: HTTP API Proxying (WebSocket proxying handled separately)
  async rewrites() {
    return [
      // HTTP API proxy for external services (if needed)
      {
        source: '/api/proxy/deepgram/:path*',
        destination: 'https://api.deepgram.com/:path*',
      },
      {
        source: '/api/proxy/elevenlabs/:path*',
        destination: 'https://api.elevenlabs.io/:path*',
      }
    ];
  },

  // Webpack configuration with CORS fixes
  webpack: (config, { dev, isServer }) => {
    // Only essential fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Fix chunk loading timeouts (addresses "Invalid token" errors)
    if (dev && !isServer) {
      // Add CORS headers for hot reload
      config.devServer = {
        ...config.devServer,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      };
      
      // Removed problematic chunk splitting that was causing module loading issues
    }
    
    return config;
  },
};

module.exports = nextConfig;