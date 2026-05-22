import { useAppStore } from '@/store/appStore'

export default function DashboardScreen() {
  const storeName = useAppStore((state) => state.storeName)
  const isOnline = useAppStore((state) => state.isOnline)

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-neutral-500">Beranda</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">{storeName}</h2>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-surface p-4">
        <p className="text-sm font-semibold text-neutral-900">Status operasional</p>
        <p className="mt-1 text-sm text-neutral-500">
          Aplikasi siap dipakai. Koneksi saat ini {isOnline ? 'online' : 'offline'}.
        </p>
      </div>
    </section>
  )
}
