import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seri Bako Operations",
  description: "Internal operations management system for Seri Bako.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
