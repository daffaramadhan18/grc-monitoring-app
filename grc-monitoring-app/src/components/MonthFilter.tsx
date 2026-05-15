'use client'

import { CalendarDays } from 'lucide-react'

interface Props {
  value: string          // "YYYY-MM" or "" for All Time
  onChange: (v: string) => void
  className?: string
}

function generateOptions() {
  const opts: { value: string; label: string }[] = [{ value: '', label: 'All Time' }]
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
}

const OPTIONS = generateOptions()

export default function MonthFilter({ value, onChange, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CalendarDays size={14} className="text-gray-400 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009CDE] bg-white"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
