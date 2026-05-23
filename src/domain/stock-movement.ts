export type StockMovementType = 'initial' | 'sale' | 'purchase' | 'adjustment' | 'void'

export interface StockMovement {
  id: string
  productId: string
  type: StockMovementType
  qtyChange: number
  qtyBefore: number
  qtyAfter: number
  referenceId?: string
  notes?: string
  createdAt: string
}
