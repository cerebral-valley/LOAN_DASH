import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "City Central Loan Dashboard",
  description: "Gold Loan KPI & Analytics Dashboard",
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
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider defaultTheme="system" storageKey="loan-dash-theme">
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
