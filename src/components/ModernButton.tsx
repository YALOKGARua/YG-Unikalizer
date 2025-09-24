import { motion } from 'framer-motion'
import { forwardRef, ReactNode } from 'react'
import Tilt from 'react-parallax-tilt'

interface ModernButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  tilt?: boolean
}

const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  type = 'button',
  tilt = false
}, ref) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-500/25',
    secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-gray-500/25',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-500/25',
    success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/25',
    warning: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-amber-500/25',
    ghost: 'bg-transparent hover:bg-white/10 text-white border border-white/20 hover:border-white/40'
  }

  const buttonContent = (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        relative overflow-hidden font-medium rounded-lg
        transition-all duration-300 transform
        shadow-lg hover:shadow-xl
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        ${className}
      `}
      whileHover={!disabled ? { y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      <span className={`flex items-center justify-center gap-2 ${loading ? 'opacity-0' : ''}`}>
        {icon && <span>{icon}</span>}
        {children}
      </span>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <motion.div
        className="absolute inset-0 bg-white/20"
        initial={{ x: '-100%', skewX: '-12deg' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.5 }}
      />
    </motion.button>
  )

  if (tilt && !disabled) {
    return (
      <Tilt
        tiltMaxAngleX={10}
        tiltMaxAngleY={10}
        perspective={1000}
        transitionSpeed={1000}
        scale={1.02}
      >
        {buttonContent}
      </Tilt>
    )
  }

  return buttonContent
})

ModernButton.displayName = 'ModernButton'

export default ModernButton
