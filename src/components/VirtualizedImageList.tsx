import React, { useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import { FaEye, FaTrash, FaInfoCircle } from 'react-icons/fa'

interface VirtualizedImageListProps {
  items: { id: string; path: string; selected: boolean }[]
  onPreview: (item: { id: string; path: string }) => void
  onRemove: (item: { id: string; path: string }) => void
  onToggleSelect: (item: { id: string; path: string }) => void
  toFileUrl: (path: string) => string
  containerHeight: number
  itemHeight?: number
  className?: string
}

export default function VirtualizedImageList({
  items,
  onPreview,
  onRemove,
  onToggleSelect,
  toFileUrl,
  containerHeight,
  itemHeight = 120,
  className = ''
}: VirtualizedImageListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index]
          if (!item) return null

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={`group rounded-xl border p-3 transition-all ${
                item.selected ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
              } bg-white/70 dark:bg-slate-800/50 border-slate-300/60 hover:border-slate-400/60 dark:border-white/10 dark:hover:border-white/20`}
            >
              <div className="flex items-center gap-3 h-full">
                <div className="relative flex-shrink-0">
                  <img
                    src={toFileUrl(item.path)}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg bg-slate-200 dark:bg-slate-700"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => onPreview(item)}
                      className="p-2 bg-purple-600/90 hover:bg-purple-500 rounded-full text-white transform scale-0 group-hover:scale-100 transition-transform"
                    >
                      <FaEye className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate mb-1">
                    {item.path.split(/[/\\]/).pop() || item.path}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {item.path}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => onToggleSelect(item)}
                      className="w-4 h-4 text-purple-600 bg-white border-slate-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Выбрать</span>
                  </label>

                  <button
                    onClick={() => onRemove(item)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Удалить файл"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}