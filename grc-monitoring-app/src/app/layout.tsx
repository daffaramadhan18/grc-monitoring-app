import type { Metadata, Viewport } from "next"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"
import AppShell from "@/components/layout/AppShell"

export const metadata: Metadata = {
  title: "RSM CC3 — GRC Monitoring",
  description: "IT GRC & Cybersecurity Division — Internal Monitoring App",
  icons: { icon: "/logo.svg" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RSM GRC",
  },
  other: {
    "apple-touch-icon": "/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#009CDE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="overflow-x-hidden">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  )
}
