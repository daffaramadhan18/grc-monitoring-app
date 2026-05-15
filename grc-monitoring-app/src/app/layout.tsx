import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/layout/Sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RSM CC3 — GRC Monitoring",
  description: "IT GRC & Cybersecurity Division — Internal Monitoring App",
  manifest: "/manifest.json",
  themeColor: "#009CDE",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RSM GRC",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} overflow-x-hidden`}>
        <div className="flex h-screen overflow-x-hidden">
          <Sidebar />
          <main className="w-full min-w-0 md:flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-4 pt-[72px] md:p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
