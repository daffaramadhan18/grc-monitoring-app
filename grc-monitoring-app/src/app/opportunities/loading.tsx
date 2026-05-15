export default function OpportunitiesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
          <div className="h-9 w-36 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3 border-b border-gray-100">
          {[10, 20, 15, 12, 10, 8].map((w, i) => (
            <div key={i} className={`h-4 bg-gray-200 rounded`} style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-gray-50">
            {[10, 20, 15, 12, 10, 8].map((w, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
