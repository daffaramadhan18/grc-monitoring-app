'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError('Username atau password salah.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      username,
      password,
      callbackUrl: '/dashboard',
      redirect: false,
    })

    if (result?.error) {
      setError('Username atau password salah.')
      setLoading(false)
    } else if (result?.url) {
      window.location.href = result.url
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2D2D2D' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-gray-900 tracking-tight">RSM</div>
          <div className="text-sm text-gray-500 mt-1 font-medium">CC3 · GRC Monitoring</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': '#009CDE' } as React.CSSProperties}
              onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #009CDE40'}
              onBlur={(e) => e.currentTarget.style.boxShadow = ''}
              placeholder="e.g. daffa.ramadhan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #009CDE40'}
              onBlur={(e) => e.currentTarget.style.boxShadow = ''}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#009CDE' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0080B8' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#009CDE' }}
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
