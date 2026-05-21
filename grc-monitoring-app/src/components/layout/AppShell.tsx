'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileTopbar from './MobileTopbar'
import SWRProvider from '@/components/SWRProvider'

const AUTH_PATHS = ['/login', '/change-password']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (AUTH_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <>
      <MobileTopbar />
      <SWRProvider>
        <div className="flex h-screen overflow-x-hidden">
          <Sidebar />
          <main className="rsm-main w-full min-w-0 md:flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-4 pt-[56px] md:pt-0 md:p-6">
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
    </>
  )
}
