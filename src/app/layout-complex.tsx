import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from '@/components/providers/ThemeProvider';
import dynamic from 'next/dynamic';

// Load all client components with no SSR to prevent webpack module factory errors
const ClientOnlyProvider = dynamic(
  () => import('@/components/providers/ClientOnlyProvider').then(mod => ({ default: mod.ClientOnlyProvider })),
  { ssr: false }
);

const ThemeProvider = dynamic(
  () => import('@/components/providers/ThemeProvider').then(mod => ({ default: mod.ThemeProvider })),
  { ssr: false }
);

const AuthProvider = dynamic(
  () => import('@/components/providers/AuthProvider').then(mod => ({ default: mod.AuthProvider })),
  { ssr: false }
);

const ClientInitializer = dynamic(
  () => import('@/components/providers/ClientInitializer').then(mod => ({ default: mod.ClientInitializer })),
  { ssr: false }
);

const RootErrorBoundary = dynamic(
  () => import('@/components/providers/RootErrorBoundary').then(mod => ({ default: mod.RootErrorBoundary })),
  { ssr: false }
);

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
        {/* Inline theme script to prevent FOUC (Flash of Unstyled Content) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Universal Assistant" />
        <meta name="application-name" content="Universal Assistant" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientOnlyProvider>
          <RootErrorBoundary>
            <ThemeProvider defaultTheme="system">
              <AuthProvider>
                <ClientInitializer>
                  {children}
                </ClientInitializer>
              </AuthProvider>
            </ThemeProvider>
          </RootErrorBoundary>
        </ClientOnlyProvider>
      </body>
    </html>
  );
}