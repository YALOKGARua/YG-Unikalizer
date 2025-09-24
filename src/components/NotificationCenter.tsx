import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FaBell, 
  FaCheck, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaTimes,
  FaTrash
} from 'react-icons/fa'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationCenterProps {
  className?: string
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.read
  )

  const unreadCount = notifications.filter(n => !n.read).length

  const getIcon = (type: Notification['type']) => {
    const iconProps = { className: "w-4 h-4" }
    switch (type) {
      case 'success': return <FaCheck {...iconProps} className="w-4 h-4 text-green-400" />
      case 'error': return <FaTimes {...iconProps} className="w-4 h-4 text-red-400" />
      case 'warning': return <FaExclamationTriangle {...iconProps} className="w-4 h-4 text-yellow-400" />
      case 'info': return <FaInfoCircle {...iconProps} className="w-4 h-4 text-blue-400" />
    }
  }

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'from-green-500/20 to-emerald-500/20 border-green-500/30'
      case 'error': return 'from-red-500/20 to-rose-500/20 border-red-500/30'
      case 'warning': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
      case 'info': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
    }
  }

  useEffect(() => {
    const demoNotifications = [
      {
        type: 'success' as const,
        title: 'Файлы обработаны',
        message: '15 изображений успешно уникализированы'
      },
      {
        type: 'info' as const,
        title: 'Новое обновление',
        message: 'Доступна версия 3.0.1 с улучшениями производительности'
      }
    ]

    setTimeout(() => {
      demoNotifications.forEach(notif => addNotification(notif))
    }, 2000)
  }, [])

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
        title="Уведомления"
      >
        <FaBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] bg-slate-800/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl z-50 max-h-[70vh] flex flex-col"
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Уведомления</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Прочитать все
                      </button>
                    )}
                    <button
                      onClick={clearAll}
                      className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                      title="Очистить все"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === 'all' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Все ({notifications.length})
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === 'unread' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Непрочитанные ({unreadCount})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <FaBell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {filter === 'unread' ? 'Нет непрочитанных уведомлений' : 'Нет уведомлений'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`group p-3 rounded-lg border cursor-pointer transition-all ${
                          notification.read 
                            ? 'bg-slate-700/30 border-slate-600/30' 
                            : `bg-gradient-to-r ${getTypeColor(notification.type)}`
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`font-medium text-sm ${
                                notification.read ? 'text-slate-300' : 'text-white'
                              }`}>
                                {notification.title}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeNotification(notification.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                              >
                                <FaTimes className="w-3 h-3" />
                              </button>
                            </div>
                            <p className={`text-xs mt-1 ${
                              notification.read ? 'text-slate-500' : 'text-slate-300'
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-500">
                                {notification.timestamp.toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {notification.action && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    notification.action!.onClick()
                                  }}
                                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                  {notification.action.label}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}