'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['/dashboard', '/opportunities', '/projects', '/team'] as const
type Tab = typeof TABS[number]

const SWIPE_THRESHOLD = 55   // px — minimum horizontal distance to trigger nav
const PULL_THRESHOLD  = 70   // px — pull-to-refresh distance
const ANGLE_RATIO     = 1.6  // horizontal must dominate vertical by this factor

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIdx(path: string): number {
  const i = TABS.findIndex(t => path.startsWith(t))
  return i === -1 ? 0 : i
}

function hasHorizontalScroll(el: EventTarget | null): boolean {
  let node = el as HTMLElement | null
  while (node && node !== document.body) {
    const s = window.getComputedStyle(node)
    if (node.scrollWidth > node.clientWidth &&
        (s.overflowX === 'auto' || s.overflowX === 'scroll')) return true
    node = node.parentElement
  }
  return false
}

// Horizontal slide variants — direction: 1 = swiped left (→next), -1 = swiped right (→prev)
const variants = {
  enter:  (d: number) => ({ x: d >= 0 ? '100%' : '-100%' }),
  center: { x: 0 },
  exit:   (d: number) => ({ x: d >= 0 ? '-100%' : '100%' }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SwipeableLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [isMobile, setIsMobile]   = useState(false)
  const [direction, setDirection] = useState(0)
  const [pullY, setPullY]         = useState(0)

  const prevPathnameRef = useRef(pathname)
  const touchStart      = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null)
  const navLock         = useRef(false) // prevent double-navigation while animation plays

  // ── Prompt 2: only activate on mobile viewports below 768 px ─────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Prompt 2: derive active panel index from pathname on mount ────────────
  //    Also update slide direction whenever the route changes (handles back btn)
  useEffect(() => {
    const prev = prevPathnameRef.current
    const prevIdx = getIdx(prev)
    const currIdx = getIdx(pathname)
    if (currIdx !== prevIdx) {
      setDirection(currIdx > prevIdx ? 1 : -1)
    }
    prevPathnameRef.current = pathname
    navLock.current = false
  }, [pathname])

  // ── Prompt 4: popstate — intercept back / iOS swipe-back ─────────────────
  useEffect(() => {
    if (!isMobile) return

    // Seed history state so every entry carries its tab index
    window.history.replaceState({ tabIdx: getIdx(pathname) }, '')

    function handlePopState(e: PopStateEvent) {
      const toIdx   = getIdx(window.location.pathname)
      const fromIdx = e.state?.tabIdx ?? getIdx(pathname)

      // If back-navigation would leave the tab set, redirect to first tab
      if (!TABS.some(t => window.location.pathname.startsWith(t))) {
        window.history.pushState({ tabIdx: 0 }, '', TABS[0])
        router.replace(TABS[0])
        return
      }

      // Set direction so AnimatePresence animates correctly on browser back
      if (toIdx !== fromIdx) {
        setDirection(toIdx > fromIdx ? 1 : -1)
        prevPathnameRef.current = TABS[fromIdx]
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pinch-zoom prevention (consolidated from SwipePageWrapper) ────────────
  useEffect(() => {
    const preventPinch   = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    const preventGesture = (e: Event)      => e.preventDefault()
    document.addEventListener('touchmove',     preventPinch,    { passive: false })
    document.addEventListener('gesturestart',  preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })
    return () => {
      document.removeEventListener('touchmove',     preventPinch)
      document.removeEventListener('gesturestart',  preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
    }
  }, [])

  // ── Prompt 3 + 4: navigate — URL updates only after drag ends ─────────────
  const navigateTo = useCallback((idx: number) => {
    if (navLock.current || idx < 0 || idx >= TABS.length) return
    const route: Tab = TABS[idx]
    navLock.current = true

    // Prompt 4: push a history entry so back button returns to previous panel
    window.history.pushState({ tabIdx: idx }, '', route)

    // Prompt 3: router.replace fires after drag ends (URL updates here, not during drag)
    router.replace(route)
  }, [router])

  // ── Touch: start ──────────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, target: e.target }
    setPullY(0)
  }

  // ── Touch: move (pull-to-refresh tracking) ────────────────────────────────
  function onTouchMove(e: React.TouchEvent) {
    if (!touchStart.current) return
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y
    const mainEl = document.querySelector<HTMLElement>('main.rsm-main')

    if (
      pathname.startsWith('/dashboard') &&
      (mainEl?.scrollTop ?? 1) === 0 &&
      dy > 0 &&
      Math.abs(dy) > Math.abs(dx) * ANGLE_RATIO
    ) {
      setPullY(Math.min(dy * 0.4, PULL_THRESHOLD))
    }
  }

  // ── Touch: end — swipe detection + URL update (Prompt 3) ─────────────────
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const dx  = e.changedTouches[0].clientX - touchStart.current.x
    const dy  = e.changedTouches[0].clientY - touchStart.current.y
    const tgt = touchStart.current.target

    // Pull-to-refresh
    if (pullY >= PULL_THRESHOLD - 4) router.refresh()
    setPullY(0)

    // Swipe navigation — URL updates only here (after drag ends), never during drag
    if (
      !hasHorizontalScroll(tgt) &&
      Math.abs(dx) >= SWIPE_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy) * ANGLE_RATIO
    ) {
      const idx = getIdx(pathname)
      navigateTo(dx < 0 ? idx + 1 : idx - 1)
    }

    touchStart.current = null
  }

  // ── Desktop: render children without any wrapper ──────────────────────────
  if (!isMobile) return <>{children}</>

  // ── Mobile: horizontally animated panel container ─────────────────────────
  return (
    <div
      className="relative overflow-hidden min-h-full"
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

      {/*
        Prompt 2: horizontally arranged panels — each page is a full-width panel.
        AnimatePresence + motion.div keyed by pathname gives the horizontal slide effect.
        `custom={direction}` drives which side the new panel enters/exits from.
        `initial={false}` prevents the enter animation on first render (deep link).
      */}
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ willChange: 'transform' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
