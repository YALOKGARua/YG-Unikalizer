import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaGift, FaFileAlt, FaSpinner, FaTimes, FaCalendar, FaClock } from 'react-icons/fa'
import MarkdownRenderer from './MarkdownRenderer'
import LoadingSpinner from './LoadingSpinner'

interface ChangelogModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [activeTab, setActiveTab] = useState<'latest' | 'full'>('full')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadContent = async (type: 'latest' | 'full') => {
    setLoading(true)
    try {
      let result
      if (type === 'latest') {
        result = await window.api.getUpdateChangelog()
        setContent((result && (result as any).notes) || 'Нет данных о последних изменениях')
      } else {
        result = await window.api.getFullChangelog()
        setContent((result && (result as any).data) || 'Не удалось загрузить полный чендлог')
      }
      setLastUpdated(new Date())
    } catch (error) {
      setContent('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadContent(activeTab)
    }
  }, [isOpen, activeTab])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80" 
          onClick={onClose} 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-[960px] max-w-[95vw] max-h-[90vh] rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
                <FaGift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">История изменений</h2>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <FaCalendar className="w-3 h-3" />
                  YG Unikalizer - все обновления
                  {lastUpdated && (
                    <>
                      <span className="text-slate-600">•</span>
                      <FaClock className="w-3 h-3" />
                      {lastUpdated.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-2 bg-slate-800/30 border-b border-white/10">
            <button
              onClick={() => setActiveTab('latest')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'latest'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FaGift className="w-4 h-4" />
              Что нового
            </button>
            
            <button
              onClick={() => setActiveTab('full')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'full'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FaFileAlt className="w-4 h-4" />
              Полный чендлог
            </button>

            <div className="flex-1" />
            
            <button
              onClick={() => loadContent(activeTab)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <FaSpinner className="w-3 h-3 animate-spin" />
              ) : (
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  🔄
                </motion.div>
              )}
              Обновить
            </button>
          </div>

          {/* Content */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-96"
                >
                  <LoadingSpinner 
                    size="lg" 
                    text={`Загрузка ${activeTab === 'latest' ? 'последних изменений' : 'полного чендлога'}...`} 
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-h-[60vh] overflow-auto bg-slate-800/20 m-4 rounded-lg border border-white/10"
                >
                  <div className="p-6">
                    <MarkdownRenderer content={content} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-slate-800/20">
            <div className="text-xs text-slate-500">
              {activeTab === 'latest' 
                ? 'Показаны изменения в текущей версии' 
                : `Показана полная история изменений (${content.split('\n## ').length - 1} версий)`
              }
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Закрыть
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}