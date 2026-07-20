import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aetheris Oncology",
    short_name: "Aetheris",
    description:
      "AI-powered oncology resident training simulator — case review, structured decision worksheets, and multi-agent feedback.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8ff",
    theme_color: "#00327d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
