import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store — resets on PM2 restart (acceptable for internal tool)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX    = 60   // requests
const RATE_LIMIT_WINDOW = 60_000 // 1 minute in ms
const LOCALHOST_IPS     = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function checkRateLimit(ip: string): boolean {
  // Exempt localhost from rate limiting (CI, tests, internal tool)
  if (LOCALHOST_IPS.has(ip)) return true

  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) return false
  return true
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limit API routes (localhost is exempt)
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(req)
    if (!checkRateLimit(ip)) {
      return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const res = NextResponse.next()

  // SEC 3: Security headers on all routes
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; connect-src 'self'"
  )
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
