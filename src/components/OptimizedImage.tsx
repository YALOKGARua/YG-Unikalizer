import { memo, useState, useEffect, useRef } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

const OptimizedImage = memo(({ 
  src, 
  alt, 
  className = '', 
  width, 
  height,
  loading = 'lazy',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E',
  onLoad,
  onError
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (loading !== 'lazy' || !imgRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            const img = imgRef.current
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
            }
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    )

    observerRef.current.observe(imgRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading])

  const handleLoad = () => {
    setLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setError(true)
    onError?.()
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <img
        ref={imgRef}
        data-src={loading === 'lazy' ? src : undefined}
        src={loading === 'lazy' ? placeholder : src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading={loading}
        decoding="async"
      />
      
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
      )}
      
      {error && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-gray-500 text-sm">
          Failed to load
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.src === nextProps.src && 
         prevProps.className === nextProps.className
})

OptimizedImage.displayName = 'OptimizedImage'

export default OptimizedImage
