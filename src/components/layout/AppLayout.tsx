import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-neutral-900">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background">
        <Header />

        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
