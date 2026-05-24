import Providers from './Providers'
import AppRouter from './router'
import UpdateBanner from '@/components/UpdateBanner'

export default function App() {
  return (
    <Providers>
      <AppRouter />
      <UpdateBanner />
    </Providers>
  )
}
