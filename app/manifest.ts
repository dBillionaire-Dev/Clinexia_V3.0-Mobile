import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Clinexia",
    short_name: "Clinexia",
    description: "A complete clinical toolkit: medical calculators, drug dosing with mg and mL per dose, unit conversions, laboratory tools and references.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#073a68",
    orientation: "portrait",
    categories: ["medical", "health", "education", "utilities"],
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
