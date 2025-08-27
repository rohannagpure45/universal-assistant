import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from '@/components/providers/ThemeProviderSimple';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { StoreProviders } from '@/components/providers/StoreProviders';

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
  viewportFit: 'cover' as const,
};

/**
 * Simple Root Layout - Minimal Provider Chain
 * 
 * REVERT FROM COMPLEX ARCHITECTURE:
 * - Removed 6-layer provider chain that was causing authentication failures
 * - Direct integration of essential providers only
 * - No complex error boundaries, suspense, or client initializers
 * - Focus on working authentication over architectural purity
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Universal Assistant" />
        <meta name="application-name" content="Universal Assistant" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system">
          <StoreProviders>
            <AuthProvider>
              {children}
            </AuthProvider>
          </StoreProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}