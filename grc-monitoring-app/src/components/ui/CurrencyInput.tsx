'use client'

interface Props {
  value: string          // raw numeric string, e.g. "150000000"
  onChange: (raw: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function format(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

export default function CurrencyInput({ value, onChange, placeholder = '0', className, disabled }: Props) {
  const base = 'w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10 pr-3 py-2'

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        className={`${base} ${className ?? ''}`}
        value={format(value)}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '')
          onChange(raw)
        }}
      />
    </div>
  )
}
