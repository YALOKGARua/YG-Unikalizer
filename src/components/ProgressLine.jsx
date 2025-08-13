export default function ProgressLine({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="w-full">
      <div className="h-2 bg-slate-800 rounded">
        <div className="h-2 bg-brand-500 rounded" style={{ width: pct + '%' }} />
      </div>
      <div className="text-xs text-slate-300 mt-1">{pct}%</div>
    </div>
  )
}