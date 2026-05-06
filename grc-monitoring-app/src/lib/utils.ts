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
  'Submitted',
  'Win',
  'Lose',
  'Waiting for Result',
  'Waiting for RFP',
  'Backlog',
  'Withdraw',
  'Cancelled',
  'In Progress',
  'Transferred to other CC3',
] as const

export const OPP_STATUS_COLORS: Record<string, string> = {
  Win:                       'bg-green-100 text-green-800',
  Lose:                      'bg-red-100 text-red-800',
  Cancelled:                 'bg-red-100 text-red-800',
  'Waiting for Result':      'bg-yellow-100 text-yellow-800',
  'Waiting for RFP':         'bg-yellow-100 text-yellow-800',
  Submitted:                 'bg-blue-100 text-blue-800',
  'In Progress':             'bg-blue-100 text-blue-800',
  Backlog:                   'bg-gray-100 text-gray-600',
  Withdraw:                  'bg-gray-100 text-gray-600',
  'Transferred to other CC3':'bg-gray-100 text-gray-600',
}

// ─── Project status ───────────────────────────────────────────────────────────

export const PROJ_STATUSES = ['Planning', 'Fieldwork', 'Reporting', 'Finish'] as const

export const PROJ_STATUS_COLORS: Record<string, string> = {
  Planning:  'bg-blue-100 text-blue-800',
  Fieldwork: 'bg-yellow-100 text-yellow-800',
  Reporting: 'bg-orange-100 text-orange-800',
  Finish:    'bg-green-100 text-green-800',
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
  'Invoice Requested':        'bg-yellow-100 text-yellow-800',
  'Invoice Sent':             'bg-blue-100 text-blue-800',
  Paid:                       'bg-green-100 text-green-800',
}
