import { create } from 'zustand'
import type { Transaction, TransactionItem, PaymentMethod } from '@/domain'
import { DexieTransactionRepository } from '@/repositories/implementations/DexieTransactionRepository'
import { CreateTransactionUseCase } from '@/usecases/transaction/CreateTransactionUseCase'
import type { CartItemInput } from '@/usecases/transaction/CreateTransactionUseCase'
import { GetTodaySummaryUseCase } from '@/usecases/transaction/GetTodaySummaryUseCase'
import type { TodaySummary } from '@/usecases/transaction/GetTodaySummaryUseCase'

const repo = new DexieTransactionRepository()

interface TransactionState {
  transactions: Transaction[]
  transactionItems: Record<string, TransactionItem[]>
  todaySummary: TodaySummary
  isLoading: boolean
  error: string | null

  loadTransactions(): Promise<void>
  loadTransactionItems(transactionId: string): Promise<TransactionItem[]>
  createTransaction(
    cartItems: CartItemInput[],
    subtotal: number,
    total: number,
    paidAmount: number,
    paymentMethod: PaymentMethod,
    notes?: string,
  ): Promise<Transaction>
  loadTodaySummary(): Promise<void>
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  transactionItems: {},
  todaySummary: { omzet: 0, transactionCount: 0 },
  isLoading: false,
  error: null,

  async loadTransactions() {
    set({ isLoading: true, error: null })
    try {
      const transactions = await repo.getAll()
      set({ transactions, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat transaksi.'
      set({ error: message, isLoading: false })
    }
  },

  async loadTransactionItems(transactionId) {
    // Return cached if available
    const cached = get().transactionItems[transactionId]
    if (cached) return cached

    const items = await repo.getItemsByTransactionId(transactionId)
    set((state) => ({
      transactionItems: { ...state.transactionItems, [transactionId]: items },
    }))
    return items
  },

  async createTransaction(cartItems, subtotal, total, paidAmount, paymentMethod, notes) {
    const useCase = new CreateTransactionUseCase(repo)
    const transaction = await useCase.execute({
      cartItems,
      subtotal,
      total,
      paidAmount,
      paymentMethod,
      notes,
    })

    // Optimistic update: prepend to list + update today's summary
    set((state) => ({
      transactions: [transaction, ...state.transactions],
      todaySummary: {
        omzet: state.todaySummary.omzet + total,
        transactionCount: state.todaySummary.transactionCount + 1,
      },
    }))

    return transaction
  },

  async loadTodaySummary() {
    try {
      const useCase = new GetTodaySummaryUseCase()
      const summary = await useCase.execute()
      set({ todaySummary: summary })
    } catch (err) {
      console.error('[transactionStore] Gagal memuat summary hari ini:', err)
    }
  },
}))
