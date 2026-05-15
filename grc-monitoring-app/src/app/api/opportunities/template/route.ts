import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const headers = [
    'Client Initial', 'Client Name', 'Service Type', 'Sub-service', 'Proposal Name',
    'Phase', 'Submitted Date', 'Status', 'Probability (%)', 'Notes', '%RR',
    'Harga', 'Revenue CF',
    'MIC', 'TM1', 'TM2', 'TM3', 'TM4', 'TM5', 'TM6',
    'Expected Date', 'Risk Level',
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers])
  XLSX.utils.book_append_sheet(wb, ws, 'Opportunities')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Opportunities_Template.xlsx"',
    },
  })
}
