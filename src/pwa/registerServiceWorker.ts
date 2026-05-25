type OnRegisteredCallback = (registration: ServiceWorkerRegistration) => void

let _registration: ServiceWorkerRegistration | null = null
const _callbacks: OnRegisteredCallback[] = []

/** Daftarkan callback yang dipanggil saat SW berhasil diregistrasi.
 *  Kalau registrasi sudah ada, callback dipanggil langsung. */
export function onSwRegistered(cb: OnRegisteredCallback): void {
  if (_registration) {
    cb(_registration)
    return
  }
  _callbacks.push(cb)
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        _registration = reg
        _callbacks.forEach((cb) => cb(reg))
        _callbacks.length = 0
      })
      .catch((error: unknown) => {
        console.warn('[AMAN Kasir] Service worker registration failed:', error)
      })
  })
}
