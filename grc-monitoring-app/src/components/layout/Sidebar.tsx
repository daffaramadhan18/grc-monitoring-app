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
    <aside className="w-60 bg-[#1A1A2E] text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="text-[#CC0000] font-bold text-xl leading-none">RSM</div>
        <div className="text-xs text-white/50 mt-1">CC3 · GRC Monitoring</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-[#CC0000] text-white"
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
  )
}
