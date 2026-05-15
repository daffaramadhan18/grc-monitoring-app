'use client'

import { CalendarDays } from 'lucide-react'

interface Props {
  value: string          // "YYYY-MM" or "" for All Time
  onChange: (v: string) => void
  className?: string
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function MonthFilter({ value, onChange, className = '' }: Props) {
  const [year, month] = value ? value.split('-').map(Number) : [null, null]
  const currentYear = new Date().getFullYear()

  function handleMonth(e: React.ChangeEvent<HTMLSelectElement>) {
    const m = e.target.value
    if (!m) { onChange(''); return }
    const y = year ?? currentYear
    onChange(`${y}-${m}`)
  }

  function handleYear(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!raw) { onChange(''); return }
    const y = Number(raw)
    if (!y) return
    const m = month ? String(month).padStart(2, '0') : '01'
    onChange(`${y}-${m}`)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CalendarDays size={14} className="text-gray-400 shrink-0" />
      <select
        value={month ? String(month).padStart(2, '0') : ''}
        onChange={handleMonth}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009CDE] bg-white"
      >
        <option value="">All Time</option>
        {MONTHS.map((label, i) => (
          <option key={i} value={String(i + 1).padStart(2, '0')}>{label}</option>
        ))}
      </select>
      {month && (
        <input
          type="number"
          value={year ?? currentYear}
          onChange={handleYear}
          min={2000}
          max={2100}
          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009CDE] bg-white tabular-nums"
        />
      )}
    </div>
  )
}
