import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
