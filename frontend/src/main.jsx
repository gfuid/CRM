import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { reloadForNewVersion } from './staleChunk'
import { registerServiceWorker } from './pushClient'

// Vite reports a page file that is gone after a new deploy; load the new version instead of failing
window.addEventListener('vite:preloadError', (event) => { if (reloadForNewVersion()) event.preventDefault() })

// Notifications + "Install app" (the service worker caches nothing)
if (import.meta.env.PROD) window.addEventListener('load', () => { registerServiceWorker() })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
