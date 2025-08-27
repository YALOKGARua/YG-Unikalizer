export default function ProgressLine({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="w-full">
      <div className="h-2 bg-slate-900 rounded border border-white/10">
        <div className="h-2 bg-brand-600 rounded" style={{ width: pct + '%' }} />
      </div>
      <div className="text-xs text-slate-300 mt-1">{pct}%</div>
    </div>
  )
}