import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Auth - Universal Assistant",
  description: "Test authentication page",
};

export default function TestAuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}