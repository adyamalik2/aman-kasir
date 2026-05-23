import { create } from 'zustand'
import type { Product, Category } from '@/domain'
import { DexieProductRepository } from '@/repositories/implementations/DexieProductRepository'
import { GetAllProductsUseCase } from '@/usecases/product/GetAllProductsUseCase'
import { CreateProductUseCase } from '@/usecases/product/CreateProductUseCase'
import type { CreateProductInput } from '@/usecases/product/CreateProductUseCase'
import { UpdateProductUseCase } from '@/usecases/product/UpdateProductUseCase'
import type { UpdateProductInput } from '@/usecases/product/UpdateProductUseCase'
import { ToggleProductActiveUseCase } from '@/usecases/product/ToggleProductActiveUseCase'
import { db } from '@/infra/db/dexie'

const repo = new DexieProductRepository()

interface ProductState {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  error: string | null

  loadProducts(): Promise<void>
  loadCategories(): Promise<void>
  addProduct(input: CreateProductInput): Promise<Product>
  updateProduct(id: string, input: UpdateProductInput): Promise<Product>
  toggleActive(id: string): Promise<void>
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,

  async loadProducts() {
    set({ isLoading: true, error: null })
    try {
      const useCase = new GetAllProductsUseCase(repo)
      const products = await useCase.execute()
      set({ products, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat produk.'
      set({ error: message, isLoading: false })
    }
  },

  async loadCategories() {
    try {
      const categories = await db.categories.filter((c) => c.isActive).toArray()
      set({ categories })
    } catch (err) {
      // Non-critical: categories load failure doesn't block UI
      console.error('[productStore] Gagal memuat kategori:', err)
    }
  },

  async addProduct(input) {
    const useCase = new CreateProductUseCase(repo)
    const product = await useCase.execute(input)
    set((state) => ({ products: [product, ...state.products] }))
    return product
  },

  async updateProduct(id, input) {
    const useCase = new UpdateProductUseCase(repo)
    const updated = await useCase.execute(id, input)
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
    }))
    return updated
  },

  async toggleActive(id) {
    const useCase = new ToggleProductActiveUseCase(repo)
    const updated = await useCase.execute(id)
    if (!updated.isActive) {
      // Product deactivated → remove from active list
      set((state) => ({ products: state.products.filter((p) => p.id !== id) }))
    } else {
      // Product re-activated → add/update in list
      set((state) => ({
        products: state.products.some((p) => p.id === id)
          ? state.products.map((p) => (p.id === id ? updated : p))
          : [updated, ...state.products],
      }))
    }
  },
}))
