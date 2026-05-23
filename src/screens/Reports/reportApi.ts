import { DexieTransactionRepository } from '@/repositories/implementations/DexieTransactionRepository'
import { DexieProductRepository } from '@/repositories/implementations/DexieProductRepository'
import { DexieCategoryRepository } from '@/repositories/implementations/DexieCategoryRepository'
import { GetSalesReportUseCase } from '@/usecases/reports/GetSalesReportUseCase'
import { GetTopProductsUseCase } from '@/usecases/reports/GetTopProductsUseCase'
import { GetLowStockUseCase } from '@/usecases/reports/GetLowStockUseCase'
import { GetProfitReportUseCase } from '@/usecases/reports/GetProfitReportUseCase'

const transactionRepo = new DexieTransactionRepository()
const productRepo = new DexieProductRepository()
const categoryRepo = new DexieCategoryRepository()

export const getSalesReport = new GetSalesReportUseCase(transactionRepo)
export const getTopProducts = new GetTopProductsUseCase(transactionRepo)
export const getLowStock = new GetLowStockUseCase(productRepo)
export const getProfitReport = new GetProfitReportUseCase(
  transactionRepo,
  productRepo,
  categoryRepo,
)

export { transactionRepo }
