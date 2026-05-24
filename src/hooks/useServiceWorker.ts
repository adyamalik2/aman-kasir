import { useState, useEffect, useCallback } from 'react'
import { onSwRegistered } from '@/pwa/registerServiceWorker'

/**
 * Mendeteksi apakah ada versi baru Service Worker yang menunggu diaktifkan.
 * Saat `applyUpdate()` dipanggil, SW baru langsung diaktifkan dan halaman di-reload.
 */
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    onSwRegistered((reg) => {
      // Cek apakah sudah ada SW yang menunggu (misal halaman di-refresh ulang)
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingSW(reg.waiting)
        setUpdateAvailable(true)
      }

      // Dengarkan SW baru yang sedang install
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return

        newSW.addEventListener('statechange', () => {
          // SW baru sudah selesai install dan menunggu diaktifkan
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingSW(newSW)
            setUpdateAvailable(true)
          }
        })
      })
    })
  }, [])

  const applyUpdate = useCallback(() => {
    if (!waitingSW) return

    // Dengarkan perpindahan kontrol → reload halaman
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => { window.location.reload() },
      { once: true },
    )

    // Kirim perintah ke SW baru agar segera aktif
    waitingSW.postMessage({ type: 'SKIP_WAITING' })
  }, [waitingSW])

  return { updateAvailable, applyUpdate }
}
