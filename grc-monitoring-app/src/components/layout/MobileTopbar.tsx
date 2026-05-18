'use client'
import { usePathname } from 'next/navigation'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/opportunities': 'Opportunities',
  '/projects': 'Projects',
  '/team': 'Team',
}

export default function MobileTopbar() {
  const pathname = usePathname()
  const label = Object.entries(PAGE_LABELS).find(([k]) => pathname.startsWith(k))?.[1] ?? ''
  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 bg-[#2D2D2D] text-white"
      style={{ height: 56, paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-baseline gap-2">
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>RSM</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>CC3 · GRC Monitoring</span>
      </div>
      {label && (
        <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{label}</span>
      )}
    </header>
  )
}
