import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import './i18n'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)