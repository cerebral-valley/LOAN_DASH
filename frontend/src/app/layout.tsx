import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcuts";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "City Central Loan Dashboard",
  description: "Gold Loan KPI & Analytics Dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LoanDash",
  },
  icons: {
    apple: "/icon-192.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to API server for faster requests */}
        <link rel="preconnect" href="http://localhost:3001" />
        <link rel="dns-prefetch" href="http://localhost:3001" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider defaultTheme="system" storageKey="loan-dash-theme">
          <KeyboardShortcutsProvider>
            <QueryProvider>{children}</QueryProvider>
            <Toaster richColors position="top-right" />
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
