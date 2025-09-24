import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import RootApp from './RootApp'
import './i18n'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <HashRouter>
      <RootApp />
      <Toaster 
        position="top-right" 
        richColors 
        theme="dark"
        closeButton
        expand={true}
        visibleToasts={5}
      />
    </HashRouter>
  </React.StrictMode>
)