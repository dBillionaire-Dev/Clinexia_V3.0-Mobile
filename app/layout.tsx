import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { Splash } from "@/components/splash"
import { SPLASH_INIT } from "@/lib/splash"

export const metadata: Metadata = {
  title: { default: "Clinexia", template: "%s · Clinexia" },
  description: "Clinexia: a complete clinical toolkit with medical calculators, drug dosing (mg and mL per dose), unit conversions, laboratory tools and reference ranges.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Clinexia" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#073a68",
}

const THEME_INIT = `(function(){try{var s=JSON.parse(localStorage.getItem("convertlab:settings:v3")||"{}");var t=s.theme||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d){r.classList.add("dark");r.style.colorScheme="dark"}r.dataset.theme=t;var f=s.fontSize;r.style.fontSize=f==="small"?"15px":f==="large"?"18px":"16px"}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <script dangerouslySetInnerHTML={{ __html: SPLASH_INIT }} />
      </head>
      <body><Splash /><AppShell>{children}</AppShell></body>
    </html>
  )
}
