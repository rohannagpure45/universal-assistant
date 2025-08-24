import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProviders } from '@/components/providers/StoreProviders';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider, THEME_SCRIPT } from '@/components/providers/ThemeProvider';
import { CriticalErrorBoundary } from '@/components/ui/ProductionErrorBoundary';
import { ProductionMonitoringInit } from '@/components/providers/ProductionMonitoringInit';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Universal Assistant",
  description: "AI-powered meeting assistant with real-time transcription and intelligent responses",
  keywords: "AI, meeting assistant, transcription, voice recognition, productivity",
  authors: [{ name: "Universal Assistant Team" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline theme script to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Viewport meta tag for responsive design */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Universal Assistant" />
        <meta name="application-name" content="Universal Assistant" />
        {/* Production monitoring meta */}
        <meta name="monitoring-enabled" content={process.env.NODE_ENV === 'production' ? 'true' : 'false'} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <CriticalErrorBoundary 
          context="Application" 
          showRetry={true}
          showDetails={process.env.NODE_ENV === 'development'}
        >
          <ThemeProvider defaultTheme="system">
            <StoreProviders>
              <AuthProvider>
                <ProductionMonitoringInit />
                {children}
              </AuthProvider>
            </StoreProviders>
          </ThemeProvider>
        </CriticalErrorBoundary>
      </body>
    </html>
  );
}