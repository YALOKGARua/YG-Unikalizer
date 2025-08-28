import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import './i18n'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)