'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import MonthFilter from '@/components/MonthFilter'

export default function DashboardFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const month  = params.get('month') ?? ''

  function handleChange(v: string) {
    const url = new URL(window.location.href)
    if (v) url.searchParams.set('month', v)
    else    url.searchParams.delete('month')
    router.replace(url.pathname + url.search)
  }

  return <MonthFilter value={month} onChange={handleChange} />
}
