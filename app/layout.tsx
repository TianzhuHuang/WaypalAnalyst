import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waypal Hotel Expert",
  description: "Your AI Hotel Expert for the Best Rates. Expert Analysis | Price Tracking | 24/7 Travel Support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-b from-green-50/30 to-white">{children}</body>
    </html>
  );
}
