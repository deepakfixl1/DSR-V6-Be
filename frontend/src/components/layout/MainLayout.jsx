import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import CommandPalette from './CommandPalette'
import Toast from '../ui/Toast'
import { useApp } from '../../context/AppContext'

export default function MainLayout() {
  const { toasts, dismissToast } = useApp()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-gray-200">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  )
}
