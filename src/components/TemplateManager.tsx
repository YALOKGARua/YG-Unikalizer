import React, { useMemo, useState } from 'react'
import { Icon } from './Icons'
import { FaTimes, FaSave, FaTrash, FaCheck, FaFileImport, FaFileExport } from 'react-icons/fa'
import { toast } from 'sonner'

type ProfileKind = 'camera'|'phone'|'action'|'drone'|'scanner'|'webcam'|'film'|'security'|'gaming'|'automotive'|'medical'|'astro'|'satellite'|'cinema'|'microscope'|'surveillance'|'broadcast'

interface CustomTemplate {
  id: string
  name: string
  description?: string
  icon?: string
  general?: {
    fakeAuto?: boolean
    fakePerFile?: boolean
    onlineAuto?: boolean
  }
  location?: {
    enabled?: boolean
    lat?: string
    lon?: string
    altitude?: string
    city?: string
    state?: string
    country?: string
  }
  metadata?: {
    author?: string
    description?: string
    keywords?: string
    copyright?: string
    creatorTool?: string
    title?: string
    label?: string
    rating?: number | ''
    colorSpace?: string
  }
  camera?: {
    profile?: ProfileKind
    make?: string
    model?: string
    lens?: string
    software?: string
    serial?: string
    iso?: number | ''
    exposureTime?: string
    fNumber?: number | ''
    focalLength?: number | ''
    exposureProgram?: number | ''
    meteringMode?: number | ''
    flash?: number | ''
    whiteBalance?: number | ''
  }
}

interface TemplateManagerProps {
  isOpen: boolean
  onClose: () => void
  templates: CustomTemplate[]
  onSave: (template: CustomTemplate) => void
  onDelete: (id: string) => void
  onApply: (template: CustomTemplate) => void
  currentSettings?: Partial<CustomTemplate>
}

const ICON_OPTIONS = [
  '🎯', '🔧', '🌿', '💡', '📷', '🎨', '⭐', '🔥', '💎', '☀️', '🎁', '🎓',
  '🎸', '🎺', '🎻', '🎹', '🏙️', '🏰', '🌆', '🌃', '🌄', '🌅'
]

export default function TemplateManager({
  isOpen,
  onClose,
  templates,
  onSave,
  onDelete,
  onApply,
  currentSettings
}: TemplateManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newTemplate, setNewTemplate] = useState<Partial<CustomTemplate>>({
    name: '',
    description: '',
    icon: '🎯'
  })
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'new' | 'old' | 'az' | 'za'>('new')

  if (!isOpen) return null

  const handleCreateNew = () => {
    setIsCreating(true)
    setNewTemplate({
      name: '',
      description: '',
      icon: '🎯',
      ...currentSettings
    })
  }

  const handleSaveTemplate = () => {
    if (!newTemplate.name?.trim()) {
      toast.error('Введите название шаблона')
      return
    }

    const template: CustomTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name.trim(),
      description: newTemplate.description,
      icon: newTemplate.icon || '⭐',
      general: newTemplate.general,
      location: newTemplate.location,
      metadata: newTemplate.metadata,
      camera: newTemplate.camera
    }

    onSave(template)
    setIsCreating(false)
    setNewTemplate({ name: '', description: '', icon: '🎯' })
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(templates, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `templates-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Шаблоны экспортированы')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string)
          if (Array.isArray(imported)) {
            imported.forEach(t => onSave(t))
            toast.success(`Импортировано шаблонов: ${imported.length}`)
          }
        } catch (err) {
          toast.error('Ошибка импорта')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = templates
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description ? t.description.toLowerCase().includes(q) : false)
      )
    }
    switch (sortBy) {
      case 'az':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        break
      case 'za':
        list = [...list].sort((a, b) => b.name.localeCompare(a.name, 'ru'))
        break
      case 'old':
        list = [...list].sort((a, b) => Number(a.id) - Number(b.id))
        break
      case 'new':
      default:
        list = [...list].sort((a, b) => Number(b.id) - Number(a.id))
        break
    }
    return list
  }, [templates, query, sortBy])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-pink-500/30 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 flex items-center justify-between bg-gradient-to-r from-pink-600 to-purple-600 text-white">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Icon name="tabler:bookmarks" className="w-7 h-7" />
              Мои шаблоны метаданных
            </h2>
            <p className="text-pink-100 text-sm mt-1">Сохраняйте и применяйте настройки одним кликом</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <FaTimes className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="flex-1 flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по названию или описанию..."
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-purple-500/30 bg-white text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500"
                />
                <Icon name="tabler:search" className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 rounded-xl border border-purple-500/30 bg-white text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 dark:bg-slate-800/50 dark:text-white"
                title="Сортировка"
              >
                <option value="new">Сначала новые</option>
                <option value="old">Сначала старые</option>
                <option value="az">По названию A→Z</option>
                <option value="za">По названию Z→A</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={handleCreateNew}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-medium hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Icon name="tabler:plus" className="w-5 h-5" />
              Создать новый шаблон
            </button>
            <button
              onClick={handleImport}
              className="px-6 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2"
            >
              <FaFileImport className="w-4 h-4" />
              Импорт
            </button>
            {templates.length > 0 && (
              <button
                onClick={handleExport}
                className="px-6 py-4 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition-all shadow-lg flex items-center gap-2"
              >
                <FaFileExport className="w-4 h-4" />
                Экспорт
              </button>
            )}
          </div>

          {isCreating && (
            <div className="rounded-xl p-6 mb-6 border border-purple-500/30 bg-purple-50 dark:bg-gradient-to-br dark:from-purple-900/30 dark:to-pink-900/30">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2">
                <FaSave className="w-5 h-5" />
                Сохранить текущие настройки как шаблон
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-700 dark:text-purple-200 mb-2">
                    Название шаблона *
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name || ''}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="Например: Моя профессиональная съемка"
                    className="w-full px-4 py-3 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-purple-500/30 bg-white text-slate-900 placeholder-slate-400 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-700 dark:text-purple-200 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={newTemplate.description || ''}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="Краткое описание шаблона..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none border border-purple-500/30 bg-white text-slate-900 placeholder-slate-400 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-700 dark:text-purple-200 mb-2">
                    Иконка
                  </label>
                  <div className="grid grid-cols-12 gap-2">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setNewTemplate({ ...newTemplate, icon })}
                        className={`p-3 rounded-lg text-2xl transition-all ${
                          newTemplate.icon === icon
                            ? 'bg-purple-600 ring-2 ring-purple-400 scale-110'
                            : 'bg-purple-100 hover:bg-purple-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveTemplate}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <FaSave className="w-4 h-4" />
                    Сохранить шаблон
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-6 py-3 rounded-lg font-medium transition-all bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Пока нет сохраненных шаблонов</h3>
              <p className="text-slate-500">Создайте свой первый шаблон или импортируйте готовый</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-2xl p-5 transition-all group border hover:border-purple-500/50 hover:shadow-xl bg-slate-100/80 border-slate-300/60 dark:bg-gradient-to-br dark:from-slate-800/50 dark:to-slate-700/50 dark:border-slate-600/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl flex-shrink-0">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 truncate">
                        {template.name}
                      </h4>
                      {template.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {template.camera?.make && (
                          <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-md flex items-center gap-1">
                            <Icon name="tabler:camera" className="w-3 h-3" />
                            {template.camera.make} {template.camera.model}
                          </span>
                        )}
                        {template.location?.enabled && (
                          <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded-md flex items-center gap-1">
                            <Icon name="tabler:map-pin" className="w-3 h-3" />
                            {template.location.city || 'Геолокация'}
                          </span>
                        )}
                        {template.metadata?.author && (
                          <span className="px-2 py-1 bg-orange-900/50 text-orange-300 rounded-md flex items-center gap-1">
                            <Icon name="tabler:user" className="w-3 h-3" />
                            {template.metadata.author}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deletingId === template.id ? (
                        <>
                          <button
                            onClick={() => {
                              onDelete(template.id)
                              setDeletingId(null)
                            }}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            Удалить
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-2 rounded-lg transition-colors text-sm font-medium bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-600 dark:text-white dark:hover:bg-slate-700"
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onApply(template)}
                            className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            title="Применить"
                          >
                            <FaCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(template.id)}
                            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
