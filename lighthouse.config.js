module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/meeting',
        'http://localhost:3000/settings',
        'http://localhost:3000/analytics'
      ],
      startServerCommand: 'npm start',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.8 }],
        
        // Performance metrics
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'first-meaningful-paint': ['error', { maxNumericValue: 2500 }],
        'speed-index': ['error', { maxNumericValue: 4000 }],
        'interactive': ['error', { maxNumericValue: 5000 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // Resource efficiency
        'unused-javascript': ['warn', { maxNumericValue: 40000 }],
        'unused-css-rules': ['warn', { maxNumericValue: 40000 }],
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],
        'unminified-css': ['error', { maxNumericValue: 0 }],
        'unminified-javascript': ['error', { maxNumericValue: 0 }],
        
        // Network efficiency
        'uses-text-compression': 'error',
        'uses-responsive-images': 'error',
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'efficient-animated-content': 'warn',
        
        // Caching
        'uses-long-cache-ttl': 'warn',
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'warn',
        
        // Security
        'is-on-https': 'error',
        'uses-http2': 'warn',
        'csp-xss': 'warn',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'meta-viewport': 'error',
        
        // SEO
        'document-title': 'error',
        'meta-description': 'error',
        'http-status-code': 'error',
        'crawlable-anchors': 'error',
        
        // PWA
        'installable-manifest': 'error',
        'service-worker': 'error',
        'offline-start-url': 'error',
        'themed-omnibox': 'warn',
        'content-width': 'error',
        'viewport': 'error',
        'without-javascript': 'warn',
        'apple-touch-icon': 'warn',
        'maskable-icon': 'warn'
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
    },
  },
};