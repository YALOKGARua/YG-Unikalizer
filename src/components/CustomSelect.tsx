import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { FaChevronDown, FaCheck, FaLock } from 'react-icons/fa'

interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  lockedValues?: string[]
  onLockedClick?: (value: string) => void
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Выберите...",
  className = "",
  disabled = false,
  lockedValues = [],
  onLockedClick
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleScroll() {
      if (isOpen && selectRef.current) {
        const rect = selectRef.current.getBoundingClientRect()
        setButtonRect(rect)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string, isLocked: boolean) => {
    if (isLocked) {
      try { window.dispatchEvent(new CustomEvent('open-subscription')) } catch {}
      if (onLockedClick) try { onLockedClick(optionValue) } catch {}
      setIsOpen(false)
      return
    }
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleButtonClick = () => {
    if (!disabled) {
      const rect = selectRef.current?.getBoundingClientRect()
      setButtonRect(rect || null)
      setIsOpen(!isOpen)
    }
  }

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <motion.button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className={`
          w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 
          hover:border-white/20 transition-all duration-200 text-left
          flex items-center justify-between gap-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-blue-500/50 bg-slate-800/70' : ''}
        ${className}
        `}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="text-blue-400 flex-shrink-0">
              {selectedOption.icon}
            </span>
          )}
          <span className="text-white truncate" title={selectedOption?.label || placeholder}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/60 flex-shrink-0"
        >
          <FaChevronDown className="w-3 h-3" />
        </motion.div>
      </motion.button>

      {isOpen && buttonRect && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99998]" onClick={() => setIsOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed z-[99999]"
            style={{
              top: buttonRect.bottom + 4,
              left: buttonRect.left,
              minWidth: buttonRect.width,
              maxWidth: Math.min(420, window.innerWidth - buttonRect.left - 8)
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-800 border border-white/20 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="max-h-48 overflow-y-auto">
                {options.map((option, index) => {
                  const isLocked = lockedValues.includes(String(option.value))
                  const isSelected = value === option.value
                  return (
                  <motion.button
                    key={`${option.value}-${index}`}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(option.value, isLocked) }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className={`
                      w-full px-3 py-2 text-left flex items-start gap-3 min-h-[40px]
                      transition-colors duration-150
                      ${isSelected ? 'bg-blue-500/20 text-blue-300' : 'text-white'}
                      ${isLocked ? 'opacity-60 cursor-not-allowed hover:bg-transparent' : 'hover:bg-white/5'}
                    `}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ x: 4 }}
                  >
                    {option.icon && (
                      <span className="text-blue-400 flex-shrink-0">
                        {option.icon}
                      </span>
                    )}
                    <span className="flex-1 whitespace-normal break-words leading-snug">{option.label}</span>
                    {!isLocked && isSelected && (
                      <FaCheck className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    )}
                    {isLocked && (
                      <FaLock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    )}
                  </motion.button>
                )})}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}