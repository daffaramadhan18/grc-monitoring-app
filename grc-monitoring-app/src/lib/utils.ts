import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(value: number | null | undefined): string {
  if (value == null || value === 0) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

// ─── Opportunity status ────────────────────────────────────────────────────────

export const OPP_STATUSES = [
  'Win',
  'Lose',
  'Waiting for Result',
  'Withdraw',
  'Cancelled',
  'Backlog',
  'Transfer to others',
  'In progress',
] as const

export const OPP_STATUS_COLORS: Record<string, string> = {
  Win:                  'bg-[#43B02A]/15 text-[#2d7a1a]',
  Lose:                 'bg-red-100 text-red-700',
  'Waiting for Result': 'bg-amber-100 text-amber-700',
  'In progress':        'bg-[#009CDE]/15 text-[#006fa0]',
  Backlog:              'bg-gray-100 text-gray-600',
  Withdraw:             'bg-gray-100 text-gray-600',
  Cancelled:            'bg-gray-100 text-gray-600',
  'Transfer to others': 'bg-gray-100 text-gray-600',
}

// ─── Project status ───────────────────────────────────────────────────────────

export const PROJ_STATUSES = ['Waiting to Start', 'Planning', 'Fieldwork', 'Reporting', 'Finish'] as const

export const PROJ_STATUS_COLORS: Record<string, string> = {
  'Waiting to Start': 'bg-violet-100 text-violet-700',
  Planning:  'bg-[#009CDE]/15 text-[#006fa0]',
  Fieldwork: 'bg-amber-100 text-amber-700',
  Reporting: 'bg-orange-100 text-orange-700',
  Finish:    'bg-[#43B02A]/15 text-[#2d7a1a]',
}

// ─── Termin status ────────────────────────────────────────────────────────────

export const TERMIN_STATUSES = [
  'Deliverables in Progress',
  'Invoice Requested',
  'Invoice Sent',
  'Paid',
] as const

export const TERMIN_STATUS_COLORS: Record<string, string> = {
  'Deliverables in Progress': 'bg-gray-100 text-gray-600',
  'Invoice Requested':        'bg-amber-100 text-amber-700',
  'Invoice Sent':             'bg-[#009CDE]/15 text-[#006fa0]',
  Paid:                       'bg-[#43B02A]/15 text-[#2d7a1a]',
}

export function capacityLoadPct(projects: number, proposals: number): number {
  return Math.round(((projects + proposals) / 2) * 100)
}

export function capacityBadge(projects: number, proposals: number) {
  const pct = capacityLoadPct(projects, proposals)
  if (pct > 100)  return { label: 'Overloaded',  cls: 'bg-red-100 text-red-700',         overloaded: true,  order: 0 }
  if (pct === 100) return { label: 'At Capacity', cls: 'bg-amber-100 text-amber-700',     overloaded: false, order: 1 }
  return              { label: 'Available',   cls: 'bg-[#43B02A]/15 text-[#2d7a1a]', overloaded: false, order: 2 }
}
