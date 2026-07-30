import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seri Bako OMS",
  description: "Seri Bako Operations Management System",
  manifest: "/manifest.webmanifest",
  applicationName: "Seri Bako OMS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seri Bako OMS",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#083B2A",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
      </head>
      <body>{children}</body>
    </html>
  );
}
