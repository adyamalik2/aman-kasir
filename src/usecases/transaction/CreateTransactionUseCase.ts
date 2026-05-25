import type { ITransactionRepository } from '@/repositories/interfaces/ITransactionRepository'
import type { Transaction, TransactionItem, PaymentMethod, StockMovement } from '@/domain'
import { db } from '@/infra/db/dexie'
import { generateId } from '@/lib/id-generator'

export interface CartItemInput {
  productId: string
  productName: string
  sku?: string
  qty: number
  price: number
  costPrice: number
}

export interface CreateTransactionInput {
  cartItems: CartItemInput[]
  subtotal: number
  discount: number
  total: number
  paidAmount: number
  paymentMethod: PaymentMethod
  notes?: string
  transactionDate?: string
  customerId?: string
}

export class CreateTransactionUseCase {
  constructor(private readonly repo: ITransactionRepository) {}

  async execute(input: CreateTransactionInput): Promise<Transaction> {
    const selectedDate = input.transactionDate ? new Date(input.transactionDate) : new Date()
    const now = Number.isNaN(selectedDate.getTime())
      ? new Date().toISOString()
      : selectedDate.toISOString()
    const transactionId = generateId('txn')

    const result = await db.transaction(
      'rw',
      [db.transactions, db.transactionItems, db.products, db.stockMovements],
      async (): Promise<Transaction> => {
        const invoiceNo = await this.generateInvoiceNo(now)

        const txn: Transaction = {
          id: transactionId,
          invoiceNo,
          date: now,
          customerId: input.customerId,
          subtotal: input.subtotal,
          discount: input.discount,
          tax: 0,
          total: input.total,
          paidAmount: input.paidAmount,
          changeAmount: Math.max(0, input.paidAmount - input.total),
          paymentMethod: input.paymentMethod,
          status: 'completed',
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'local_only',
          syncVersion: 1,
        }

        const items: TransactionItem[] = input.cartItems.map((ci) => ({
          id: generateId('item'),
          transactionId,
          productId: ci.productId,
          productName: ci.productName,
          sku: ci.sku,
          qty: ci.qty,
          price: ci.price,
          costPrice: ci.costPrice,
          discount: 0,
          subtotal: ci.price * ci.qty,
        }))

        // Save transaction and items via repository (joins parent Dexie transaction)
        await this.repo.create(txn, items)

        // Record stock movements and update product stock
        for (const ci of input.cartItems) {
          const product = await db.products.get(ci.productId)
          if (!product) continue

          const qtyBefore = product.stock
          const qtyAfter = Math.max(0, qtyBefore - ci.qty)

          const movement: StockMovement = {
            id: generateId('sm'),
            productId: ci.productId,
            type: 'sale',
            qtyChange: -ci.qty,
            qtyBefore,
            qtyAfter,
            referenceId: transactionId,
            createdAt: now,
          }

          await db.stockMovements.add(movement)
          await db.products.update(ci.productId, {
            stock: qtyAfter,
            updatedAt: now,
            syncStatus: 'local_only',
          })
        }

        return txn
      },
    )

    return result
  }

  private async generateInvoiceNo(isoNow: string): Promise<string> {
    const date = new Date(isoNow)
    const dateStr =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0')

    const todayStr = date.toDateString()
    const count = await db.transactions
      .filter((t) => new Date(t.date).toDateString() === todayStr)
      .count()

    const counter = (count + 1).toString().padStart(3, '0')
    return `INV-${dateStr}-${counter}`
  }
}
