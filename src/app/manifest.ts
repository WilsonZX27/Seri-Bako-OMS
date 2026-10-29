import { APPLICATION_NAME, APPLICATION_SHORT_NAME, APPLICATION_DESCRIPTION } from "@/lib/branding/deployment-branding";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APPLICATION_NAME,
    short_name: APPLICATION_SHORT_NAME,
    description: APPLICATION_DESCRIPTION,
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F5F0",
    theme_color: "#ffffff",
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
