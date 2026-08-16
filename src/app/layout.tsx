import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./design-system-v2.css";

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
  themeColor: "#ffffff",
};

const enableFigmaCapture = process.env.NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE === "1";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-design-layer="v2">
      <head>
        {enableFigmaCapture ? <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
