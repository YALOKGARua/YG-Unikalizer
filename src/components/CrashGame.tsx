import React, { useEffect, useMemo, useRef, useState } from 'react'

type Phase = 'idle'|'flying'|'crashed'|'cashed'

function formatMultiplier(x: number) {
  return x.toFixed(2) + 'x'
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 0xffffffff
  }
}

function generateCrashPoint(seed: number) {
  const r = rng(seed)()
  const min = 1.01
  const max = 10
  const t = Math.pow(r, 2)
  return min + (max - min) * t
}

export default function CrashGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [mult, setMult] = useState(1)
  const [seed, setSeed] = useState(() => Date.now())
  const [targetCashout, setTargetCashout] = useState<number | null>(2)
  const [balance, setBalance] = useState(1000)
  const [bet, setBet] = useState(10)
  const [payout, setPayout] = useState(0)
  const crashPoint = useMemo(() => generateCrashPoint(seed), [seed])
  const startTsRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const canvas = c as HTMLCanvasElement
    const context = ctx as CanvasRenderingContext2D
    let w = canvas.clientWidth
    let h = canvas.clientHeight
    function resize() {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(w * window.devicePixelRatio))
      canvas.height = Math.max(1, Math.floor(h * window.devicePixelRatio))
    }
    function drawBackground() {
      context.clearRect(0, 0, canvas.width, canvas.height)
      const bg = context.createRadialGradient(canvas.width*0.5, canvas.height*0.2, 20, canvas.width*0.5, canvas.height*0.2, canvas.height)
      bg.addColorStop(0, '#0e1629')
      bg.addColorStop(1, '#070b14')
      context.fillStyle = bg
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.save()
      context.globalAlpha = 0.07
      const cx = 0
      const cy = canvas.height
      for (let i = 0; i < 28; i++) {
        const ang = (-Math.PI/10) + (i/28) * (Math.PI*0.9)
        const x = cx + Math.cos(ang) * canvas.width * 1.2
        const y = cy + Math.sin(ang) * canvas.height * 1.2
        context.beginPath()
        context.moveTo(cx, cy)
        context.lineTo(x, y)
        context.strokeStyle = '#000'
        context.lineWidth = 1
        context.stroke()
      }
      context.restore()
    }
    function plotCurve(t: number) {
      const px = canvas.width
      const py = canvas.height
      context.beginPath()
      context.lineWidth = Math.max(2, canvas.width * 0.004)
      context.strokeStyle = '#ff2d55'
      context.shadowBlur = 16
      context.shadowColor = '#ff2d55'
      const steps = 200
      for (let i = 0; i <= steps; i++) {
        const tt = (i / steps) * t
        const y = Math.pow(tt, 2.4)
        const x = tt
        const sx = x * px
        const sy = py - y * py
        if (i === 0) context.moveTo(sx, sy)
        else context.lineTo(sx, sy)
      }
      context.stroke()
      context.shadowBlur = 0
      context.globalAlpha = 0.15
      context.fillStyle = '#ff2d55'
      context.lineTo(t * px, py)
      context.lineTo(0, py)
      context.closePath()
      context.fill()
      context.globalAlpha = 1
    }
    function drawPlane(t: number, ts: number) {
      const px = canvas.width
      const py = canvas.height
      const x = t * px
      const y = py - Math.pow(t, 2.4) * py
      context.save()
      context.translate(x, y)
      const s = Math.max(12, Math.min(28, canvas.width * 0.022))
      context.scale(1, 1)
      context.fillStyle = '#ff2d55'
      context.strokeStyle = '#ff8aa3'
      context.lineWidth = Math.max(1, canvas.width*0.002)
      context.beginPath()
      context.moveTo(-s*0.6, 0)
      context.quadraticCurveTo(-s*0.1, -s*0.25, s*0.6, 0)
      context.quadraticCurveTo(-s*0.1, s*0.25, -s*0.6, 0)
      context.closePath()
      context.fill()
      context.stroke()
      context.beginPath()
      context.moveTo(-s*0.05, 0)
      context.lineTo(-s*0.55, -s*0.22)
      context.lineTo(s*0.05, 0)
      context.closePath()
      context.fill()
      context.beginPath()
      context.moveTo(-s*0.05, 0)
      context.lineTo(-s*0.55, s*0.22)
      context.lineTo(s*0.05, 0)
      context.closePath()
      context.fill()
      context.beginPath()
      context.moveTo(s*0.1, -s*0.06)
      context.lineTo(s*0.35, 0)
      context.lineTo(s*0.1, s*0.06)
      context.closePath()
      context.fill()
      context.save()
      context.translate(s*0.35, 0)
      const ang = (ts/120) % (Math.PI*2)
      context.rotate(ang)
      context.strokeStyle = '#ffd1db'
      context.lineWidth = Math.max(1, canvas.width*0.0015)
      context.beginPath()
      context.moveTo(-s*0.18, 0)
      context.lineTo(s*0.18, 0)
      context.moveTo(0, -s*0.18)
      context.lineTo(0, s*0.18)
      context.stroke()
      context.restore()
      context.restore()
    }
    function loop(ts: number) {
      if (startTsRef.current == null) startTsRef.current = ts
      const elapsed = (ts - startTsRef.current) / 1000
      const t = Math.min(1, elapsed / 8)
      const k = 1 + Math.pow(t, 2.2) * (crashPoint - 1)
      setMult(k)
      resize()
      drawBackground()
      const nx = Math.min(1, (k - 1) / (crashPoint - 1))
      plotCurve(nx)
      drawPlane(nx, ts)
      if (targetCashout && phase === 'flying' && k >= targetCashout) doCashout(k)
      if (k >= crashPoint) {
        setPhase('crashed')
        cancelAnimationFrame(rafRef.current || 0)
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    if (phase === 'flying') {
      startTsRef.current = null
      rafRef.current = requestAnimationFrame(loop)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase, seed, crashPoint, targetCashout])

  function start() {
    if (phase !== 'idle') return
    if (bet <= 0 || bet > balance) return
    setBalance(v => v - bet)
    setPayout(0)
    setPhase('flying')
    setSeed(Date.now())
  }

  function resetRound() {
    setPhase('idle')
    setMult(1)
    setSeed(Date.now())
    setPayout(0)
  }

  function doCashout(k: number) {
    if (phase !== 'flying') return
    const p = Math.floor(bet * k)
    setPayout(p)
    setBalance(v => v + p)
    setPhase('cashed')
  }

  function next() {
    resetRound()
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-3 p-3 border-b border-white/10 bg-black/30">
        <div className="text-xs opacity-60">author YALOKGAR</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-slate-800 text-xs">{balance}$</div>
        </div>
      </div>
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="relative w-full max-w-[1100px] aspect-[16/9] h-[60vh] max-h-[560px] rounded-xl overflow-hidden border border-white/10 bg-slate-950 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 flex items-start justify-end p-2 text-[10px] pointer-events-none">
            <div className="px-2 py-1 rounded bg-black/40 border border-white/10">Crash {formatMultiplier(crashPoint)}</div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-white text-7xl font-extrabold tracking-tight drop-shadow-[0_6px_24px_rgba(255,45,85,0.35)]">
              {formatMultiplier(mult)}
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <input type="number" min={1} step={1} inputMode="numeric" className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-sm w-28" value={bet} onChange={e=>setBet(Math.max(1, Math.floor(Number(e.target.value)||0)))} disabled={phase==='flying'} />
          <select className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-sm" value={String(targetCashout||'manual')} onChange={e=>{ const v=e.target.value; setTargetCashout(v==='manual'?null:Math.max(1.01, Number(v))) }} disabled={phase==='crashed'}>
            <option value="manual">Manual cashout</option>
            <option value="1.2">Auto 1.2x</option>
            <option value="1.5">Auto 1.5x</option>
            <option value="2">Auto 2x</option>
            <option value="3">Auto 3x</option>
          </select>
          {phase==='idle' && <button className="btn btn-primary text-sm" onClick={start}>Start</button>}
          {phase==='flying' && <button className="btn btn-secondary text-sm" onClick={()=>doCashout(mult)}>Cashout</button>}
          {phase!=='flying' && <button className="btn btn-ghost text-sm" onClick={next}>Next</button>}
          <div className="ml-auto text-xs opacity-80">Crash at {formatMultiplier(crashPoint)}</div>
          {payout>0 && <div className="text-emerald-400 text-sm font-semibold">+{payout}$</div>}
        </div>
      </div>
    </div>
  )
}