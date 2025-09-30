import { memo } from 'react'
import { useTranslation } from 'react-i18next'

interface PerformanceSettingsProps {
  settings: {
    backgroundAnimations: boolean
    reduceAnimations: boolean
    confettiEnabled: boolean
    lazyLoadImages: boolean
    virtualScrolling: boolean
  }
  onChange: (settings: Partial<PerformanceSettingsProps['settings']>) => void
}

const PerformanceSettings = memo(({ settings, onChange }: PerformanceSettingsProps) => {
  const { t } = useTranslation()

  const toggleSetting = (key: keyof typeof settings) => {
    onChange({ [key]: !settings[key] })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        {t('settings.performance')}
      </h3>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.backgroundAnimations}
            onChange={() => toggleSetting('backgroundAnimations')}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {t('settings.backgroundAnim')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.reduceAnimations}
            onChange={() => toggleSetting('reduceAnimations')}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {t('settings.reduceAnim')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.confettiEnabled}
            onChange={() => toggleSetting('confettiEnabled')}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {t('settings.confetti')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.lazyLoadImages}
            onChange={() => toggleSetting('lazyLoadImages')}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {t('settings.lazyLoad')}
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.virtualScrolling}
            onChange={() => toggleSetting('virtualScrolling')}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {t('settings.virtualScroll')}
          </span>
        </label>
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 Включите оптимизации для лучшей производительности при работе с большим количеством файлов
        </p>
      </div>
    </div>
  )
})

PerformanceSettings.displayName = 'PerformanceSettings'

export default PerformanceSettings
