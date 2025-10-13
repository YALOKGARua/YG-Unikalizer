import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createRoot } from 'react-dom/client'
import './styles.css'
import RootApp from '../private/src/subscription/RootApp'
import './i18n'
import { HashRouter } from 'react-router-dom'
import { Toaster, toast } from 'sonner'

const container = document.getElementById('root') as HTMLElement
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e: any) => {
    try { console.error(e?.error || e?.message || e) } catch {}
    try { toast.error('Ошибка рендерера') } catch {}
  })
  window.addEventListener('unhandledrejection', (e: any) => {
    try { console.error(e?.reason || e) } catch {}
    try { toast.error('Необработанное исключение') } catch {}
  })
}
const root = createRoot(container)
function ThemedToaster() {
  const [theme, setTheme] = React.useState<'dark'|'light'>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  React.useEffect(() => {
    const update = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    update()
    return () => { mo.disconnect() }
  }, [])
  return (
    <Toaster 
      position="top-right" 
      richColors 
      theme={theme}
      closeButton
      expand={true}
      visibleToasts={5}
    />
  )
}

function AppErrorFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  const [detailsVisible, setDetailsVisible] = React.useState(false)
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black/70 text-white">
      <div className="max-w-lg w-full p-6 rounded-xl bg-zinc-900 shadow-xl space-y-4">
        <div className="text-xl font-semibold">ОПА ПИЗДЕЦ ошибка YALOKGAR БУДЕТ В АХУЕ</div>
        <div className="text-sm text-zinc-300">Приложение продолжит работу. Вы можете перезапустить экран или продолжить.</div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20" onClick={resetErrorBoundary}>Продолжить</button>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20" onClick={() => window.location.reload()}>Перезапустить</button>
          <button className="ml-auto px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs" onClick={() => setDetailsVisible(v => !v)}>{detailsVisible ? 'Скрыть детали' : 'Показать детали'}</button>
        </div>
        {detailsVisible && (
          <pre className="max-h-48 overflow-auto text-xs whitespace-pre-wrap break-words bg-black/30 p-3 rounded-lg">{String((error as any)?.stack || (error as any)?.message || error)}</pre>
        )}
      </div>
    </div>
  )
}

root.render(
  <React.StrictMode>
    <HashRouter>
      <ErrorBoundary FallbackComponent={AppErrorFallback}>
        <RootApp />
      </ErrorBoundary>
      <ThemedToaster />
    </HashRouter>
  </React.StrictMode>
)