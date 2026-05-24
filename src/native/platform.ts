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
  const rootClassList = document.documentElement.classList
  const bodyClassList = document.body.classList
  const native = isNativeApp()
  const android = isAndroidNative()

  rootClassList.toggle('is-native', native)
  rootClassList.toggle('is-android', android)
  bodyClassList.toggle('is-native', native)
  bodyClassList.toggle('is-android', android)
}
