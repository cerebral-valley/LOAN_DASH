import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
