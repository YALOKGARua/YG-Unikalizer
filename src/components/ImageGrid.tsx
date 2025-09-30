import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Tilt from 'react-parallax-tilt'
import { FaEye, FaTrash, FaGripVertical, FaCloudUploadAlt } from 'react-icons/fa'

interface ImageItem {
  id: string
  path: string
  selected?: boolean
}

interface ImageGridProps {
  items: ImageItem[]
  onItemsChange?: (items: ImageItem[]) => void
  onPreview?: (item: ImageItem) => void
  onRemove?: (item: ImageItem) => void
  onSelectionChange?: (selected: ImageItem[]) => void
  onFilesAdded?: (paths: string[]) => void
  sortable?: boolean
}

const SortableImageCard = ({ 
  item, 
  onPreview, 
  onRemove, 
  onToggleSelect 
}: {
  item: ImageItem
  onPreview?: () => void
  onRemove?: () => void
  onToggleSelect?: () => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -5 }}
      className={`
        relative group rounded-xl overflow-hidden
        bg-gradient-to-br from-slate-800 to-slate-900
        border-2 transition-all duration-300 cursor-pointer
        ${item.selected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 hover:border-white/30'}
      `}
      onClick={onToggleSelect}
    >
      <div className="absolute top-2 left-2 z-10" {...attributes} {...listeners}>
        <FaGripVertical className="w-4 h-4 text-white/50 hover:text-white cursor-grab" />
      </div>

      <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
        <img 
          src={typeof (window as any)?.api?.fileStats === 'function' ? `file://${item.path.startsWith('/')?item.path:('/'+item.path.replace(/\\/g,'/'))}` : `file://${item.path}`}
          alt="" 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onPreview?.()
            }}
            className="flex-1 py-2 bg-blue-600/80 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-2 backdrop-blur-sm"
          >
            <FaEye className="w-4 h-4" />
            <span className="text-sm">Просмотр</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.()
            }}
            className="p-2 bg-red-600/80 hover:bg-red-500 rounded-lg backdrop-blur-sm"
          >
            <FaTrash className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {item.selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
        >
          <div className="w-3 h-3 bg-white rounded-full" />
        </motion.div>
      )}
    </motion.div>
  )
}

const ImageGrid = ({
  items,
  onItemsChange,
  onPreview,
  onRemove,
  onSelectionChange,
  onFilesAdded,
  sortable = true
}: ImageGridProps) => {
  const [localItems, setLocalItems] = useState(items)

  if (localItems !== items) {
    if (Array.isArray(items) && items.length !== localItems.length) {
      setLocalItems(items)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setLocalItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        onItemsChange?.(newItems)
        return newItems
      })
    }
  }

  const toggleSelect = useCallback((id: string) => {
    setLocalItems(prev => {
      const newItems = prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
      const selected = newItems.filter(item => item.selected)
      onSelectionChange?.(selected)
      return newItems
    })
  }, [onSelectionChange])

  const openFileDialog = async () => {
    try {
      const paths = await (window as any).api?.selectImages?.()
      if (paths && paths.length > 0 && onFilesAdded) {
        onFilesAdded(paths)
      }
    } catch (error) {
      console.error('Error selecting images:', error)
    }
  }

  if (sortable) {
    return (
      <div className="relative">
        {localItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative min-h-[400px] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50 transition-all duration-300 flex items-center justify-center"
          >
            <div className="text-center p-8">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block mb-6"
              >
                <FaCloudUploadAlt className="w-20 h-20 text-slate-500" />
              </motion.div>
              
              <h3 className="text-2xl font-bold text-slate-200 mb-3">
                Выберите фото
              </h3>
              
              <p className="text-slate-400 mb-6">
                Нажмите на кнопку для выбора файлов
              </p>
              
              <div className="flex gap-2 justify-center flex-wrap mb-4">
                {['.jpg', '.png', '.webp'].map(ext => (
                  <span key={ext} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">
                    {ext}
                  </span>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openFileDialog}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-medium hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                Выбрать файлы
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                <AnimatePresence>
                  {localItems.map((item) => (
                    <SortableImageCard
                      key={item.id}
                      item={item}
                      onPreview={() => onPreview?.(item)}
                      onRemove={() => onRemove?.(item)}
                      onToggleSelect={() => toggleSelect(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {localItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative min-h-[400px] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50 transition-all duration-300 flex items-center justify-center"
        >
          <div className="text-center p-8">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-6"
            >
              <FaCloudUploadAlt className="w-20 h-20 text-slate-500" />
            </motion.div>
            
            <h3 className="text-2xl font-bold text-slate-200 mb-3">
              Выберите фото
            </h3>
            
            <p className="text-slate-400 mb-6">
              Нажмите на кнопку для выбора файлов
            </p>
            
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              {['.jpg', '.png', '.webp'].map(ext => (
                <span key={ext} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">
                  {ext}
                </span>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openFileDialog}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-medium hover:from-blue-500 hover:to-indigo-500 transition-all"
            >
              Выбрать файлы
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          <AnimatePresence>
            {localItems.map((item, index) => (
              <Tilt
                key={item.id}
                tiltMaxAngleX={5}
                tiltMaxAngleY={5}
                perspective={1000}
                scale={1.02}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    relative group rounded-xl overflow-hidden
                    bg-gradient-to-br from-slate-800 to-slate-900
                    border-2 transition-all duration-300 cursor-pointer
                    ${item.selected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-white/10 hover:border-white/30'}
                  `}
                  onClick={() => toggleSelect(item.id)}
                >
                  <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img 
                      src={`file://${item.path}`} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onPreview?.(item)
                        }}
                        className="flex-1 py-2 bg-blue-600/80 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-2 backdrop-blur-sm"
                      >
                        <FaEye className="w-4 h-4" />
                        <span className="text-sm">Просмотр</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemove?.(item)
                        }}
                        className="p-2 bg-red-600/80 hover:bg-red-500 rounded-lg backdrop-blur-sm"
                      >
                        <FaTrash className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {item.selected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                    >
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </motion.div>
                  )}
                </motion.div>
              </Tilt>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default ImageGrid
