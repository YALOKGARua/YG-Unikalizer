import React, { useState } from 'react'
import { motion } from 'framer-motion'
import MarkdownRenderer from './MarkdownRenderer'
import LoadingSpinner from './LoadingSpinner'
import { FaBook, FaCode, FaEye, FaFile } from 'react-icons/fa'

const demoMarkdown = `# 📸 PhotoUnikalizer Demo

## 🚀 Новые возможности отображения

Теперь **PhotoUnikalizer** поддерживает:

### ✨ Улучшенное отображение Markdown
- 🎨 **Синтаксическая подсветка** кода
- 📊 **Безопасный рендеринг** диаграмм  
- 🏷️ **Стильные таблицы** и компоненты
- 🎯 **Анимированные состояния** загрузки

### 💻 Пример кода

\`\`\`typescript
// Новый компонент MarkdownRenderer
import MarkdownRenderer from './components/MarkdownRenderer'

function MyComponent() {
  return (
    <MarkdownRenderer 
      content={markdownContent}
      className="my-custom-styles"
    />
  )
}
\`\`\`

### 📊 Таблица возможностей

| Функция | До | После | Улучшение |
|---------|-------|--------|-----------|
| **Markdown** | ❌ Небезопасный HTML | ✅ Безопасный рендеринг | 🚀 100% |
| **Код** | ❌ Нет подсветки | ✅ Синтаксическая подсветка | 🎨 Отлично |
| **Диаграммы** | ❌ Не работают | ✅ Плейсхолдеры | 📊 Хорошо |
| **Анимации** | ❌ Статичные | ✅ Плавные переходы | ✨ Превосходно |

### 🎯 Новые компоненты

> **💡 Совет:** Используйте новые компоненты для лучшего UX

**Доступные компоненты:**
- \`LoadingSpinner\` - Анимированные индикаторы загрузки
- \`EnhancedStats\` - Улучшенная статистика с прогрессом
- \`MarkdownRenderer\` - Безопасный рендеринг Markdown
- \`NotificationCenter\` - Центр уведомлений
- \`VirtualizedImageList\` - Виртуализированные списки изображений

### ⚡ Производительность

Новые улучшения значительно повышают производительность:

1. **Виртуализация списков** - для работы с тысячами файлов
2. **Ленивая загрузка** - компоненты загружаются по требованию  
3. **Оптимизированные анимации** - используют GPU ускорение
4. **Умное кеширование** - снижает нагрузку на память

---

*Создано с ❤️ для лучшего UX в PhotoUnikalizer 3.0.0*`

export default function ImprovedReadmeDemo() {
  const [activeTab, setActiveTab] = useState<'demo' | 'raw'>('demo')
  const [isLoading, setIsLoading] = useState(false)

  const handleTabChange = (tab: 'demo' | 'raw') => {
    setIsLoading(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsLoading(false)
    }, 300)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900/80 backdrop-blur rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <FaBook className="w-5 h-5 text-white" />
          </div>
          Демо улучшенного отображения
        </h2>
        
        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => handleTabChange('demo')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'demo'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaEye className="w-4 h-4" />
            Демо
          </button>
          <button
            onClick={() => handleTabChange('raw')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'raw'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaCode className="w-4 h-4" />
            Исходный текст
          </button>
        </div>
      </div>

      <div className="relative">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <LoadingSpinner size="lg" text="Переключение режима..." />
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'demo' ? (
              <div className="bg-slate-800/30 rounded-lg p-4 border border-white/10">
                <MarkdownRenderer content={demoMarkdown} />
              </div>
            ) : (
              <div className="bg-slate-950/60 rounded-lg p-4 border border-white/10">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap overflow-auto max-h-96">
                  {demoMarkdown}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <FaFile className="w-3 h-3" />
          Использует новые компоненты: MarkdownRenderer, LoadingSpinner
        </div>
        <div>
          {activeTab === 'demo' ? 'Режим отображения' : 'Исходный Markdown'}
        </div>
      </div>
    </div>
  )
}
