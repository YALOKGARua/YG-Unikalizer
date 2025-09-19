import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import RootApp from './RootApp'
import './i18n'
import { HashRouter } from 'react-router-dom'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <HashRouter>
      <RootApp />
    </HashRouter>
  </React.StrictMode>
)