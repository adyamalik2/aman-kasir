import { Capacitor } from '@capacitor/core'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export function isWeb(): boolean {
  return !Capacitor.isNativePlatform()
}

export function applyPlatformClasses(): void {
  const classList = document.documentElement.classList

  classList.toggle('is-native', isNativeApp())
  classList.toggle('is-android', isAndroidNative())
}
