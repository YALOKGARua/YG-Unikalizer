import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import Lottie from 'lottie-react'
import { FaCloudUploadAlt, FaImages, FaCheckCircle } from 'react-icons/fa'

interface FileDropzoneProps {
  onFilesAdded: (files: string[]) => void
  accept?: Record<string, string[]>
  maxFiles?: number
  disabled?: boolean
}

const FileDropzone = ({ 
  onFilesAdded, 
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif', '.heic']
  },
  maxFiles = 100,
  disabled = false
}: FileDropzoneProps) => {
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const paths = acceptedFiles.map((file: any) => file.path).filter(Boolean)
    
    if (paths.length > 0) {
      onFilesAdded(paths)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 2000)
    }
  }, [onFilesAdded])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled
  })

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-2xl p-8
        transition-all duration-300 cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' : 'border-white/20 hover:border-white/40'}
        ${isDragReject ? 'border-red-500 bg-red-500/10' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      <AnimatePresence mode="wait">
        {uploadSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              <FaCheckCircle className="w-16 h-16 text-green-500 mb-4" />
            </motion.div>
            <p className="text-green-400 font-semibold">Файлы добавлены!</p>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center"
          >
            <motion.div
              animate={isDragActive ? { 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{ duration: 0.5, repeat: isDragActive ? Infinity : 0 }}
              className="mb-4"
            >
              <FaCloudUploadAlt className={`
                w-16 h-16 transition-colors duration-300
                ${isDragActive ? 'text-blue-400' : 'text-white/40'}
                ${isDragReject ? 'text-red-400' : ''}
              `} />
            </motion.div>

            <h3 className="text-lg font-semibold mb-2 text-white/80">
              {isDragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда'}
            </h3>
            
            <p className="text-sm text-white/50 mb-4">
              или нажмите для выбора файлов
            </p>

            <div className="flex gap-2">
              {['.jpg', '.png', '.webp'].map((ext, i) => (
                <motion.span
                  key={ext}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-2 py-1 bg-white/10 rounded text-xs text-white/60"
                >
                  {ext}
                </motion.span>
              ))}
            </div>

            {isDragActive && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl" />
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-blue-400 rounded-full"
                    style={{
                      left: `${20 + i * 15}%`,
                      top: '50%'
                    }}
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.2,
                      repeat: Infinity
                    }}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileDropzone
