import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WayPal AI - 奢华酒店订房助手",
  description: "A premium AI-powered booking assistant for high-net-worth individuals seeking the best luxury hotel deals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Inter', 'Noto Sans SC', sans-serif" }}>{children}</body>
    </html>
  );
}
