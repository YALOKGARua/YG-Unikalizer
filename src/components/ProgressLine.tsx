export default function ProgressLine({ current, total }: { current: number; total: number }) {
  const pct = Math.max(0, Math.min(100, total > 0 ? Math.round((current / total) * 100) : 0))
  return (
    <div
      className="w-full h-3 rounded-full overflow-hidden border border-white/10 bg-slate-200 dark:bg-slate-900/60"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="progress"
    >
      <div
        className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-600 to-purple-600 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}