import * as XLSX from 'xlsx'

export function parseDateDMY(val: unknown): Date | null {
  if (!val) return null
  const str = String(val).trim()
  const parts = str.split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number)
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d)
  }
  const n = Number(val)
  if (!isNaN(n) && n > 1000) {
    const date = XLSX.SSF.parse_date_code(n)
    if (date) return new Date(date.y, date.m - 1, date.d)
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).replace(/Rp\.?\s?/gi, '').replace(/\./g, '').replace(/,/g, '')
  const n = Number(str)
  return isNaN(n) ? null : n
}
