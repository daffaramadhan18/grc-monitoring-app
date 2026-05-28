'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const TABS = ['/dashboard', '/opportunities', '/projects', '/team']
const SWIPE_THRESHOLD = 55   // px horizontal distance to trigger nav
const PULL_THRESHOLD  = 70   // px vertical distance to trigger refresh
const ANGLE_RATIO     = 1.6  // horizontal must dominate vertical by this factor

function hasHorizontalScroll(el: EventTarget | null): boolean {
  let node = el as HTMLElement | null
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node)
    if (
      node.scrollWidth > node.clientWidth &&
      (style.overflowX === 'auto' || style.overflowX === 'scroll')
    ) return true
    node = node.parentElement
  }
  return false
}

export default function SwipePageWrapper({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const start    = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null)
  const [pullY,  setPullY]  = useState(0)

  // Disable pinch-zoom on iOS (iOS 10+ ignores user-scalable=no in viewport meta)
  useEffect(() => {
    const preventPinch = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    const preventGesture = (e: Event) => e.preventDefault()
    document.addEventListener('touchmove',     preventPinch,   { passive: false })
    document.addEventListener('gesturestart',  preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })
    return () => {
      document.removeEventListener('touchmove',     preventPinch)
      document.removeEventListener('gesturestart',  preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
    }
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    start.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      target: e.target,
    }
    setPullY(0)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return
    const dy = e.touches[0].clientY - start.current.y
    const dx = e.touches[0].clientX - start.current.x
    const mainEl = document.querySelector<HTMLElement>('main.rsm-main')
    const scrollTop = mainEl?.scrollTop ?? 1

    if (
      pathname.startsWith('/dashboard') &&
      scrollTop === 0 &&
      dy > 0 &&
      Math.abs(dy) > Math.abs(dx) * ANGLE_RATIO
    ) {
      setPullY(Math.min(dy * 0.4, PULL_THRESHOLD))
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!start.current) return
    const dx = e.changedTouches[0].clientX - start.current.x
    const dy = e.changedTouches[0].clientY - start.current.y

    if (pullY >= PULL_THRESHOLD - 4) {
      router.refresh()
    }
    setPullY(0)

    const inHScroll = hasHorizontalScroll(start.current.target)
    if (
      !inHScroll &&
      Math.abs(dx) >= SWIPE_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy) * ANGLE_RATIO
    ) {
      const idx = TABS.findIndex(t => pathname.startsWith(t))
      if (idx !== -1) {
        if (dx < 0 && idx < TABS.length - 1) router.push(TABS[idx + 1])
        else if (dx > 0 && idx > 0)          router.push(TABS[idx - 1])
      }
    }

    start.current = null
  }

  return (
    <div
      className="min-h-full relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullY > 4 && (
        <div
          className="absolute top-0 inset-x-0 flex justify-center pointer-events-none z-30"
          style={{ transform: `translateY(${pullY - 36}px)`, opacity: Math.min(pullY / PULL_THRESHOLD, 1) }}
        >
          <div className="w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center">
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              style={{ transform: `rotate(${(pullY / PULL_THRESHOLD) * 300}deg)`, transition: 'transform 0.05s linear' }}
            >
              <circle cx="12" cy="12" r="10" stroke="#009CDE" strokeWidth="2" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#009CDE" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
