import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { reloadForNewVersion } from './staleChunk'

// Vite reports a page file that is gone after a new deploy; load the new version instead of failing
window.addEventListener('vite:preloadError', (event) => { if (reloadForNewVersion()) event.preventDefault() })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
