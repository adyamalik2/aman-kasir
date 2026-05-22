const menuItems = [
  { label: 'Pengaturan', description: 'Profil toko dan preferensi aplikasi.' },
  { label: 'Backup', description: 'Status dan riwayat backup data.' },
  { label: 'Tentang', description: 'Informasi aplikasi AMAN Kasir.' },
] as const

export default function MoreScreen() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-neutral-500">Lainnya</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900">Menu Lainnya</h2>
      </div>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <div key={item.label} className="rounded-lg border border-neutral-200 bg-surface p-4">
            <p className="text-sm font-bold text-neutral-900">{item.label}</p>
            <p className="mt-1 text-sm leading-6 text-neutral-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
