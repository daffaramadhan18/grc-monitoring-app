'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/login')
      return
    }
    if (session.user.mustChangePassword === false) {
      router.replace('/dashboard')
    }
  }, [session, status, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Password dan konfirmasi tidak cocok.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Gagal mengubah password.')
        return
      }

      setSuccess(true)
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2000)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2D2D2D' }}>
        <div className="text-white text-sm">Memuat...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2D2D2D' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-gray-900 tracking-tight">RSM</div>
          <div className="text-sm text-gray-500 mt-1 font-medium">CC3 · GRC Monitoring</div>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Password changed successfully.</p>
            <p className="text-xs text-gray-400">Redirecting to login...</p>
          </div>
        ) : (
          <>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Ganti Password</h2>
        <p className="text-xs text-gray-500 mb-6">
          Akun Anda memerlukan password baru sebelum melanjutkan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
              Password Baru
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none transition"
              onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #009CDE40'}
              onBlur={(e) => e.currentTarget.style.boxShadow = ''}
              placeholder="Minimal 8 karakter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
              Konfirmasi Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none transition"
              onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #009CDE40'}
              onBlur={(e) => e.currentTarget.style.boxShadow = ''}
              placeholder="Ulangi password baru"
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
            {loading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full mt-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          Keluar
        </button>
          </>
        )}
      </div>
    </div>
  )
}
