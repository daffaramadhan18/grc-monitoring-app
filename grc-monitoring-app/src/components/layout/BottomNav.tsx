'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Briefcase, Users } from 'lucide-react'
import { haptic } from '@/lib/haptic'

const tabs = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/opportunities', label: 'Opportunities', icon: FileText },
  { href: '/projects',      label: 'Projects',      icon: Briefcase },
  { href: '/team',          label: 'Team',          icon: Users },
]

export default function BottomNav() {
  const pathname = usePathname()
  const activeIdx = Math.max(0, tabs.findIndex(t => pathname.startsWith(t.href)))
  const width = 100 / tabs.length

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-0 h-[3px] bg-[#009CDE] rounded-b transition-all"
        style={{
          left: `${activeIdx * width}%`,
          width: `${width}%`,
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          transitionDuration: '320ms',
        }}
      />
      <div className="flex h-16">
        {tabs.map(({ href, label, icon: Icon }, i) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={haptic}
              className="flex flex-col items-center justify-center gap-1 flex-1 transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                style={{
                  color: active ? '#009CDE' : '#9CA3AF',
                  animation: active ? 'rsm-tab-pop 350ms cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                }}
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
      </div>
    </nav>
  )
}
