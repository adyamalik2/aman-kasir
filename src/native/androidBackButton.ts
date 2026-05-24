import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export function registerAndroidBackButton(): void {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  void CapacitorApp.addListener('backButton', () => {
    const closeTarget = document.querySelector<HTMLElement>('[data-android-back-close="true"]')
    if (closeTarget) {
      closeTarget.click()
      return
    }

    const path = window.location.pathname
    if (path !== '/' && path !== '/beranda') {
      window.history.back()
      return
    }

    if (window.confirm('Keluar dari AMAN Kasir?')) {
      void CapacitorApp.exitApp()
    }
  })
}
