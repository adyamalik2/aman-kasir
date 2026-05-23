import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardScreen from '@/screens/Dashboard/DashboardScreen'
import MoreScreen from '@/screens/More/MoreScreen'
import BackupScreen from '@/screens/Backup/BackupScreen'
import POSScreen from '@/screens/POS/POSScreen'
import ProductsScreen from '@/screens/Products/ProductsScreen'
import ReportsScreen from '@/screens/Reports/ReportsScreen'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/beranda" replace />} />
        <Route path="/beranda" element={<DashboardScreen />} />
        <Route path="/kasir" element={<POSScreen />} />
        <Route path="/produk" element={<ProductsScreen />} />
        <Route path="/laporan" element={<ReportsScreen />} />
        <Route path="/lainnya" element={<MoreScreen />} />
        <Route path="/lainnya/backup" element={<BackupScreen />} />
        <Route path="*" element={<Navigate to="/beranda" replace />} />
      </Route>
    </Routes>
  )
}
