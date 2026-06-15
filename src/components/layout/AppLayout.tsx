import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="relative min-h-screen bg-background text-neutral-900 dark:bg-dark-bg dark:text-white">
      {/* Dekorasi gradien halus di atas — memberi kedalaman tanpa membebani performa */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-64 opacity-[0.07] dark:opacity-[0.16]"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, #6366f1 0%, #7c3aed 40%, transparent 75%)',
        }}
      />

      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-2xl flex-col">
        <Header />

        <main data-main-content="true" className="flex-1 px-4 pb-32 pt-4 sm:px-6 sm:pt-6">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
