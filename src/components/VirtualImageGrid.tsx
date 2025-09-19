import { useEffect, useMemo, useRef, useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

const TYPE = 'VIRT_TILE'

function DraggableTile({ index, path, isSel, style, toFileUrl, onToggle, onMove }: any) {
  const [{ isDragging }, drag] = useDrag(() => ({ type: TYPE, item: { index }, collect: (m) => ({ isDragging: m.isDragging() }) }))
  const [, drop] = useDrop(() => ({ accept: TYPE, drop: (item: any) => { if (item.index !== index) onMove(item.index, index) } }))
  return (
    <div ref={(node) => drag(drop(node)) as any} style={style} className={`p-1 ${isDragging?'opacity-50':''}`}>
      <div className={`group tile bg-slate-900/60 rounded-md overflow-hidden border ${isSel?'border-brand-600 ring-1 ring-brand-600/40':'border-white/5'} relative`} onClick={(e)=>{
        const multi = (e as any).metaKey || (e as any).ctrlKey
        const rangeFrom = undefined
        onToggle(index, multi, rangeFrom as any)
      }}>
        <div className="h-36 bg-slate-900 flex items-center justify-center overflow-hidden">
          <img loading="lazy" decoding="async" alt="file" className="max-h-36 transition-transform group-hover:scale-[1.02]" src={toFileUrl(path)} />
        </div>
        <div className="text-[10px] p-2 truncate opacity-80 flex items-center gap-2" title={path}>
          <span className="flex-1 truncate">{path}</span>
        </div>
      </div>
    </div>
  )
}

export default function VirtualImageGrid({ files, selected, onToggle, onReorder, toFileUrl, columnWidth = 220, rowHeight = 180 }: { files: string[]; selected: Set<number>; onToggle: (index: number, multi?: boolean, rangeFrom?: number) => void; onReorder?: (from: number, to: number) => void; toFileUrl: (p: string) => string; columnWidth?: number; rowHeight?: number }) {
  const containerRef = useRef<HTMLDivElement|null>(null)
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? Math.min(window.innerWidth - 360, 1400) : 1000))
  const [scrollTop, setScrollTop] = useState(0)
  const columnCount = Math.max(1, Math.floor(width / columnWidth))
  const rowCount = Math.max(1, Math.ceil(files.length / columnCount))
  const gridWidth = columnCount * columnWidth
  const viewportHeight = 600
  const totalHeight = Math.max(rowHeight, rowCount * rowHeight)
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2)
  const endRow = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 2)
  const items: number[] = []
  for (let r = startRow; r < endRow; r++) {
    const start = r * columnCount
    const end = Math.min(start + columnCount, files.length)
    for (let i = start; i < end; i++) items.push(i)
  }
  useEffect(() => {
    function onResize() { setWidth(Math.min(window.innerWidth - 360, 1400)) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return (
    <div className="w-full flex justify-center">
      <DndProvider backend={HTML5Backend}>
        <div ref={containerRef} style={{ width: gridWidth, height: viewportHeight, overflow: 'auto', position: 'relative' }} onScroll={e=>setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}>
          <div style={{ position: 'relative', width: gridWidth, height: totalHeight }}>
            {items.map(i => {
              const r = Math.floor(i / columnCount)
              const c = i % columnCount
              const p = files[i]
              const isSel = selected.has(i)
              return (
                <div key={p + i} style={{ position: 'absolute', top: r * rowHeight, left: c * columnWidth, width: columnWidth, height: rowHeight }}>
                  <DraggableTile index={i} path={p} isSel={isSel} style={{ width: columnWidth, height: rowHeight, padding: 4 }} toFileUrl={toFileUrl} onToggle={onToggle} onMove={(from: number, to: number)=>{ onReorder && onReorder(from, to) }} />
                </div>
              )
            })}
          </div>
        </div>
      </DndProvider>
    </div>
  )
}