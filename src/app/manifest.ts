import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seri Bako Operations Management System",
    short_name: "Seri Bako OMS",
    description: "Seri Bako operational workdesk for procurement, receiving, inventory, production, and outlet operations.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F7F5F0",
    theme_color: "#083B2A",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
