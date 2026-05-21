const FINANCIAL_FIELDS = ['harga', 'revenueCf', 'rrPercentage', 'confirmedFee'] as const

/* eslint-disable @typescript-eslint/no-explicit-any */
export function stripFinancial<T extends Record<string, any>>(data: T, role: string): T {
  if (role !== 'Intern') return data
  const stripped: Record<string, any> = { ...data }
  for (const field of FINANCIAL_FIELDS) {
    if (field in stripped) stripped[field] = null
  }
  if (Array.isArray(stripped['termins'])) {
    stripped['termins'] = stripped['termins'].map((t: any) => ({ ...t, fee: null }))
  }
  return stripped as T
}

export function stripFinancialArray<T extends Record<string, any>>(data: T[], role: string): T[] {
  return data.map((item) => stripFinancial(item, role))
}
/* eslint-enable @typescript-eslint/no-explicit-any */
