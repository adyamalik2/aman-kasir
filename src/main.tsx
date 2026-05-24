import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
import { registerAndroidBackButton } from './native/androidBackButton'
import { applyPlatformClasses } from './native/platform'
import { registerServiceWorker } from './pwa/registerServiceWorker'

/**
 * Entry point AMAN Kasir
 * StrictMode aktif untuk mendeteksi potensi masalah lebih awal di development
 */
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    '[AMAN Kasir] Elemen #root tidak ditemukan di index.html. ' +
      'Pastikan <div id="root"></div> ada di body.',
  )
}

applyPlatformClasses()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
registerAndroidBackButton()
