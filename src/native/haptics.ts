/**
 * Wrapper haptic feedback yang aman — no-op di browser, aktif di Android APK.
 * Pakai lazy import agar tidak error saat @capacitor/haptics tidak tersedia di web.
 */

import { isNativeApp } from './platform'

/** Getaran ringan — untuk konfirmasi aksi sukses */
export async function hapticSuccess(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {
    // Haptik tidak didukung perangkat — abaikan
  }
}

/** Getaran peringatan — untuk error atau konfirmasi hapus */
export async function hapticWarning(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch {
    // Haptik tidak didukung — abaikan
  }
}

/** Getaran ringan — untuk tap biasa */
export async function hapticLight(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Haptik tidak didukung — abaikan
  }
}
