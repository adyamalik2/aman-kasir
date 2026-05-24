import type { Customer } from '@/domain'

export interface ICustomerRepository {
  getAll(): Promise<Customer[]>
  getById(id: string): Promise<Customer | undefined>
  create(customer: Customer): Promise<void>
  update(customer: Customer): Promise<void>
  delete(id: string): Promise<void>
  search(query: string): Promise<Customer[]>
}
