import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] // %PDF
const MAX_SIZE  = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // SEC 2: File size limit — check BEFORE reading into memory
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'File terlalu besar (max 10MB)' }, { status: 400 })

    if (file.type !== 'application/pdf')
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // SEC 1: Magic byte check — must start with %PDF
    if (
      buffer.length < 4 ||
      buffer[0] !== PDF_MAGIC[0] ||
      buffer[1] !== PDF_MAGIC[1] ||
      buffer[2] !== PDF_MAGIC[2] ||
      buffer[3] !== PDF_MAGIC[3]
    ) {
      return NextResponse.json({ error: 'File bukan PDF yang valid' }, { status: 400 })
    }

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const dir      = path.join(process.cwd(), 'public', 'uploads')

    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, safeName), buffer)

    return NextResponse.json({
      path:     `/uploads/${safeName}`,
      filename: file.name,
    })
  } catch (err: unknown) {
    console.error('[API POST /api/upload]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
