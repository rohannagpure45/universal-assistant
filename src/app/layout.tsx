import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProviders } from '@/components/providers/StoreProviders';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

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
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
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
