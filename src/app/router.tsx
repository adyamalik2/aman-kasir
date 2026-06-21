import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'

// ── Critical path — eager (selalu dibutuhkan saat pertama buka) ──────────────
import DashboardScreen from '@/screens/Dashboard/DashboardScreen'
import POSScreen from '@/screens/POS/POSScreen'

// ── Lazy — di-load hanya saat pertama kali halaman dibuka ────────────────────
const MoreScreen = lazy(() => import('@/screens/More/MoreScreen'))
const AboutScreen = lazy(() => import('@/screens/About/AboutScreen'))
const BackupScreen = lazy(() => import('@/screens/Backup/BackupScreen'))
const SettingsScreen = lazy(() => import('@/screens/Settings/SettingsScreen'))
const PrinterStrikScreen = lazy(() => import('@/screens/Settings/PrinterStrikScreen'))
const CustomersScreen = lazy(() => import('@/screens/Customers/CustomersScreen'))
const CustomerDetailScreen = lazy(() => import('@/screens/Customers/CustomerDetailScreen'))
const ProductsScreen = lazy(() => import('@/screens/Products/ProductsScreen'))
const ReportsScreen = lazy(() => import('@/screens/Reports/ReportsScreen'))
const RingkasanScreen = lazy(() => import('@/screens/Reports/RingkasanScreen'))
const TransaksiScreen = lazy(() => import('@/screens/Reports/TransaksiScreen'))
const TerlarisScreen = lazy(() => import('@/screens/Reports/TerlarisScreen'))
const StokMenipisScreen = lazy(() => import('@/screens/Reports/StokMenipisScreen'))
const PiutangScreen = lazy(() => import('@/screens/Reports/PiutangScreen'))
const LaboranLabaScreen = lazy(() => import('@/screens/Reports/LaboranLabaScreen'))
const StokHistoriScreen = lazy(() => import('@/screens/Reports/StokHistoriScreen'))

// ── Loading spinner ditampilkan di area konten saja (BottomNav tetap tampil) ─
function PageLoader() {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-primary" />
    </div>
  )
}

/** Bungkus lazy screen dengan Suspense boundary lokal */
function L({ Page }: { Page: React.ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/beranda" replace />} />

        {/* Eager — no Suspense needed */}
        <Route path="/beranda" element={<DashboardScreen />} />
        <Route path="/kasir" element={<POSScreen />} />

        {/* Lazy */}
        <Route path="/produk" element={<L Page={ProductsScreen} />} />

        {/* Laporan & sub-halaman */}
        <Route path="/laporan" element={<L Page={ReportsScreen} />} />
        <Route path="/laporan/ringkasan" element={<L Page={RingkasanScreen} />} />
        <Route path="/laporan/transaksi" element={<L Page={TransaksiScreen} />} />
        <Route path="/laporan/terlaris" element={<L Page={TerlarisScreen} />} />
        <Route path="/laporan/stok-menipis" element={<L Page={StokMenipisScreen} />} />
        <Route path="/laporan/piutang" element={<L Page={PiutangScreen} />} />
        <Route path="/laporan/laba" element={<L Page={LaboranLabaScreen} />} />
        <Route path="/laporan/histori-stok" element={<L Page={StokHistoriScreen} />} />

        <Route path="/lainnya" element={<L Page={MoreScreen} />} />
        <Route path="/lainnya/backup" element={<L Page={BackupScreen} />} />
        <Route path="/lainnya/pengaturan" element={<L Page={SettingsScreen} />} />
        <Route path="/lainnya/printer-struk" element={<L Page={PrinterStrikScreen} />} />
        <Route path="/lainnya/pelanggan" element={<L Page={CustomersScreen} />} />
        <Route path="/lainnya/pelanggan/:id" element={<L Page={CustomerDetailScreen} />} />
        <Route path="/lainnya/tentang" element={<L Page={AboutScreen} />} />
        <Route path="*" element={<Navigate to="/beranda" replace />} />
      </Route>
    </Routes>
  )
}
