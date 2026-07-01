import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seri Bako OMS",
  description: "Seri Bako Operations Management System",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
