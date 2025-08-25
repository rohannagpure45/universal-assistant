/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: Enable React strict mode in production
  reactStrictMode: process.env.NODE_ENV === 'production',
  swcMinify: true,
  
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
    }
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
          // Content Security Policy (Enhanced for Firebase, relaxed for development)
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' ? [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://apis.google.com/js/api.js https://*.googleapis.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' ws: wss: https://*.firebase.com https://*.firebaseio.com https://*.firebasestorage.app https://*.googleapis.com https://apis.google.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
              "media-src 'self' blob: data:",
              "worker-src 'self' blob:",
              "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'"
            ].join('; ') : [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://apis.google.com/js/api.js https://*.googleapis.com https://*.firebase.com https://*.firebaseapp.com https://www.gstatic.com https://securetoken.googleapis.com https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com https://www.gstatic.com data:",
              "img-src 'self' data: blob: https://*.googleapis.com https://*.firebase.com https://*.firebaseapp.com https://www.gstatic.com",
              "connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.deepgram.com https://api.elevenlabs.io https://*.firebase.com https://*.firebaseio.com https://*.firebasestorage.app https://*.googleapis.com https://apis.google.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com wss://*.firebaseio.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com",
              "media-src 'self' blob: data:",
              "worker-src 'self' blob:",
              "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
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

  // Minimal webpack configuration
  webpack: (config, { isServer }) => {
    // Only essential fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;