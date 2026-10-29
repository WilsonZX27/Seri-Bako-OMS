import { APPLICATION_NAME, APPLICATION_DESCRIPTION } from "@/lib/branding/deployment-branding";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "./design-system-v2.css";

export const metadata: Metadata = {
  title: APPLICATION_NAME,
  description: APPLICATION_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  applicationName: APPLICATION_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APPLICATION_NAME,
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
        {/* iPadOS Safari/Chrome can report a desktop-sized Macintosh viewport.
            Mark the touch-tablet shell before first paint so the sidebar does
            not flash in, or remain selected until, client hydration. */}
        <Script id="touch-tablet-bootstrap" strategy="beforeInteractive">
          {`(()=>{const n=navigator,s=window.screen,t=n.maxTouchPoints||0,u=n.userAgent||"",e=Math.min(s.width,s.height),c=window.matchMedia("(pointer: coarse)").matches;const i=t>1&&e>=600&&(/macintosh/i.test(u)||/ipad/i.test(u));if(t>1&&e>=600&&(i||c))document.documentElement.dataset.touchTablet="true";})();`}
        </Script>
        {enableFigmaCapture ? <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
