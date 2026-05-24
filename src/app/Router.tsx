import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardScreen from '@/screens/Dashboard/DashboardScreen'
import MoreScreen from '@/screens/More/MoreScreen'
import BackupScreen from '@/screens/Backup/BackupScreen'
import SettingsScreen from '@/screens/Settings/SettingsScreen'
import PrinterStrikScreen from '@/screens/Settings/PrinterStrikScreen'
import POSScreen from '@/screens/POS/POSScreen'
import ProductsScreen from '@/screens/Products/ProductsScreen'
import ReportsScreen from '@/screens/Reports/ReportsScreen'
import RingkasanScreen from '@/screens/Reports/RingkasanScreen'
import TransaksiScreen from '@/screens/Reports/TransaksiScreen'
import TerlarisScreen from '@/screens/Reports/TerlarisScreen'
import StokMenipisScreen from '@/screens/Reports/StokMenipisScreen'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/beranda" replace />} />
        <Route path="/beranda" element={<DashboardScreen />} />
        <Route path="/kasir" element={<POSScreen />} />
        <Route path="/produk" element={<ProductsScreen />} />

        {/* Laporan & sub-halaman */}
        <Route path="/laporan" element={<ReportsScreen />} />
        <Route path="/laporan/ringkasan" element={<RingkasanScreen />} />
        <Route path="/laporan/transaksi" element={<TransaksiScreen />} />
        <Route path="/laporan/terlaris" element={<TerlarisScreen />} />
        <Route path="/laporan/stok-menipis" element={<StokMenipisScreen />} />

        <Route path="/lainnya" element={<MoreScreen />} />
        <Route path="/lainnya/backup" element={<BackupScreen />} />
        <Route path="/lainnya/pengaturan" element={<SettingsScreen />} />
        <Route path="/lainnya/printer-struk" element={<PrinterStrikScreen />} />
        <Route path="*" element={<Navigate to="/beranda" replace />} />
      </Route>
    </Routes>
  )
}
