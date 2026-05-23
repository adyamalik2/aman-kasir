import type { BaseSyncFields } from './sync'

export interface Category extends BaseSyncFields {
  name: string
  description?: string
  isActive: boolean
}
