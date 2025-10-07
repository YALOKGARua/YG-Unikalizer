import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import RootApp from '../private/src/subscription/RootApp'
import './i18n'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

const container = document.getElementById('root') as HTMLElement
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

root.render(
  <React.StrictMode>
    <HashRouter>
      <RootApp />
      <ThemedToaster />
    </HashRouter>
  </React.StrictMode>
)