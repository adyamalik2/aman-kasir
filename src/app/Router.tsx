import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardScreen from '@/screens/Dashboard/DashboardScreen'
import MoreScreen from '@/screens/More/MoreScreen'
import AboutScreen from '@/screens/About/AboutScreen'
import BackupScreen from '@/screens/Backup/BackupScreen'
import SettingsScreen from '@/screens/Settings/SettingsScreen'
import PrinterStrikScreen from '@/screens/Settings/PrinterStrikScreen'
import CustomersScreen from '@/screens/Customers/CustomersScreen'
import CustomerDetailScreen from '@/screens/Customers/CustomerDetailScreen'
import POSScreen from '@/screens/POS/POSScreen'
import ProductsScreen from '@/screens/Products/ProductsScreen'
import ReportsScreen from '@/screens/Reports/ReportsScreen'
import RingkasanScreen from '@/screens/Reports/RingkasanScreen'
import TransaksiScreen from '@/screens/Reports/TransaksiScreen'
import TerlarisScreen from '@/screens/Reports/TerlarisScreen'
import StokMenipisScreen from '@/screens/Reports/StokMenipisScreen'
import PiutangScreen from '@/screens/Reports/PiutangScreen'
import LaboranLabaScreen from '@/screens/Reports/LaboranLabaScreen'
import StokHistoriScreen from '@/screens/Reports/StokHistoriScreen'

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
        <Route path="/laporan/piutang" element={<PiutangScreen />} />
        <Route path="/laporan/laba" element={<LaboranLabaScreen />} />
        <Route path="/laporan/histori-stok" element={<StokHistoriScreen />} />

        <Route path="/lainnya" element={<MoreScreen />} />
        <Route path="/lainnya/backup" element={<BackupScreen />} />
        <Route path="/lainnya/pengaturan" element={<SettingsScreen />} />
        <Route path="/lainnya/printer-struk" element={<PrinterStrikScreen />} />
        <Route path="/lainnya/pelanggan" element={<CustomersScreen />} />
        <Route path="/lainnya/pelanggan/:id" element={<CustomerDetailScreen />} />
        <Route path="/lainnya/tentang" element={<AboutScreen />} />
        <Route path="*" element={<Navigate to="/beranda" replace />} />
      </Route>
    </Routes>
  )
}
