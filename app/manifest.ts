import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Tandem",
    short_name: "HomeTandem",
    description: "A Progressive Web App built with Next.js",
    start_url: "/app",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#f4f4f5",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
