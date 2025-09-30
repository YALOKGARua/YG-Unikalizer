import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import OptimizedImage from './OptimizedImage'
import { FaEye, FaTrash, FaCheckCircle } from 'react-icons/fa'

interface ImageItem {
  id: string
  path: string
  selected?: boolean
}

interface OptimizedImageGridProps {
  items: ImageItem[]
  onPreview?: (item: ImageItem) => void
  onRemove?: (item: ImageItem) => void
  onToggle?: (item: ImageItem) => void
  toFileUrl: (path: string) => string
  columns?: number
  gap?: number
  itemSize?: number
  containerHeight?: number
  showActions?: boolean
  selectable?: boolean
}

const ImageGridItem = memo(({ 
  item, 
  toFileUrl, 
  onPreview, 
  onRemove, 
  onToggle,
  showActions = true,
  selectable = true
}: {
  item: ImageItem
  toFileUrl: (path: string) => string
  onPreview?: (item: ImageItem) => void
  onRemove?: (item: ImageItem) => void
  onToggle?: (item: ImageItem) => void
  showActions?: boolean
  selectable?: boolean
}) => {
  const [hover, setHover] = useState(false)

  return (
    <div
      className={`group relative bg-slate-800/50 rounded-xl overflow-hidden border transition-all duration-200 ${
        item.selected 
          ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20' 
          : 'border-white/10 hover:border-white/30'
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => selectable && onToggle?.(item)}
    >
      <div className="aspect-square relative">
        <OptimizedImage
          src={toFileUrl(item.path)}
          alt={item.path}
          className="w-full h-full"
          loading="lazy"
        />
        
        {selectable && item.selected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white p-1.5 rounded-full shadow-lg">
            <FaCheckCircle className="w-4 h-4" />
          </div>
        )}

        {showActions && hover && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onPreview && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPreview(item)
                }}
                className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white shadow-lg transform hover:scale-110 transition-all"
                title="Предпросмотр"
              >
                <FaEye className="w-4 h-4" />
              </button>
            )}
            
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(item)
                }}
                className="p-3 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg transform hover:scale-110 transition-all"
                title="Удалить"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-2 bg-slate-900/80 backdrop-blur-sm">
        <div className="text-xs text-white truncate font-medium">
          {item.path.split(/[/\\]/).pop()}
        </div>
        <div className="text-[10px] text-slate-400 truncate">
          {item.path}
        </div>
      </div>
    </div>
  )
}, (prev, next) => {
  return prev.item.id === next.item.id &&
         prev.item.selected === next.item.selected &&
         prev.item.path === next.item.path
})

ImageGridItem.displayName = 'ImageGridItem'

const OptimizedImageGrid = memo(({
  items,
  onPreview,
  onRemove,
  onToggle,
  toFileUrl,
  columns = 4,
  gap = 16,
  itemSize = 200,
  containerHeight = 600,
  showActions = true,
  selectable = true
}: OptimizedImageGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!parentRef.current) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      setContainerWidth(width)
    })

    observer.observe(parentRef.current)
    return () => observer.disconnect()
  }, [])

  const actualColumns = useMemo(() => {
    if (containerWidth === 0) return columns
    return Math.floor((containerWidth + gap) / (itemSize + gap)) || 1
  }, [containerWidth, columns, gap, itemSize])

  const rowCount = useMemo(() => Math.ceil(items.length / actualColumns), [items.length, actualColumns])

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemSize + gap,
    overscan: 2,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  const getItemsForRow = useCallback((rowIndex: number): ImageItem[] => {
    const start = rowIndex * actualColumns
    const end = start + actualColumns
    return items.slice(start, end)
  }, [items, actualColumns])

  if (items.length === 0) {
    return (
      <div 
        ref={parentRef}
        className="flex items-center justify-center text-slate-400 h-full"
        style={{ height: containerHeight }}
      >
        <div className="text-center">
          <p className="text-lg mb-2">Нет изображений</p>
          <p className="text-sm opacity-60">Добавьте файлы для начала</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const rowItems = getItemsForRow(virtualRow.index)

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${actualColumns}, 1fr)`,
                  gap: `${gap}px`,
                  padding: `${gap / 2}px`,
                }}
              >
                {rowItems.map((item) => (
                  <ImageGridItem
                    key={item.id}
                    item={item}
                    toFileUrl={toFileUrl}
                    onPreview={onPreview}
                    onRemove={onRemove}
                    onToggle={onToggle}
                    showActions={showActions}
                    selectable={selectable}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

OptimizedImageGrid.displayName = 'OptimizedImageGrid'

export default OptimizedImageGrid
