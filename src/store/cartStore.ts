import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/domain'
import { generateId } from '@/lib/id-generator'

/**
 * Store keranjang kasir — mendukung BANYAK keranjang sekaligus.
 *
 * Tujuan:
 *  - Keranjang tidak hilang saat pindah menu / refresh (disimpan ke localStorage).
 *  - Bisa membuka beberapa keranjang sekaligus (mis. 2 pelanggan antri),
 *    lalu berpindah-pindah tanpa kehilangan isi keranjang yang belum selesai.
 */

export interface CartItem {
  productId: string
  productName: string
  sku?: string
  price: number
  costPrice: number
  qty: number
  /** Nilai mentah input qty (string) agar bisa dikosongkan sementara saat diketik. */
  qtyInput: string
  /** Stok tersedia saat item ditambahkan — untuk validasi batas qty. */
  stock: number
}

export interface Cart {
  id: string
  label: string
  items: CartItem[]
  createdAt: string
}

export interface AddItemResult {
  ok: boolean
  message?: string
}

function normalizeQtyInput(value: string, fallback = 1): number {
  const parsed = Math.floor(Number(value))
  if (Number.isFinite(parsed) && parsed >= 1) return parsed
  return Math.max(1, fallback)
}

/** Bersihkan qtyInput menjadi qty valid (>=1, tidak melebihi stok). */
export function normalizeCartItem(item: CartItem): CartItem {
  const raw = normalizeQtyInput(item.qtyInput, item.qty)
  const qty = item.stock > 0 ? Math.min(raw, item.stock) : raw
  return { ...item, qty, qtyInput: String(qty) }
}

function makeCart(label: string): Cart {
  return { id: generateId('cart'), label, items: [], createdAt: new Date().toISOString() }
}

const FIRST_CART = makeCart('Keranjang 1')

interface CartState {
  carts: Cart[]
  activeCartId: string
  /** Penghitung urut untuk penamaan default keranjang baru. */
  cartSeq: number

  setActiveCart(id: string): void
  addCart(): void
  removeCart(id: string): void
  renameCart(id: string, label: string): void

  addItem(product: Product): AddItemResult
  updateQty(productId: string, delta: number): void
  setQtyInput(productId: string, value: string): void
  commitQtyInput(productId: string): void
  commitAllQtyInputs(): void
  removeItem(productId: string): void
  clearActiveCart(): void
  /** Dipanggil setelah checkout berhasil: hapus keranjang aktif bila ada keranjang lain, atau kosongkan bila tinggal satu. */
  completeActiveCart(): void
}

/** Helper immutable: ubah items pada keranjang aktif saja. */
function updateActiveItems(
  state: CartState,
  updater: (items: CartItem[]) => CartItem[],
): Pick<CartState, 'carts'> {
  return {
    carts: state.carts.map((c) =>
      c.id === state.activeCartId ? { ...c, items: updater(c.items) } : c,
    ),
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: [FIRST_CART],
      activeCartId: FIRST_CART.id,
      cartSeq: 1,

      setActiveCart(id) {
        if (get().carts.some((c) => c.id === id)) set({ activeCartId: id })
      },

      addCart() {
        set((state) => {
          const seq = state.cartSeq + 1
          const cart = makeCart(`Keranjang ${seq}`)
          return { carts: [...state.carts, cart], activeCartId: cart.id, cartSeq: seq }
        })
      },

      removeCart(id) {
        set((state) => {
          // Selalu sisakan minimal satu keranjang.
          if (state.carts.length <= 1) {
            return { carts: state.carts.map((c) => (c.id === id ? { ...c, items: [] } : c)) }
          }
          const remaining = state.carts.filter((c) => c.id !== id)
          const activeCartId =
            state.activeCartId === id ? remaining[0].id : state.activeCartId
          return { carts: remaining, activeCartId }
        })
      },

      renameCart(id, label) {
        const trimmed = label.trim()
        if (!trimmed) return
        set((state) => ({
          carts: state.carts.map((c) => (c.id === id ? { ...c, label: trimmed } : c)),
        }))
      },

      addItem(product) {
        if (product.stock <= 0) {
          return { ok: false, message: `Stok ${product.name} habis` }
        }
        const state = get()
        const active = state.carts.find((c) => c.id === state.activeCartId)
        if (!active) return { ok: false }
        const existing = active.items.find((i) => i.productId === product.id)
        if (existing && existing.qty >= product.stock) {
          return {
            ok: false,
            message: `Stok ${product.name} hanya ${product.stock} ${product.unit || 'pcs'}`,
          }
        }

        set((s) =>
          updateActiveItems(s, (items) => {
            const ex = items.find((i) => i.productId === product.id)
            if (ex) {
              return items.map((i) => {
                if (i.productId !== product.id) return i
                const qty = Math.min(i.qty + 1, product.stock)
                return { ...i, qty, qtyInput: String(qty), stock: product.stock }
              })
            }
            return [
              ...items,
              {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                price: product.sellPrice,
                costPrice: product.costPrice,
                qty: 1,
                qtyInput: '1',
                stock: product.stock,
              },
            ]
          }),
        )
        return { ok: true, message: `${product.name} ditambahkan ke keranjang.` }
      },

      updateQty(productId, delta) {
        set((s) =>
          updateActiveItems(s, (items) =>
            items.map((item) => {
              if (item.productId !== productId) return item
              const qty = Math.max(1, Math.min(item.qty + delta, item.stock))
              return { ...item, qty, qtyInput: String(qty) }
            }),
          ),
        )
      },

      setQtyInput(productId, value) {
        set((s) =>
          updateActiveItems(s, (items) =>
            items.map((item) => {
              if (item.productId !== productId) return item
              const parsed = Math.floor(Number(value))
              if (value !== '' && Number.isFinite(parsed) && parsed >= 1) {
                const qty = item.stock > 0 ? Math.min(parsed, item.stock) : parsed
                return { ...item, qty, qtyInput: value }
              }
              return { ...item, qtyInput: value }
            }),
          ),
        )
      },

      commitQtyInput(productId) {
        set((s) =>
          updateActiveItems(s, (items) =>
            items.map((item) => (item.productId === productId ? normalizeCartItem(item) : item)),
          ),
        )
      },

      commitAllQtyInputs() {
        set((s) => updateActiveItems(s, (items) => items.map(normalizeCartItem)))
      },

      removeItem(productId) {
        set((s) => updateActiveItems(s, (items) => items.filter((i) => i.productId !== productId)))
      },

      clearActiveCart() {
        set((s) => updateActiveItems(s, () => []))
      },

      completeActiveCart() {
        set((state) => {
          if (state.carts.length > 1) {
            const remaining = state.carts.filter((c) => c.id !== state.activeCartId)
            return { carts: remaining, activeCartId: remaining[0].id }
          }
          return updateActiveItems(state, () => [])
        })
      },
    }),
    {
      name: 'aman-kasir-carts',
      version: 1,
      // Pulihkan state agar selalu ada minimal satu keranjang & activeCartId valid.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!state.carts || state.carts.length === 0) {
          const cart = makeCart('Keranjang 1')
          state.carts = [cart]
          state.activeCartId = cart.id
          state.cartSeq = 1
        } else if (!state.carts.some((c) => c.id === state.activeCartId)) {
          state.activeCartId = state.carts[0].id
        }
      },
    },
  ),
)
