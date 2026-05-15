"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TrendingUp, FolderKanban, Users, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/opportunities", label: "Opportunities", icon: TrendingUp },
  { href: "/projects",      label: "Projects",      icon: FolderKanban },
  { href: "/team",          label: "Team",          icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#2D2D2D] flex items-center gap-3 px-4 shadow-md">
        <button
          onClick={() => setOpen(true)}
          className="text-white/70 hover:text-white transition-colors p-1"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-bold text-lg leading-none">RSM</span>
          <span className="text-white/40 text-xs">CC3 · GRC Monitoring</span>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-[#2D2D2D] text-white flex flex-col shrink-0",
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out",
          "md:relative md:w-60 md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-xl leading-none">RSM</div>
            <div className="text-xs text-white/50 mt-1">CC3 · GRC Monitoring</div>
          </div>
          <button
            className="md:hidden text-white/40 hover:text-white transition-colors p-1"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-[#009CDE] text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/30">
          v0.1.0
        </div>
      </aside>
    </>
  )
}
