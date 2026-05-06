import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr))
}

export const OPPORTUNITY_STATUSES = [
  "Submitted",
  "Win",
  "Lose",
  "Waiting for Result",
  "Waiting for RFP",
  "Backlog",
  "Withdraw",
  "Cancelled",
  "Transferred",
  "In Progress",
] as const

export const STATUS_COLORS: Record<string, string> = {
  Win: "bg-green-100 text-green-800",
  Lose: "bg-red-100 text-red-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Submitted: "bg-yellow-100 text-yellow-800",
  "Waiting for Result": "bg-orange-100 text-orange-800",
  "Waiting for RFP": "bg-purple-100 text-purple-800",
  Backlog: "bg-gray-100 text-gray-600",
  Withdraw: "bg-slate-100 text-slate-600",
  Cancelled: "bg-red-50 text-red-400",
  Transferred: "bg-teal-100 text-teal-700",
}
