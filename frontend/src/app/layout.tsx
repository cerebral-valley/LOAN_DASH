import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

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
    <html lang="en">
      <head>
        {/* Preconnect to API server for faster requests */}
        <link rel="preconnect" href="http://localhost:3001" />
        <link rel="dns-prefetch" href="http://localhost:3001" />
      </head>
      <body className="antialiased font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
