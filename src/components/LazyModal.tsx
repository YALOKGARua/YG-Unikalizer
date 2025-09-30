import { lazy, Suspense, memo } from 'react'
import LoadingSpinner from './LoadingSpinner'

const LazyModal = memo(({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'max-w-2xl',
  closeOnOverlay = true
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  maxWidth?: string
  closeOnOverlay?: boolean
}) => {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      <div className={`relative bg-slate-900 rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-auto border border-white/10`}>
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <Suspense 
          fallback={
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="lg" text="Загрузка..." />
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  )
})

LazyModal.displayName = 'LazyModal'

export default LazyModal

export const createLazyComponent = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) => {
  return lazy(factory)
}

export const LazyAdminPanel = createLazyComponent(() => import('./AdminPanel'))
export const LazyChangelogModal = createLazyComponent(() => import('./ChangelogModal'))
export const LazySlotsGame = createLazyComponent(() => import('./SlotsGame'))
export const LazyCrashGame = createLazyComponent(() => import('./CrashGame'))
export const LazyChat = createLazyComponent(() => import('./Chat'))
