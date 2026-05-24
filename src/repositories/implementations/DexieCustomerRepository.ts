import type { ICustomerRepository } from '@/repositories/interfaces/ICustomerRepository'
import type { Customer } from '@/domain'
import { db } from '@/infra/db/dexie'

export class DexieCustomerRepository implements ICustomerRepository {
  async getAll(): Promise<Customer[]> {
    return db.customers.orderBy('nama').toArray()
  }

  async getById(id: string): Promise<Customer | undefined> {
    return db.customers.get(id)
  }

  async create(customer: Customer): Promise<void> {
    await db.customers.add(customer)
  }

  async update(customer: Customer): Promise<void> {
    await db.customers.put({ ...customer, updatedAt: new Date().toISOString() })
  }

  async delete(id: string): Promise<void> {
    await db.customers.delete(id)
  }

  async search(query: string): Promise<Customer[]> {
    if (!query.trim()) return this.getAll()
    const q = query.toLowerCase()
    const all = await db.customers.toArray()
    return all.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        c.telepon.toLowerCase().includes(q),
    )
  }
}
