import React, { useEffect, useMemo, useRef, useState } from 'react'

type SymbolId = 'W'|'7'|'BAR'|'C'|'A'|'K'|'Q'|'J'|'10'
type Phase = 'idle'|'spinning'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 0xffffffff
  }
}

function pickWeighted(r: () => number, items: Array<{ id: SymbolId; w: number }>) {
  let sum = 0
  for (const it of items) sum += it.w
  const t = r() * sum
  let acc = 0
  for (const it of items) {
    acc += it.w
    if (t <= acc) return it.id
  }
  return items[items.length - 1].id
}

function generateStopMatrix(r: () => number, rows: number, reels: number) {
  const weights: Array<{ id: SymbolId; w: number }> = [
    { id: '10', w: 36 },
    { id: 'J', w: 34 },
    { id: 'Q', w: 32 },
    { id: 'K', w: 30 },
    { id: 'A', w: 28 },
    { id: 'C', w: 16 },
    { id: 'BAR', w: 12 },
    { id: '7', w: 8 },
    { id: 'W', w: 3 }
  ]
  const m: SymbolId[][] = []
  for (let c = 0; c < reels; c++) {
    const col: SymbolId[] = []
    for (let rIdx = 0; rIdx < rows; rIdx++) col.push(pickWeighted(r, weights))
    m.push(col)
  }
  return m
}

function formatMoney(v: number) {
  return v.toFixed(0) + '$'
}

export default function SlotsGame() {
  const rows = 3
  const reels = 5
  const [balance, setBalance] = useState(1000)
  const [betPerLine, setBetPerLine] = useState(2)
  const [lines, setLines] = useState(10)
  const totalBet = betPerLine * lines
  const [phase, setPhase] = useState<Phase>('idle')
  const [seed, setSeed] = useState(() => Date.now())
  const rand = useMemo(() => rng(seed), [seed])
  const [grid, setGrid] = useState<SymbolId[][]>(() => generateStopMatrix(rand, rows, reels))
  const [finalGrid, setFinalGrid] = useState<SymbolId[][] | null>(null)
  const [lastWin, setLastWin] = useState(0)
  const spinTimersRef = useRef<number[]>([])
  const tickTimersRef = useRef<number[]>([])
  const [highlight, setHighlight] = useState<{ lineIndex: number; count: number }[]>([])
  const [winAnim, setWinAnim] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const tileRefs = useRef<(HTMLDivElement | null)[][]>(Array.from({ length: reels }, () => Array.from({ length: rows }, () => null)))
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [tileCenters, setTileCenters] = useState<{ x: number; y: number }[][]>([])

  const paytable: Record<SymbolId, {3?: number; 4?: number; 5?: number}> = {
    W: { 3: 200, 4: 500, 5: 2000 },
    '7': { 3: 100, 4: 300, 5: 1000 },
    BAR: { 3: 80, 4: 200, 5: 800 },
    C: { 3: 60, 4: 160, 5: 600 },
    A: { 3: 40, 4: 80, 5: 200 },
    K: { 3: 40, 4: 80, 5: 200 },
    Q: { 3: 30, 4: 60, 5: 160 },
    J: { 3: 20, 4: 40, 5: 120 },
    '10': { 3: 20, 4: 40, 5: 120 }
  }

  const paylines: number[][] = [
    [1,1,1,1,1],
    [0,0,0,0,0],
    [2,2,2,2,2],
    [0,1,2,1,0],
    [2,1,0,1,2],
    [0,0,1,0,0],
    [2,2,1,2,2],
    [1,0,0,0,1],
    [1,2,2,2,1],
    [0,1,1,1,0]
  ]

  const linePoints = useMemo(() => {
    const w = Math.max(1, boxSize.w)
    const h = Math.max(1, boxSize.h)
    if (tileCenters.length === reels && tileCenters[0] && tileCenters[0].length === rows) {
      return paylines.map(line => line.map((row, c) => tileCenters[c][row]))
    }
    return paylines.map(line => line.map((row, c) => ({ x: ((c + 0.5) / reels) * w, y: ((row + 0.5) / rows) * h })))
  }, [tileCenters, boxSize, reels, rows])

  const lineColors = ['#22d3ee','#f472b6','#f59e0b','#10b981','#60a5fa','#a78bfa','#f87171','#34d399','#fb7185','#fde047']

  function evaluateWins(g: SymbolId[][]) {
    let total = 0
    const wins: { lineIndex: number; count: number }[] = []
    for (let li = 0; li < Math.min(lines, paylines.length); li++) {
      const line = paylines[li]
      const seq: SymbolId[] = []
      for (let c = 0; c < reels; c++) seq.push(g[c][line[c]])
      let base: SymbolId | null = null
      for (let i = 0; i < seq.length; i++) { if (seq[i] !== 'W') { base = seq[i]; break } }
      if (!base) base = 'W'
      let count = 0
      for (let i = 0; i < seq.length; i++) { if (seq[i] === base || seq[i] === 'W') count++; else break }
      if (count >= 3) {
        const mul = (paytable[base][count as 3|4|5] || 0)
        const win = betPerLine * mul
        total += win
        wins.push({ lineIndex: li, count })
      }
    }
    return { total, wins }
  }

  function startSpin() {
    if (phase !== 'idle') return
    if (totalBet <= 0 || totalBet > balance) return
    setBalance(v => v - totalBet)
    setLastWin(0)
    setHighlight([])
    setWinAnim(false)
    const r = rng(Date.now())
    const target = generateStopMatrix(r, rows, reels)
    setFinalGrid(target)
    setPhase('spinning')
    setSeed(Date.now())
    spinTimersRef.current.forEach(id => clearTimeout(id))
    tickTimersRef.current.forEach(id => clearInterval(id))
    spinTimersRef.current = []
    tickTimersRef.current = []
    const stops = [700, 1000, 1300, 1600, 1900]
    for (let c = 0; c < reels; c++) {
      const tick = window.setInterval(() => {
        setGrid(g => {
          const ng: SymbolId[][] = g.map(col => col.slice())
          const newCol: SymbolId[] = []
          for (let rIdx = 0; rIdx < rows; rIdx++) newCol.push(pickWeighted(rand, [
            { id: '10', w: 36 },
            { id: 'J', w: 34 },
            { id: 'Q', w: 32 },
            { id: 'K', w: 30 },
            { id: 'A', w: 28 },
            { id: 'C', w: 16 },
            { id: 'BAR', w: 12 },
            { id: '7', w: 8 },
            { id: 'W', w: 3 }
          ]))
          ng[c] = newCol
          return ng
        })
      }, 50)
      tickTimersRef.current.push(tick)
      const stop = window.setTimeout(() => {
        window.clearInterval(tick)
        setGrid(g => {
          const ng: SymbolId[][] = g.map(col => col.slice())
          ng[c] = finalGrid ? finalGrid[c] : target[c]
          return ng
        })
        if (c === reels - 1) {
          const { total, wins } = evaluateWins(target)
          setLastWin(total)
          if (total > 0) setBalance(v => v + total)
          setHighlight(wins)
          window.setTimeout(() => setWinAnim(true), 30)
          setPhase('idle')
        }
      }, stops[c])
      spinTimersRef.current.push(stop)
    }
  }

  useEffect(() => {
    function recalc() {
      const box = containerRef.current
      if (!box) return
      const boxRect = box.getBoundingClientRect()
      const pts: { x: number; y: number }[][] = []
      for (let c = 0; c < reels; c++) {
        const col: { x: number; y: number }[] = []
        for (let rIdx = 0; rIdx < rows; rIdx++) {
          const el = tileRefs.current[c][rIdx]
          if (el) {
            const rr = el.getBoundingClientRect()
            col.push({ x: rr.left - boxRect.left + rr.width / 2, y: rr.top - boxRect.top + rr.height / 2 })
          } else {
            col.push({ x: ((c + 0.5) / reels) * boxRect.width, y: ((rIdx + 0.5) / rows) * boxRect.height })
          }
        }
        pts.push(col)
      }
      setBoxSize({ w: boxRect.width, h: boxRect.height })
      setTileCenters(pts)
    }
    const id = window.setTimeout(recalc, 0)
    window.addEventListener('resize', recalc)
    return () => {
      window.removeEventListener('resize', recalc)
      window.clearTimeout(id)
      spinTimersRef.current.forEach(id => clearTimeout(id))
      tickTimersRef.current.forEach(id => clearInterval(id))
      spinTimersRef.current = []
      tickTimersRef.current = []
    }
  }, [])

  function symbolLabel(id: SymbolId) {
    if (id === 'W') return 'WILD'
    if (id === 'BAR') return 'BAR'
    if (id === '7') return '7'
    return id
  }

  function symbolColor(id: SymbolId) {
    if (id === 'W') return 'from-amber-400 to-yellow-600'
    if (id === '7') return 'from-rose-400 to-red-600'
    if (id === 'BAR') return 'from-slate-300 to-slate-500'
    if (id === 'C') return 'from-cyan-300 to-sky-600'
    if (id === 'A') return 'from-emerald-300 to-emerald-600'
    if (id === 'K') return 'from-indigo-300 to-indigo-600'
    if (id === 'Q') return 'from-fuchsia-300 to-fuchsia-600'
    if (id === 'J') return 'from-lime-300 to-lime-600'
    return 'from-orange-300 to-orange-600'
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-3 p-3 border-b border-white/10 bg-black/30">
        <div className="text-xs opacity-60">author YALOKGAR</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-slate-800 text-xs">{formatMoney(balance)}</div>
        </div>
      </div>
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div ref={containerRef} className="relative w-full max-w-[1100px] aspect-[16/9] h-[60vh] max-h-[560px] rounded-xl overflow-hidden border border-white/10 bg-slate-950 shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex">
          <div className="flex-1 p-4 flex gap-2 items-stretch">
            {Array.from({ length: reels }).map((_, c) => (
              <div key={c} className="flex flex-col gap-2 flex-1">
                {Array.from({ length: rows }).map((_, rIdx) => {
                  const id = grid[c][rIdx]
                  const isHot = highlight.some(h => c < h.count && paylines[h.lineIndex][c] === rIdx)
                  return (
                    <div ref={(el)=>{ tileRefs.current[c][rIdx] = el }} key={rIdx} className={`flex-1 rounded-lg border ${isHot?'border-amber-400/80 shadow-lg shadow-amber-400/30':''} ${!isHot?'border-white/10':''} bg-gradient-to-br ${symbolColor(id)} flex items-center justify-center text-slate-900 text-2xl font-extrabold select-none ${isHot && winAnim ? 'animate-pulse' : ''}`}>{symbolLabel(id)}</div>
                  )
                })}
              </div>
            ))}
          </div>
          <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${Math.max(1, boxSize.w)} ${Math.max(1, boxSize.h)}`} preserveAspectRatio="none">
            {linePoints.slice(0, lines).map((pts, li) => {
              const d = pts.map((p, i) => `${i===0?'M':'L'} ${Math.round(p.x)} ${Math.round(p.y)}`).join(' ')
              return (
                <path key={`base-${li}`} d={d} pathLength={100} fill="none" stroke={lineColors[li%lineColors.length]} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} strokeDasharray="8 10" />
              )
            })}
            {highlight.map((h, idx) => {
              const pts = linePoints[h.lineIndex].slice(0, Math.max(1, h.count))
              const d = pts.map((p, i) => `${i===0?'M':'L'} ${Math.round(p.x)} ${Math.round(p.y)}`).join(' ')
              const color = lineColors[h.lineIndex%lineColors.length]
              return (
                <path key={`win-${h.lineIndex}-${idx}`} d={d} pathLength={100} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 100, strokeDashoffset: winAnim ? 0 : 100, transition: 'stroke-dashoffset 600ms ease' }} />
              )
            })}
          </svg>
        </div>
      </div>
      <div className="p-3 border-t border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost text-sm" onClick={()=>setBetPerLine(Math.max(1, betPerLine-1))} disabled={phase==='spinning'}>-</button>
            <div className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-sm w-20 text-center">{betPerLine}</div>
            <button className="btn btn-ghost text-sm" onClick={()=>setBetPerLine(Math.min(100, betPerLine+1))} disabled={phase==='spinning'}>+</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost text-sm" onClick={()=>setLines(Math.max(1, lines-1))} disabled={phase==='spinning'}>-</button>
            <div className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-sm w-24 text-center">{lines} lines</div>
            <button className="btn btn-ghost text-sm" onClick={()=>setLines(Math.min(10, lines+1))} disabled={phase==='spinning'}>+</button>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[1,2,5,10,20,50].map(v => (
              <button key={v} className="btn btn-ghost text-xs" onClick={()=>setBetPerLine(v)} disabled={phase==='spinning'}>{v}</button>
            ))}
          </div>
          <button className="btn btn-primary text-sm" onClick={startSpin} disabled={phase!=='idle' || totalBet>balance}>Spin</button>
          <div className="ml-auto text-xs opacity-80">Bet {formatMoney(totalBet)}</div>
          {lastWin>0 && <div className="text-emerald-400 text-sm font-semibold">+{formatMoney(lastWin)}</div>}
        </div>
      </div>
    </div>
  )
}