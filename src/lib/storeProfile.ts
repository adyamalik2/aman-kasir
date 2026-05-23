/** Profil toko yang disimpan di localStorage key "store_profile" */

export interface StoreProfile {
  namaToko: string
  slogan: string
  alamat: string
  nomorTelepon: string
  namaPemilik: string
}

export const STORE_PROFILE_KEY = 'store_profile'

export const DEFAULT_STORE_PROFILE: StoreProfile = {
  namaToko: 'Toko Saya',
  slogan: '',
  alamat: '',
  nomorTelepon: '',
  namaPemilik: '',
}

export function getStoreProfile(): StoreProfile {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_STORE_PROFILE }
  try {
    const raw = localStorage.getItem(STORE_PROFILE_KEY)
    if (!raw) return { ...DEFAULT_STORE_PROFILE }
    const parsed = JSON.parse(raw) as Partial<StoreProfile>
    return {
      namaToko: parsed.namaToko?.trim() || DEFAULT_STORE_PROFILE.namaToko,
      slogan: parsed.slogan ?? '',
      alamat: parsed.alamat ?? '',
      nomorTelepon: parsed.nomorTelepon ?? '',
      namaPemilik: parsed.namaPemilik ?? '',
    }
  } catch {
    return { ...DEFAULT_STORE_PROFILE }
  }
}

export function setStoreProfile(profile: StoreProfile): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORE_PROFILE_KEY, JSON.stringify(profile))
}

/** Baca hanya nama toko — berguna untuk inisialisasi store. */
export function getStoreName(): string {
  return getStoreProfile().namaToko
}
