import { useAppStore } from '@/store/appStore'

export default function Header() {
  const storeName = useAppStore((state) => state.storeName)
  const isOnline = useAppStore((state) => state.isOnline)

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-surface px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-neutral-500">Toko</p>
          <h1 className="truncate text-lg font-bold text-neutral-900">{storeName}</h1>
        </div>

        <div
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            isOnline ? 'bg-success-50 text-success' : 'bg-warning-50 text-warning'
          }`}
        >
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
    </header>
  )
}
