'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Briefcase, Users } from 'lucide-react'
import { haptic } from '@/lib/haptic'

const tabs = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/opportunities', label: 'Opportunities',   icon: FileText },
  { href: '/projects',      label: 'Projects',        icon: Briefcase },
  { href: '/team',          label: 'Team',            icon: Users },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-center h-16"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={haptic}
            className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              style={{ color: active ? '#009CDE' : '#9CA3AF' }}
            />
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: active ? '#009CDE' : '#9CA3AF' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
