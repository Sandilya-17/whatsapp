// Polyfill global for sockjs-client and browser environments
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui-refresh.css'
import './nova.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
