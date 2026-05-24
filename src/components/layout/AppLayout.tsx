import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-bg text-neutral-900 dark:text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background dark:bg-dark-bg">
        <Header />

        <main
          data-main-content="true"
          className="flex-1 px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
        >
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
