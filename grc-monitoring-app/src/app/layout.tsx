import type { Metadata, Viewport } from "next"
import "./globals.css"
import Sidebar from "@/components/layout/Sidebar"
import BottomNav from "@/components/layout/BottomNav"
import MobileTopbar from "@/components/layout/MobileTopbar"
import SWRProvider from "@/components/SWRProvider"

export const metadata: Metadata = {
  title: "RSM CC3 — GRC Monitoring",
  description: "IT GRC & Cybersecurity Division — Internal Monitoring App",
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
        <MobileTopbar />
        <SWRProvider>
          <div className="flex h-screen overflow-x-hidden">
            <Sidebar />
            <main className="w-full min-w-0 md:flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-4 pt-14 md:pt-0 md:p-6">
              {children}
              {/* Mobile safe-area spacer: bottom nav (64px) + device inset */}
              <div
                className="md:hidden"
                style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
                aria-hidden
              />
            </main>
          </div>
          <BottomNav />
        </SWRProvider>
      </body>
    </html>
  )
}
