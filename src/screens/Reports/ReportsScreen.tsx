import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SalesTab from './SalesTab'
import SummaryTab from './SummaryTab'
import TopProductsTab from './TopProductsTab'
import LowStockTab from './LowStockTab'

const TABS = [
  { id: 'sales', label: 'Penjualan' },
  { id: 'summary', label: 'Ringkasan' },
  { id: 'top', label: 'Terlaris' },
  { id: 'stock', label: 'Stok Menipis' },
] as const

type TabId = (typeof TABS)[number]['id']

const VALID_TAB_IDS = new Set<string>(TABS.map((t) => t.id))

function parseTabParam(param: string | null): TabId {
  if (param && VALID_TAB_IDS.has(param)) return param as TabId
  return 'sales'
}

export default function ReportsScreen() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>(() => parseTabParam(searchParams.get('tab')))

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-neutral-500">Laporan</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Laporan & Analisis</h2>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-surface text-primary shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && <SalesTab />}
      {activeTab === 'summary' && <SummaryTab />}
      {activeTab === 'top' && <TopProductsTab />}
      {activeTab === 'stock' && <LowStockTab />}
    </section>
  )
}
