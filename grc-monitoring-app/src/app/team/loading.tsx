export default function TeamLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-16 bg-gray-200 rounded-lg" />
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>

      {/* Workload cards — mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>

      {/* Workload table — desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex gap-4 px-4 py-3 border-b border-gray-100">
          {[30, 15, 15, 15, 15].map((w, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-gray-50 items-center">
            <div className="flex items-center gap-2" style={{ width: '30%' }}>
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="h-4 flex-1 bg-gray-100 rounded" />
            </div>
            {[15, 15, 15, 15].map((w, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
