"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TrendingUp, FolderKanban, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/opportunities", label: "Opportunities", icon: TrendingUp },
  { href: "/projects",      label: "Projects",      icon: FolderKanban },
  { href: "/team",          label: "Team",          icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    /* Desktop-only sidebar — on mobile, BottomNav handles navigation */
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col bg-[#2D2D2D] text-white">
      {/* Logo */}
      <div className="rsm-sidebar-logo px-6 py-5 border-b border-white/10">
        <div className="rsm-sidebar-logo-mark text-white font-bold text-xl leading-none">RSM</div>
        <div className="text-xs text-white/50 mt-1">CC3 · GRC Monitoring</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rsm-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                active
                  ? "rsm-nav-item--active bg-[#009CDE] text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="rsm-nav-icon inline-flex"><Icon size={18} /></span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-white/10 text-xs text-white/30">
        v0.1.0
      </div>
    </aside>
  )
}
