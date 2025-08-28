export default function ProgressLine({ current, total }: { current: number; total: number }) {
  const pct = Math.max(0, Math.min(100, total > 0 ? Math.round((current / total) * 100) : 0))
  return (
    <div className="w-full h-2 bg-slate-900 rounded border border-white/10 overflow-hidden" aria-label="progress">
      <div className="h-2 bg-brand-600 transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}