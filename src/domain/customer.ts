import type { BaseSyncFields } from './sync'

export interface Customer extends BaseSyncFields {
  nama: string
  telepon: string
  alamat: string
  catatan: string
}
